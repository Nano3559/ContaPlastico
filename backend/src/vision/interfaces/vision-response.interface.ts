export interface EppDetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EppDetectionItem {
  label: string;
  confidence: number;
  box: EppDetectionBox;
}

export interface EppStatus {
  helmet: boolean;
  goggles: boolean;
  vest: boolean;
}

export interface VerifyEppResult {
  accessGranted: boolean;
  isConclusive: boolean;
  status: EppStatus;
  missing: string[];
  unverified: string[];
  detected: string[];
  confidenceSummary: {
    helmet?: number;
    goggles?: number;
    vest?: number;
  };
  detections: EppDetectionItem[];
  timestamp: string;
  message: string;
}
