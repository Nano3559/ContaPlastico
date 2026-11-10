"""
PlastDemandNet: Red Neuronal Profunda con Embeddings Categóricos,
Atención Multi-Cabeza e Inferencia Multi-Tarea acelerada por GPU NVIDIA.
Diseñada específicamente para modelar demanda plástica con valores positivos y negativos.
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F


class ResidualBlock(nn.Module):
    def __init__(self, dim, dropout=0.15):
        super().__init__()
        self.fc1 = nn.Linear(dim, dim * 2)
        self.act = nn.SiLU()  # Swish activation para gradientes suaves
        self.dropout = nn.Dropout(dropout)
        self.fc2 = nn.Linear(dim * 2, dim)
        self.norm = nn.LayerNorm(dim)

    def forward(self, x):
        residual = x
        out = self.fc1(x)
        out = self.act(out)
        out = self.dropout(out)
        out = self.fc2(out)
        return self.norm(residual + out)


class PlastDemandNet(nn.Module):
    def __init__(self, vocab_sizes, num_features_dim, hidden_dim=128, num_layers=3, num_targets=3, dropout=0.15):
        super().__init__()
        self.embeddings = nn.ModuleList()
        total_emb_dim = 0

        # Crear capas de embeddings para cada columna categórica
        for col_name, v_size in vocab_sizes.items():
            emb_dim = max(4, min(32, int(round(1.6 * (v_size ** 0.56)))))
            self.embeddings.append(nn.Embedding(v_size, emb_dim))
            total_emb_dim += emb_dim

        # Proyección de características continuas y temporales
        self.num_projection = nn.Sequential(
            nn.Linear(num_features_dim, 64),
            nn.SiLU(),
            nn.LayerNorm(64),
        )

        input_combined_dim = total_emb_dim + 64
        self.input_layer = nn.Sequential(
            nn.Linear(input_combined_dim, hidden_dim),
            nn.SiLU(),
            nn.LayerNorm(hidden_dim),
        )

        # Mecanismo de Atención de características (Self-Attention)
        self.self_attention = nn.MultiheadAttention(
            embed_dim=hidden_dim, num_heads=4, dropout=dropout, batch_first=True
        )
        self.attn_norm = nn.LayerNorm(hidden_dim)

        # Bloques residuales profundos
        self.res_blocks = nn.ModuleList([
            ResidualBlock(hidden_dim, dropout=dropout) for _ in range(num_layers)
        ])

        # Cabezales multi-tarea especializados:
        # Target 1: Cantidad de Unidades (Demanda Neta: positivos de pedidos y negativos de devoluciones)
        # Target 2: Peso Total Plástico Kg (Requerimiento estequiométrico de resina para Silos)
        # Target 3: Impacto Comercial USD (Balance financiero positivo y negativo)
        self.head_units = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.SiLU(),
            nn.Dropout(dropout / 2),
            nn.Linear(64, 1),
        )

        self.head_weight = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.SiLU(),
            nn.Dropout(dropout / 2),
            nn.Linear(64, 1),
        )

        self.head_impact = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.SiLU(),
            nn.Dropout(dropout / 2),
            nn.Linear(64, 1),
        )

    def forward(self, cat_x, num_x):
        # 1. Procesar Embeddings Categóricos
        emb_outputs = []
        for i, emb_layer in enumerate(self.embeddings):
            emb_outputs.append(emb_layer(cat_x[:, i]))
        cat_emb = torch.cat(emb_outputs, dim=-1)

        # 2. Procesar Numéricos
        num_proj = self.num_projection(num_x)

        # 3. Concatenar y proyectar al espacio oculto
        combined = torch.cat([cat_emb, num_proj], dim=-1)
        x = self.input_layer(combined)

        # 4. Capa de Auto-Atención (aprende correlaciones no lineales complejas)
        # Re-dimensionar a (batch, seq_len=1, hidden_dim)
        x_seq = x.unsqueeze(1)
        attn_out, _ = self.self_attention(x_seq, x_seq, x_seq)
        x = self.attn_norm(x + attn_out.squeeze(1))

        # 5. Pasar por bloques residuales
        for block in self.res_blocks:
            x = block(x)

        # 6. Salidas multi-tarea
        pred_units = self.head_units(x)
        pred_weight = self.head_weight(x)
        pred_impact = self.head_impact(x)

        # Concatenar en tensor final de tamaño (batch, 3)
        return torch.cat([pred_units, pred_weight, pred_impact], dim=-1)

