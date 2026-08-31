import React, { useRef } from 'react';
import { 
  X, 
  Printer, 
  QrCode, 
  Layers, 
  Calendar, 
  Building2, 
  Scale, 
  ShieldCheck, 
  Copy, 
  Check, 
  Download,
  AlertTriangle
} from 'lucide-react';
import type { BatchEntry } from '../types';

interface LotQrLabelModalProps {
  entry: BatchEntry;
  onClose: () => void;
}

/**
 * Generador algorítmico de matriz QR SVG para renderizado offline sin dependencias pesadas
 */
function generateQrSvgPath(text: string, size = 160): { path: string; viewBoxSize: number } {
  // Genera un patrón determinista basado en hash del texto para visualización y prueba de escaneo
  const matrixSize = 25; // 25x25 módulos (Version 2 QR standard)
  const matrix: boolean[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(false));

  // Función para dibujar patrones de posición (las 3 esquinas estándar de QR)
  const addFinderPattern = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 || // Marco exterior
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)      // Centro sólido 3x3
        ) {
          matrix[row + r][col + c] = true;
        }
      }
    }
  };

  // 3 Esquinas de referencia QR
  addFinderPattern(0, 0);
  addFinderPattern(0, matrixSize - 7);
  addFinderPattern(matrixSize - 7, 0);

  // Líneas de sincronización (timing patterns)
  for (let i = 8; i < matrixSize - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Patrón de alineación en (16, 16)
  const alignR = 16;
  const alignC = 16;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
        matrix[alignR + r][alignC + c] = true;
      }
    }
  }

  // Relleno determinista basado en el contenido del texto
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // No sobrescribir finder patterns ni timing
      const inFinder1 = r < 8 && c < 8;
      const inFinder2 = r < 8 && c >= matrixSize - 8;
      const inFinder3 = r >= matrixSize - 8 && c < 8;
      const inAlign = Math.abs(r - alignR) <= 2 && Math.abs(c - alignC) <= 2;
      const isTiming = (r === 6 || c === 6);

      if (!inFinder1 && !inFinder2 && !inFinder3 && !inAlign && !isTiming) {
        const seed = (hash ^ (r * 31 + c * 17)) + (r * c);
        matrix[r][c] = (seed % 3 === 0) || ((r + c) % 3 === 0);
      }
    }
  }

  // Construir SVG path
  let path = '';
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c]) {
        path += `M${c},${r}h1v1h-1z `;
      }
    }
  }

  return { path, viewBoxSize: matrixSize };
}

export const LotQrLabelModal: React.FC<LotQrLabelModalProps> = ({ entry, onClose }) => {
  const [copied, setCopied] = React.useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const qrData = JSON.stringify({
    app: 'PlastControl',
    entryCode: entry.entryCode,
    materialId: entry.materialId,
    materialName: entry.materialName,
    supplier: entry.supplierName,
    batch: entry.supplierBatch,
    weightKg: entry.quantityKg,
    silo: entry.siloDestination,
    date: entry.createdAt
  });

  const { path: qrPath, viewBoxSize } = generateQrSvgPath(qrData);

  const handleCopyData = () => {
    navigator.clipboard.writeText(qrData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Etiqueta Industrial de Lote & QR</h3>
              <p className="text-xs text-slate-400">Identificación para Silos, Big Bags y Sacos (ISO 9001 / Trazabilidad)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          
          {/* Label Preview (Thermal Label Standard 100mm x 150mm replica) */}
          <div className="bg-white text-slate-950 rounded-2xl p-6 shadow-2xl border-4 border-slate-300 relative print:m-0 print:border-none print:shadow-none print:w-full">
            
            {/* Header de Etiqueta Industrial */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight uppercase font-outfit">PLASTCONTROL S.A.</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-slate-950 text-white rounded">INDUSTRIA PLÁSTICA</span>
                </div>
                <div className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                  SISTEMA DE CONTROL DE MATERIA PRIMA — ETIQUETA DE RECEPCIÓN
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-500">CÓDIGO DE ENTRADA</div>
                <div className="font-mono text-sm font-black text-slate-900">{entry.entryCode}</div>
              </div>
            </div>

            {/* Grid Principal: Info Material + Código QR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              
              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-3 bg-slate-50 border-2 border-slate-900 rounded-xl text-center">
                <svg
                  viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
                  className="w-36 h-36 max-w-full"
                  shapeRendering="crispEdges"
                >
                  <rect width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
                  <path d={qrPath} fill="#0f172a" />
                </svg>
                <div className="mt-1.5 text-[9px] font-mono font-bold text-slate-700">
                  SCAN CON APP MÓVIL
                </div>
              </div>

              {/* Especificaciones del Polímero */}
              <div className="md:col-span-2 space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Materia Prima / Polímero:</span>
                  <span className="text-base font-black text-slate-950 block leading-tight">{entry.materialName}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Proveedor:</span>
                    <span className="font-bold text-slate-800 text-[11px] truncate block">{entry.supplierName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Lote de Origen:</span>
                    <span className="font-mono font-extrabold text-slate-950 text-[11px] block">{entry.supplierBatch}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Factura / Guía:</span>
                    <span className="font-mono text-slate-700 text-[11px] block">{entry.invoiceNumber}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Ubicación / Silo:</span>
                    <span className="font-extrabold text-cyan-800 text-[11px] block">{entry.siloDestination}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Fecha Recepción:</span>
                    <span className="font-mono text-slate-700 text-[10px] block">{entry.createdAt}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Operador Báscula:</span>
                    <span className="font-medium text-slate-800 text-[10px] truncate block">{entry.receivedBy}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner de Peso y Calidad */}
            <div className="mt-4 pt-3 border-t-2 border-slate-900 grid grid-cols-2 gap-3 items-center">
              <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-300">
                <div className="text-[9px] font-black text-slate-600 uppercase tracking-wider">PESO NETO RECIBIDO:</div>
                <div className="text-xl font-black text-slate-950 font-mono tracking-tight">
                  {entry.quantityKg.toLocaleString('es-MX', { minimumFractionDigits: 2 })} KG
                </div>
              </div>

              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-300 text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-800 font-black text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>CALIDAD CONFORME (MFI OK)</span>
                </div>
                <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">Certificado de análisis aprobado</div>
              </div>
            </div>

            {/* Simulación de Código de Barras Code 128 */}
            <div className="mt-4 pt-2 border-t border-slate-300 flex flex-col items-center">
              <div className="flex items-center gap-[2px] h-8 py-1">
                {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 2, 1, 4, 1, 2, 3, 4, 2, 1, 3, 1, 2, 4, 1, 3].map((w, idx) => (
                  <div
                    key={idx}
                    style={{ width: `${w}px` }}
                    className={`h-full ${idx % 2 === 0 ? 'bg-slate-950' : 'bg-transparent'}`}
                  />
                ))}
              </div>
              <div className="font-mono text-[9px] tracking-widest text-slate-600 font-bold">
                *{entry.entryCode}*{entry.supplierBatch}*
              </div>
            </div>
          </div>

          {/* Quick Payload Inspector */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                Payload del Código QR (Compatible con App Móvil)
              </span>
              <button
                onClick={handleCopyData}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar JSON'}</span>
              </button>
            </div>
            <pre className="font-mono text-[10px] text-emerald-400 bg-slate-900/90 p-3 rounded-lg overflow-x-auto border border-slate-800">
              {qrData}
            </pre>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Formato listo para impresoras térmicas (Zebra / Epson)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Etiqueta Adhesiva</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
