"""
Módulo de Inferencia en Tiempo Real acelerado por GPU NVIDIA.
Predice demanda neta, requerimiento estequiométrico de resinas (MRP)
y balance de impacto comercial (positivo y negativo).
"""

import os
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import json
import math
import argparse
import numpy as np
import torch

from dataset_loader import symlog, inv_symlog
from model import PlastDemandNet


# Catálogo estequiométrico de polímeros y factores de merma de planta
POLYMER_CATALOG = {
    "PREF-PET-28": {"resin": "PET Virgen Grado Botella", "silo": "Tolva Secado T-01", "scrap": 0.021, "capacity": 30000},
    "TAPA-HDPE-28": {"resin": "HDPE Inyección 5502", "silo": "Silo A-01 HDPE", "scrap": 0.035, "capacity": 25000},
    "BOTELLA-1L-HDPE": {"resin": "HDPE Soplado 5502", "silo": "Silo A-01 HDPE", "scrap": 0.040, "capacity": 25000},
    "BIDON-5L-HDPE": {"resin": "HDPE Alto Peso Molecular", "silo": "Silo A-02 HDPE", "scrap": 0.045, "capacity": 35000},
    "BOLSA-HDPE-40X60": {"resin": "HDPE Película Tubular", "silo": "Silo A-01 HDPE", "scrap": 0.038, "capacity": 25000},
    "TAPA-FLIP-PP": {"resin": "PP Copolímero Inyección", "silo": "Silo B-02 PP", "scrap": 0.028, "capacity": 28000},
    "ENVASE-PP-250ML": {"resin": "PP Clarificado Soplado", "silo": "Silo B-02 PP", "scrap": 0.032, "capacity": 28000},
    "BANDEJA-PP-1L": {"resin": "PP Homopolímero Lámina", "silo": "Silo B-02 PP", "scrap": 0.050, "capacity": 28000},
    "PELICULA-LDPE-TERMO": {"resin": "LDPE Termoencogible 2004", "silo": "Rack Silo C-01 LDPE", "scrap": 0.042, "capacity": 20000},
}


class PlastDemandPredictor:
    def __init__(self, checkpoint_path="ai_demand_engine/checkpoints/best_demand_gpu_model.pt", device=None):
        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = torch.device(device)

        if not os.path.exists(checkpoint_path):
            raise FileNotFoundError(f"Checkpoint no encontrado en {checkpoint_path}. Entrena primero con train_gpu.py.")

        checkpoint = torch.load(checkpoint_path, map_location=self.device, weights_only=False)
        self.meta = checkpoint["metadata"]
        self.scalers = self.meta["scalers"]
        self.vocabs = self.meta["vocabularies"]

        self.model = PlastDemandNet(
            vocab_sizes=self.meta["vocab_sizes"],
            num_features_dim=self.meta["num_features_dim"],
            hidden_dim=128,
            num_layers=3,
            num_targets=3,
            dropout=0.0,
        ).to(self.device)

        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.model.eval()

        print(f"[Predictor] Modelo cargado en {self.device} ({getattr(torch.cuda, 'get_device_name', lambda x: '')(0) if self.device.type == 'cuda' else 'CPU'})")

    def predict(
        self,
        product_code: str = "PREF-PET-28",
        process: str = "INYECCION",
        sector: str = "Bebidas",
        region: str = "Occidente",
        season: str = "ALTA",
        impact_factor: str = "DEMANDA_BASE",
        order_status: str = "COMPLETADA",
        requested_units: float = 100000.0,
        unit_price: float = 0.045,
        unit_weight_kg: float = 0.024,
        discount_pct: float = 0.0,
        year: int = 2026,
        month: int = 11,
        day_of_week: int = 3,
    ):
        """
        Ejecuta inferencia individual con la red neuronal en GPU.
        """
        # 1. Encodings categóricos
        cat_indices = [
            self.vocabs["Codigo_Producto"].get(product_code, 0),
            self.vocabs["Proceso_Transformacion"].get(process, 0),
            self.vocabs["Sector_Cliente"].get(sector, 0),
            self.vocabs["Region_Cliente"].get(region, 0),
            self.vocabs["Estacionalidad"].get(season, 0),
            self.vocabs["Factor_Impacto"].get(impact_factor, 0),
            self.vocabs["Estado_Orden"].get(order_status, 0),
        ]
        cat_tensor = torch.tensor([cat_indices], dtype=torch.long, device=self.device)

        # 2. Features numéricas normalizadas con symlog
        potential_revenue = requested_units * unit_price
        num_raw = [
            unit_price,
            unit_weight_kg,
            discount_pct,
            requested_units,
            potential_revenue,
        ]

        norm_num = []
        for val, col in zip(num_raw, self.meta["cat_columns"][:5]):
            # Obtener normalizador
            col_name = ["Precio_Unitario_USD", "Peso_Unitario_Kg", "Descuento_Pct", "Unidades_Solicitadas", "Monto_Potencial_USD"][len(norm_num)]
            s = self.scalers[f"input_{col_name}"]
            t_val = symlog(val)
            norm_num.append((t_val - s["mean"]) / s["std"])

        # Features temporales
        sin_mes = math.sin(2 * math.pi * month / 12.0)
        cos_mes = math.cos(2 * math.pi * month / 12.0)
        sin_dia = math.sin(2 * math.pi * day_of_week / 7.0)
        cos_dia = math.cos(2 * math.pi * day_of_week / 7.0)
        norm_ano = (year - 2024.0) / 2.0
        norm_num.extend([sin_mes, cos_mes, sin_dia, cos_dia, norm_ano])

        num_tensor = torch.tensor([norm_num], dtype=torch.float32, device=self.device)

        # 3. Inferencia con GPU
        with torch.no_grad():
            preds = self.model(cat_tensor, num_tensor)

        preds_np = preds.cpu().numpy()[0]

        # 4. Des-normalizar targets
        unorm_targets = []
        for i, col_name in enumerate(self.meta["target_columns"]):
            s = self.scalers[f"target_{col_name}"]
            raw_target = inv_symlog((preds_np[i] * s["std"]) + s["mean"])
            unorm_targets.append(float(raw_target))

        pred_units = unorm_targets[0]
        pred_weight_kg = unorm_targets[1]
        pred_impact_usd = unorm_targets[2]

        # 5. Cálculo estequiométrico de resinas virgen y merma de planta
        poly_info = POLYMER_CATALOG.get(
            product_code,
            {"resin": "Resina Polimérica Estándar", "silo": "Silo General", "scrap": 0.035, "capacity": 25000},
        )
        scrap_rate = poly_info["scrap"]

        # Si las unidades son positivas, hay consumo de resina con factor de merma
        if pred_units > 0:
            resin_needed_kg = pred_weight_kg / (1.0 - scrap_rate)
            scrap_kg = resin_needed_kg - pred_weight_kg
        else:
            # En caso de devolución neta (negativa), la resina recuperada reingresa
            resin_needed_kg = pred_weight_kg
            scrap_kg = 0.0

        return {
            "producto": product_code,
            "demanda_neta_unidades": round(pred_units, 1),
            "peso_plastico_kg": round(pred_weight_kg, 2),
            "impacto_comercial_usd": round(pred_impact_usd, 2),
            "resina_tipo": poly_info["resin"],
            "silo_asignado": poly_info["silo"],
            "factor_merma_pct": round(scrap_rate * 100, 2),
            "resina_virgen_requerida_kg": round(resin_needed_kg, 2),
            "merma_proceso_estimada_kg": round(scrap_kg, 2),
            "hardware_aceleracion": self.device.type.upper(),
        }


def main():
    parser = argparse.ArgumentParser(description="PlastControl GPU AI Demand Predictor")
    parser.add_argument("--product", type=str, default="PREF-PET-28", help="Código del producto plástico")
    parser.add_argument("--process", type=str, default="INYECCION", help="Proceso de transformación")
    parser.add_argument("--units", type=float, default=150000.0, help="Unidades solicitadas")
    parser.add_argument("--price", type=float, default=0.045, help="Precio unitario USD")
    parser.add_argument("--weight", type=float, default=0.024, help="Peso unitario en kg")
    parser.add_argument("--season", type=str, default="ALTA", help="Estacionalidad (ALTA, MEDIA, BAJA)")
    parser.add_argument("--impact", type=str, default="DEMANDA_BASE", help="Factor de impacto")
    parser.add_argument("--status", type=str, default="COMPLETADA", help="Estado (COMPLETADA, DEVUELTA, CANCELADA)")
    args = parser.parse_args()

    predictor = PlastDemandPredictor()
    res = predictor.predict(
        product_code=args.product,
        process=args.process,
        requested_units=args.units,
        unit_price=args.price,
        unit_weight_kg=args.weight,
        season=args.season,
        impact_factor=args.impact,
        order_status=args.status,
    )

    print("\n" + "=" * 65)
    print("[RESULTADO] PREDICCION CON IA EN GPU NVIDIA")
    print("=" * 65)
    for k, v in res.items():
        print(f"  {k:<30}: {v}")
    print("=" * 65)


if __name__ == "__main__":
    main()
