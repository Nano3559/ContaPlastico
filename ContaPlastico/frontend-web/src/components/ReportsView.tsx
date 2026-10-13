import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  TrendingUp, 
  BarChart3, 
  CheckCircle2, 
  Layers, 
  Scale, 
  Printer, 
  FileText, 
  X, 
  ShieldCheck, 
  Sparkles,
  ArrowDownToLine
} from 'lucide-react';
import { rawMaterialsApi, scrapApi, entriesApi } from '../services/api';
import type { RawMaterial, ScrapRecord, BatchEntry } from '../types';
import { useToast } from '../context/ToastContext';

export const ReportsView: React.FC = () => {
  const { showToast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState<string>('Agosto 2026');
  const [reportType, setReportType] = useState<'balance' | 'scrap' | 'entries'>('balance');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);

  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [scrapList, setScrapList] = useState<ScrapRecord[]>([]);
  const [entriesList, setEntriesList] = useState<BatchEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      rawMaterialsApi.getAll(),
      scrapApi.getAll(),
      entriesApi.getAll()
    ]).then(([matRes, scrRes, entRes]) => {
      setMaterials(matRes.data);
      setScrapList(scrRes.data);
      setEntriesList(entRes.data);
      setIsLoading(false);
    });
  }, []);

  const totalStockKg = materials.reduce((acc, m) => acc + m.currentStockKg, 0);
  const totalEntriesKg = entriesList.reduce((acc, e) => acc + e.quantityKg, 0);
  const totalScrapKg = scrapList.reduce((acc, s) => acc + (s.rawMaterialUsedKg - s.finishedProductKg), 0);

  const handleExportCsv = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      // Incluir UTF-8 BOM (\uFEFF) para que Excel reconozca tildes y caracteres en español
      let csvContent = '\uFEFF';

      if (reportType === 'balance') {
        csvContent += 'Código,Materia Prima,Tipo Polímero,Ubicación Silo,Stock Actual (kg),Stock Mínimo Alerta (kg),Capacidad Máxima (kg),Estado\n';
        materials.forEach(m => {
          csvContent += `"${m.code}","${m.name}","${m.type}","${m.siloLocation}",${m.currentStockKg},${m.minStockKg},${m.maxCapacityKg},"${m.status}"\n`;
        });
      } else if (reportType === 'scrap') {
        csvContent += 'Orden Producción,Línea,Alimentado Tolva (kg),Prod. Conforme (kg),Scrap Molino (kg),Purga Desecho (kg),% Merma,Causa\n';
        scrapList.forEach(s => {
          csvContent += `"${s.orderNumber}","${s.machineLine}",${s.rawMaterialUsedKg},${s.finishedProductKg},${s.recoverableScrapKg},${s.discardScrapKg},${s.scrapPercentage},"${s.cause}"\n`;
        });
      } else {
        csvContent += 'Código Entrada,Materia Prima,Proveedor,Lote Fabricante,Factura/Guía,Silo Destino,Peso Neto Báscula (kg),Recepción\n';
        entriesList.forEach(e => {
          csvContent += `"${e.entryCode}","${e.materialName}","${e.supplierName}","${e.supplierBatch}","${e.invoiceNumber}","${e.siloDestination}",${e.quantityKg},"${e.createdAt}"\n`;
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = `PlastControl_${reportType}_${selectedMonth.replace(' ', '_')}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('Reporte Exportado', `Archivo ${filename} generado y descargado con éxito.`, 'success');
    }, 400);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Métricas & Cierres Contables</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white font-outfit">
            Reportes & Balance Mensual de Materia Prima
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Generación de balances de masa, auditoría de entradas en báscula, consumo en líneas y exportación en Excel/PDF.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 font-bold text-xs shadow-lg transition-all"
          >
            <Printer className="w-4 h-4 text-teal-400" />
            <span>Informe Formal PDF</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exportando...' : 'Exportar a CSV / Excel'}</span>
          </button>
        </div>
      </div>

      {/* Selector de Reporte & Filtro de Mes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setReportType('balance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              reportType === 'balance'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Balance de Silos & Stock
          </button>
          <button
            onClick={() => setReportType('scrap')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              reportType === 'scrap'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Análisis de Merma & Desperdicio
          </button>
          <button
            onClick={() => setReportType('entries')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              reportType === 'entries'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Historial de Recepciones
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
          >
            <option value="Agosto 2026">Agosto 2026 (Actual)</option>
            <option value="Julio 2026">Julio 2026</option>
            <option value="Junio 2026">Junio 2026</option>
          </select>
        </div>
      </div>

      {/* Report Table Preview */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base font-outfit">
              {reportType === 'balance' && 'Vista Previa: Balance Consolidado de Silos'}
              {reportType === 'scrap' && 'Vista Previa: Registro de Balance de Masa & Mermas'}
              {reportType === 'entries' && 'Vista Previa: Entradas de Materia Prima por Báscula'}
            </h3>
            <p className="text-xs text-slate-400">Período auditado: {selectedMonth}</p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-teal-400 font-bold">
            Auditoría PlastControl ERP
          </span>
        </div>

        {reportType === 'balance' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[10px] uppercase font-bold text-slate-500 bg-slate-950">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Materia Prima</th>
                  <th className="py-2.5 px-3">Silo</th>
                  <th className="py-2.5 px-3 text-right">Stock Actual</th>
                  <th className="py-2.5 px-3 text-right">Stock Mínimo</th>
                  <th className="py-2.5 px-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {materials.map(m => (
                  <tr key={m.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono text-cyan-400">{m.code}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{m.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{m.siloLocation}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">{m.currentStockKg.toLocaleString()} kg</td>
                    <td className="py-2.5 px-3 text-right text-slate-400">{m.minStockKg.toLocaleString()} kg</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.status === 'OPTIMO' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'scrap' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[10px] uppercase font-bold text-slate-500 bg-slate-950">
                <tr>
                  <th className="py-2.5 px-3">Orden</th>
                  <th className="py-2.5 px-3">Línea</th>
                  <th className="py-2.5 px-3 text-right">Alimentado (kg)</th>
                  <th className="py-2.5 px-3 text-right">Conforme (kg)</th>
                  <th className="py-2.5 px-3 text-right">Scrap Molino (kg)</th>
                  <th className="py-2.5 px-3 text-right">% Merma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {scrapList.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono text-amber-400 font-bold">{s.orderNumber}</td>
                    <td className="py-2.5 px-3 text-white">{s.machineLine}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">{s.rawMaterialUsedKg.toLocaleString()} kg</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400">{s.finishedProductKg.toLocaleString()} kg</td>
                    <td className="py-2.5 px-3 text-right text-cyan-400">+{s.recoverableScrapKg.toLocaleString()} kg</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-400">{s.scrapPercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'entries' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[10px] uppercase font-bold text-slate-500 bg-slate-950">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Materia Prima</th>
                  <th className="py-2.5 px-3">Proveedor</th>
                  <th className="py-2.5 px-3">Lote Fabricante</th>
                  <th className="py-2.5 px-3 text-right">Cantidad (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {entriesList.map(e => (
                  <tr key={e.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-mono text-cyan-400">{e.entryCode}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{e.materialName}</td>
                    <td className="py-2.5 px-3 text-slate-300">{e.supplierName}</td>
                    <td className="py-2.5 px-3 font-mono text-purple-300">{e.supplierBatch}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">+{e.quantityKg.toLocaleString()} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Vista Previa e Impresión de Informe Formal PDF */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Vista Previa de Informe Ejecutivo Oficial</h3>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Document Paper */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="bg-white text-slate-950 rounded-2xl p-8 shadow-2xl border border-slate-300 space-y-6">
                
                {/* Corporate Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">PLASTCONTROL S.A.</h1>
                    <p className="text-xs text-slate-600 font-bold uppercase">División de Manufactura & Control de Materia Prima</p>
                    <p className="text-[11px] text-slate-500">Planta Industrial Central — Certificación ISO 9001:2015</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 text-[10px] font-black bg-slate-900 text-white rounded uppercase">INFORME OFICIAL</span>
                    <div className="text-xs font-mono font-bold text-slate-700 mt-1">DOC-AUD-{Date.now().toString().slice(-6)}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Período: <strong>{selectedMonth}</strong></div>
                  </div>
                </div>

                {/* KPI Executive Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-300">
                    <span className="text-[10px] font-bold text-slate-600 uppercase block">Total Stock en Silos:</span>
                    <span className="text-lg font-black text-slate-900">{totalStockKg.toLocaleString()} KG</span>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-300">
                    <span className="text-[10px] font-bold text-slate-600 uppercase block">Entradas Acumuladas:</span>
                    <span className="text-lg font-black text-emerald-800">+{totalEntriesKg.toLocaleString()} KG</span>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-300">
                    <span className="text-[10px] font-bold text-slate-600 uppercase block">Mermas Procesadas:</span>
                    <span className="text-lg font-black text-amber-800">{totalScrapKg.toLocaleString()} KG</span>
                  </div>
                </div>

                {/* Content Table for PDF */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {reportType === 'balance' ? '1. Balance Consolidado de Silos' : reportType === 'scrap' ? '1. Registro de Mermas y Molienda' : '1. Registro de Entradas en Báscula'}
                  </h4>

                  <table className="w-full text-left text-[11px] border border-slate-300 divide-y divide-slate-300">
                    <thead className="bg-slate-100 text-slate-800 font-bold text-[10px] uppercase">
                      <tr>
                        {reportType === 'balance' && (
                          <>
                            <th className="p-2">Código</th>
                            <th className="p-2">Materia Prima</th>
                            <th className="p-2">Silo</th>
                            <th className="p-2 text-right">Stock Actual</th>
                            <th className="p-2 text-right">Mínimo</th>
                          </>
                        )}
                        {reportType === 'scrap' && (
                          <>
                            <th className="p-2">Orden</th>
                            <th className="p-2">Línea</th>
                            <th className="p-2 text-right">Alimentado</th>
                            <th className="p-2 text-right">Molino (+Stock)</th>
                            <th className="p-2 text-right">% Merma</th>
                          </>
                        )}
                        {reportType === 'entries' && (
                          <>
                            <th className="p-2">Código</th>
                            <th className="p-2">Materia Prima</th>
                            <th className="p-2">Proveedor</th>
                            <th className="p-2">Lote</th>
                            <th className="p-2 text-right">Peso Neto</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportType === 'balance' && materials.map(m => (
                        <tr key={m.id}>
                          <td className="p-2 font-mono font-bold text-slate-800">{m.code}</td>
                          <td className="p-2 font-semibold text-slate-900">{m.name}</td>
                          <td className="p-2 text-slate-600">{m.siloLocation}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">{m.currentStockKg.toLocaleString()} kg</td>
                          <td className="p-2 text-right text-slate-500">{m.minStockKg.toLocaleString()} kg</td>
                        </tr>
                      ))}
                      {reportType === 'scrap' && scrapList.map(s => (
                        <tr key={s.id}>
                          <td className="p-2 font-mono font-bold text-slate-800">{s.orderNumber}</td>
                          <td className="p-2 text-slate-700">{s.machineLine}</td>
                          <td className="p-2 text-right font-mono text-slate-900">{s.rawMaterialUsedKg.toLocaleString()} kg</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-800">+{s.recoverableScrapKg.toLocaleString()} kg</td>
                          <td className="p-2 text-right font-bold text-slate-800">{s.scrapPercentage}%</td>
                        </tr>
                      ))}
                      {reportType === 'entries' && entriesList.map(e => (
                        <tr key={e.id}>
                          <td className="p-2 font-mono font-bold text-slate-800">{e.entryCode}</td>
                          <td className="p-2 font-semibold text-slate-900">{e.materialName}</td>
                          <td className="p-2 text-slate-700">{e.supplierName}</td>
                          <td className="p-2 font-mono text-slate-600">{e.supplierBatch}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-800">+{e.quantityKg.toLocaleString()} kg</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sign-off Signatures */}
                <div className="grid grid-cols-2 gap-12 pt-10 border-t border-slate-300">
                  <div className="text-center border-t border-slate-900 pt-2">
                    <p className="text-xs font-bold text-slate-900">Ing. Pedro Ramos</p>
                    <p className="text-[10px] text-slate-500">Jefe de Producción & Planta</p>
                  </div>
                  <div className="text-center border-t border-slate-900 pt-2">
                    <p className="text-xs font-bold text-slate-900">Ing. Carlos Mendoza</p>
                    <p className="text-[10px] text-slate-500">Control de Calidad & Auditoría</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
              <span className="text-xs text-slate-400">Listo para imprimir o guardar como PDF formal</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPdfModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cerrar
                </button>
                <button
                  onClick={handlePrintPdf}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Guardar PDF</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
