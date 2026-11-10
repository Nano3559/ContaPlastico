"""
Dataset Loader & Preprocessor para PlastControl IA Predictiva.
Gestiona series temporales con valores positivos (ventas, pedidos) y negativos (devoluciones, notas de crédito, cancelaciones).
Utiliza Polars y Numpy para máximo rendimiento.
"""

import os
import json
import math
import numpy as np
import polars as pl
import torch
from torch.utils.data import Dataset, DataLoader


def symlog(x):
    """
    Transformación logarítmica simétrica continua para manejar números positivos, negativos y ceros.
    symlog(x) = sign(x) * log(1 + |x|)
    """
    return np.sign(x) * np.log1p(np.abs(x))


def inv_symlog(y):
    """
    Inversa de la transformación logarítmica simétrica con protección contra overflow:
    x = sign(y) * (exp(|y|) - 1)
    """
    safe_y = np.clip(np.nan_to_num(y, nan=0.0, posinf=25.0, neginf=-25.0), -25.0, 25.0)
    return np.sign(safe_y) * np.expm1(np.abs(safe_y))


class SalesDemandDataset(Dataset):
    def __init__(self, cat_features, num_features, targets):
        self.cat_features = torch.tensor(cat_features, dtype=torch.long)
        self.num_features = torch.tensor(num_features, dtype=torch.float32)
        self.targets = torch.tensor(targets, dtype=torch.float32)

    def __len__(self):
        return len(self.cat_features)

    def __getitem__(self, idx):
        return self.cat_features[idx], self.num_features[idx], self.targets[idx]


class PlastDataPipeline:
    def __init__(self, csv_path=None):
        if csv_path is None:
            # Buscar archivo oficial primero, luego el de 2 años
            oficial = os.path.join("Dataset_IA_Predictiva", "demand_sales_history_Oficial.csv")
            two_years = "demand_sales_history_2years.csv"
            if os.path.exists(oficial):
                self.csv_path = oficial
            elif os.path.exists(two_years):
                self.csv_path = two_years
            else:
                raise FileNotFoundError("No se encontró ningún dataset de demanda en el repositorio.")
        else:
            self.csv_path = csv_path

        self.cat_columns = [
            "Codigo_Producto",
            "Proceso_Transformacion",
            "Sector_Cliente",
            "Region_Cliente",
            "Estacionalidad",
            "Factor_Impacto",
            "Estado_Orden",
        ]
        
        self.num_input_columns = [
            "Precio_Unitario_USD",
            "Peso_Unitario_Kg",
            "Descuento_Pct",
            "Unidades_Solicitadas",
            "Monto_Potencial_USD",
        ]

        # Targets principales (Demanda neta unidades, peso plástico en kg, e impacto comercial)
        self.target_columns = [
            "Cantidad_Unidades",
            "Total_Peso_Plastico_Kg",
            "Impacto_Comercial_Estimado_USD",
        ]

        self.vocabularies = {}
        self.scalers = {}

    def load_and_preprocess(self):
        print(f"[Pipeline] Cargando dataset desde: {self.csv_path}")
        df = pl.read_csv(self.csv_path, ignore_errors=True)
        print(f"[Pipeline] Filas cargadas: {len(df)}, Columnas: {len(df.columns)}")

        # Ordenar cronológicamente para evitar data leakage
        df = df.sort("Fecha")

        # Asegurar tipos y rellenar nulos si los hubiera
        for col in self.num_input_columns + self.target_columns:
            if col in df.columns:
                df = df.with_columns(pl.col(col).cast(pl.Float64).fill_null(0.0))

        for col in self.cat_columns:
            if col in df.columns:
                df = df.with_columns(pl.col(col).cast(pl.Utf8).fill_null("DESCONOCIDO"))

        # Extraer fechas y construir características cíclicas temporales
        fechas = df["Fecha"].str.to_date("%Y-%m-%d")
        mes = fechas.dt.month().to_numpy()
        dia_sem = fechas.dt.weekday().to_numpy()  # 1 (Lunes) a 7 (Domingo)
        ano = fechas.dt.year().to_numpy()

        # Encodings cíclicos sinusoidales
        sin_mes = np.sin(2 * np.pi * mes / 12.0)
        cos_mes = np.cos(2 * np.pi * mes / 12.0)
        sin_dia = np.sin(2 * np.pi * dia_sem / 7.0)
        cos_dia = np.cos(2 * np.pi * dia_sem / 7.0)
        norm_ano = (ano - 2024.0) / 2.0  # normalizado entre 0 y 1

        # Construir vocabularios para variables categóricas
        cat_encoded_list = []
        for col in self.cat_columns:
            unique_vals = sorted(list(set(df[col].to_list())))
            vocab = {val: idx for idx, val in enumerate(unique_vals)}
            self.vocabularies[col] = vocab
            encoded_col = np.array([vocab.get(val, 0) for val in df[col].to_list()], dtype=np.int64)
            cat_encoded_list.append(encoded_col)

        cat_matrix = np.column_stack(cat_encoded_list)

        # Construir matriz de características numéricas con symlog y estandarización
        num_inputs_list = []
        for col in self.num_input_columns:
            vals = df[col].to_numpy()
            trans_vals = symlog(vals)
            mean = float(np.mean(trans_vals))
            std = float(np.std(trans_vals)) + 1e-6
            self.scalers[f"input_{col}"] = {"mean": mean, "std": std}
            norm_vals = (trans_vals - mean) / std
            num_inputs_list.append(norm_vals)

        # Añadir las features temporales
        num_inputs_list.extend([sin_mes, cos_mes, sin_dia, cos_dia, norm_ano])
        num_matrix = np.column_stack(num_inputs_list)

        # Construir matriz de targets (valores positivos y negativos con symlog)
        target_list = []
        for col in self.target_columns:
            t_vals = df[col].to_numpy()
            trans_t = symlog(t_vals)
            t_mean = float(np.mean(trans_t))
            t_std = float(np.std(trans_t)) + 1e-6
            self.scalers[f"target_{col}"] = {"mean": t_mean, "std": t_std}
            norm_t = (trans_t - t_mean) / t_std
            target_list.append(norm_t)

        target_matrix = np.column_stack(target_list)

        # Partición cronológica estricta: 70% Train, 15% Val, 15% Test
        n = len(df)
        n_train = int(n * 0.70)
        n_val = int(n * 0.15)

        train_indices = range(0, n_train)
        val_indices = range(n_train, n_train + n_val)
        test_indices = range(n_train + n_val, n)

        train_ds = SalesDemandDataset(
            cat_matrix[train_indices], num_matrix[train_indices], target_matrix[train_indices]
        )
        val_ds = SalesDemandDataset(
            cat_matrix[val_indices], num_matrix[val_indices], target_matrix[val_indices]
        )
        test_ds = SalesDemandDataset(
            cat_matrix[test_indices], num_matrix[test_indices], target_matrix[test_indices]
        )

        metadata = {
            "csv_path": self.csv_path,
            "total_samples": n,
            "train_samples": len(train_ds),
            "val_samples": len(val_ds),
            "test_samples": len(test_ds),
            "cat_columns": self.cat_columns,
            "num_features_dim": num_matrix.shape[1],
            "target_columns": self.target_columns,
            "vocabularies": self.vocabularies,
            "vocab_sizes": {col: len(v) for col, v in self.vocabularies.items()},
            "scalers": self.scalers,
        }

        # Guardar metadatos y normalizadores
        os.makedirs("ai_demand_engine/checkpoints", exist_ok=True)
        with open("ai_demand_engine/checkpoints/metadata.json", "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)

        print(f"[Pipeline] Metadatos guardados. Train: {len(train_ds)}, Val: {len(val_ds)}, Test: {len(test_ds)}")
        return train_ds, val_ds, test_ds, metadata

    def get_dataloaders(self, batch_size=64):
        train_ds, val_ds, test_ds, meta = self.load_and_preprocess()

        # Configurar DataLoaders optimizados para GPU con pin_memory
        train_loader = DataLoader(
            train_ds, batch_size=batch_size, shuffle=True, pin_memory=True, drop_last=False
        )
        val_loader = DataLoader(
            val_ds, batch_size=batch_size, shuffle=False, pin_memory=True, drop_last=False
        )
        test_loader = DataLoader(
            test_ds, batch_size=batch_size, shuffle=False, pin_memory=True, drop_last=False
        )

        return train_loader, val_loader, test_loader, meta
