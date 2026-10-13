import unittest

import numpy as np

from local_inference import parse_detections


class ParseDetectionsTests(unittest.TestCase):
    def test_maps_kaggle_six_class_output_to_backend_labels(self) -> None:
        output = np.zeros((1, 10, 4), dtype=np.float32)
        output[0, :4, 0] = [100, 100, 40, 60]
        output[0, 4 + 3, 0] = 0.92
        output[0, :4, 1] = [200, 150, 80, 100]
        output[0, 4 + 4, 1] = 0.98
        output[0, :4, 2] = [160, 150, 60, 50]
        output[0, 4 + 2, 2] = 0.86
        output[0, :4, 3] = [300, 300, 100, 200]
        output[0, 4 + 5, 3] = 0.87

        detections = parse_detections(output, 640, 640, 1.0, 0, 0)

        self.assertEqual(
            {item["class"] for item in detections},
            {"helmet", "Person", "goggles", "vest"},
        )
        helmet = next(item for item in detections if item["class"] == "helmet")
        self.assertEqual(helmet["x"], 100)
        self.assertEqual(helmet["y"], 100)
        self.assertAlmostEqual(helmet["confidence"], 0.92, places=5)

    def test_preserves_other_trained_classes(self) -> None:
        output = np.zeros((1, 10, 2), dtype=np.float32)
        output[0, :4, 0] = [80, 90, 30, 50]
        output[0, 4 + 0, 0] = 0.88
        output[0, :4, 1] = [180, 190, 40, 60]
        output[0, 4 + 1, 1] = 0.84

        detections = parse_detections(output, 640, 640, 1.0, 0, 0)

        self.assertEqual({item["class"] for item in detections}, {"boots", "gloves"})


if __name__ == "__main__":
    unittest.main()
