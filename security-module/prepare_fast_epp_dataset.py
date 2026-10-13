# -*- coding: utf-8 -*-
"""
Script para generar un subconjunto enfocado y balanceado del Dataset de EPP.
Selecciona únicamente imágenes que contienen las clases requeridas:
  - Casco (0: helmet, 1: no_helmet)
  - Chaleco (2: vest)
  - Lentes (7: goggles, 8: no_goggles)

Esto reduce el dataset de 23,661 imágenes pesadas a ~1,500 imágenes precisas,
permitiendo que el entrenamiento tome 20-30 minutos en vez de varios días.
"""
import os
import shutil
import random
from pathlib import Path

SOURCE_DIR = Path(r"C:\Users\IFAM_\Desktop\ModuloIA_Seguridad\Dataset")
TARGET_DIR = Path(r"C:\Users\IFAM_\Desktop\ModuloIA_Seguridad\Dataset_Fast")

TARGET_CLASSES = {0, 1, 2, 7, 8}

def prepare_subset(max_train=1500, max_val=300):
    print("=" * 60)
    print("  CREACIÓN DE DATASET RÁPIDO PARA EPP (Casco, Chaleco, Lentes)")
    print("=" * 60)

    TARGET_DIR.mkdir(exist_ok=True)

    for split, max_count in [("train", max_train), ("valid", max_val)]:
        src_imgs = SOURCE_DIR / split / "images"
        src_lbls = SOURCE_DIR / split / "labels"

        dst_imgs = TARGET_DIR / split / "images"
        dst_lbls = TARGET_DIR / split / "labels"

        dst_imgs.mkdir(parents=True, exist_ok=True)
        dst_lbls.mkdir(parents=True, exist_ok=True)

        if not src_lbls.exists():
            continue

        valid_pairs = []
        for lf in os.listdir(src_lbls):
            if not lf.endswith(".txt"):
                continue
            lpath = src_lbls / lf
            with open(lpath, "r") as f:
                classes = {int(line.split()[0]) for line in f if line.strip()}
            if classes & TARGET_CLASSES:
                stem = Path(lf).stem
                # Buscar imagen correspondiente (.jpg, .png, etc.)
                for ext in [".jpg", ".jpeg", ".png"]:
                    ipath = src_imgs / (stem + ext)
                    if ipath.exists():
                        valid_pairs.append((ipath, lpath))
                        break

        print(f"[{split.upper()}] Encontradas {len(valid_pairs)} imágenes con Casco/Chaleco/Lentes.")

        # Seleccionar muestra balanceada
        random.seed(42)
        sample = random.sample(valid_pairs, min(len(valid_pairs), max_count))
        print(f"[{split.upper()}] Copiando {len(sample)} imágenes seleccionadas...")

        for ipath, lpath in sample:
            shutil.copy2(ipath, dst_imgs / ipath.name)
            shutil.copy2(lpath, dst_lbls / lpath.name)

    # Crear data_fast.yaml
    yaml_content = f"""path: {str(TARGET_DIR)}
train: train/images
val: valid/images

nc: 17
names:
  - helmet
  - no_helmet
  - vest
  - gloves
  - no_gloves
  - boots
  - no_boots
  - goggles
  - no_goggles
  - ear_protection
  - no_ear_protection
  - traffic_cone
  - barrier_tape
  - warning_sign
  - handrail
  - guardrail
  - safety_net
"""
    yaml_path = Path(r"C:\Users\IFAM_\Desktop\ModuloIA_Seguridad\data_fast.yaml")
    with open(yaml_path, "w", encoding="utf-8") as f:
        f.write(yaml_content)

    print(f"\n[+] Dataset rápido creado en: {TARGET_DIR}")
    print(f"[+] Archivo YAML configurado: {yaml_path}")
    print("=" * 60)

if __name__ == "__main__":
    prepare_subset()
