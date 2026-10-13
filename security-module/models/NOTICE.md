# EPP Model Provenance and Validation

## Previous INT8 artifact

`best_int8.onnx` came from the public [PPE-Compliance-Detection-System](https://github.com/JeffYeo0406/PPE-Compliance-Detection-System) repository (MIT). Its SHA-256 was `2d847e095650991d498537f57c5cf0d38b42cd42a7457770921899f5824c17f9`. ONNX Runtime returned class scores of exactly 0.0 across all 14 classes on the tested worker images. This artifact is not suitable for EPP inference and must not be used for decisions.

## Kaggle notebook checkpoint to use

The downloaded notebook `ai-safe-ppe-detection-with-yolov8.ipynb` is also available from the Kaggle kernel `beyzakucuk/ai-safe-ppe-detection-with-yolov8`. Its executed cells trained `yolov8n-ppe-v2` and exported `/kaggle/working/yolov8n-ppe-v2/weights/best.onnx` with input shape `[1, 3, 640, 640]` and 6 classes: `boots`, `gloves`, `goggles`, `helmet`, `person`, `vest`.

The notebook's saved validation table reports mAP50 0.508 overall, precision 0.511, recall 0.586; per-class mAP50 is `goggles` 0.648, `vest` 0.634, `helmet` 0.553, `boots` 0.540, `gloves` 0.321, and `person` 0.349. This is a starting checkpoint, not a high-confidence or safety-certified system.

The notebook's `data.yaml` output reports the source project as MIT licensed. Verify and preserve the original project/dataset terms and attribution before redistributing weights. Kaggle output weights are not part of the downloaded `.ipynb`; download `best.onnx` from the executed Kaggle session and place it at `security-module/models/best.onnx`. The model weights are ignored by Git.

## Dataset limitation

The separate local `Dataset_no_person_glasses` dataset is CC BY-SA 4.0 and contains only `Helmet`, `Mask`, `Safety Vest`, `boots`, and `glove`. Its publisher removed `Person` and `glasses`. Do not merge those images into the six-class notebook training set without restoring/correcting annotations; missing boxes would teach the model that those objects are background.

Neither dataset contains explicit missing-equipment labels for all required PPE. The service therefore treats undetected items as unverified unless there is explicit evidence; it cannot reliably label a missing item from these checkpoints. The results have not been validated on PlastControl's factory cameras. Do not use model output as a machine safety interlock.
