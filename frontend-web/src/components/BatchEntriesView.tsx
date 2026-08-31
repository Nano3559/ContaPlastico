import React, { useState, useEffect } from 'react';
import { 
  ArrowDownRight, 
  PlusCircle, 
  Search, 
  FileCheck2, 
  Scale, 
  X, 
  CheckCircle2, 
  Truck, 
  Printer, 
  Calendar,
  Layers,
  Building2,
  FileText,
  QrCode
} from 'lucide-react';
import { entriesApi, rawMaterialsApi } from '../services/api';
import type { BatchEntry, RawMaterial } from '../types';
import { LotQrLabelModal } from './LotQrLabelModal';
import { useToast } from '../context/ToastContext';

export const BatchEntriesView: React.FC = () => {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<BatchEntry[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedTicket, setSelectedTicket] = useState<BatchEntry | null>(null);
  const [selectedQrEntry, setSelectedQrEntry] = useState<BatchEntry | null>(null);

  // Form State
  const [formState, setFormState] = useState({
    materialId: '',
    supplierName: 'Petroquímica del Sur S.A.',
    supplierBatch: 'LOTE-BRK-2026-88',
    quantityKg: 5000,
    invoiceNumber: 'FAC-2026-9021',
    siloDestination: 'Silo A-01',
    qualityCertificatePassed: true,
    notes: 'Inspección conforme, libre de humedad y finos.',
    receivedBy: 'Rodrigo Alarcón (Báscula)'
  });

  const loadData = async () => {
    setIsLoading(true);
    const [entriesRes, matRes] = await Promise.all([
      entriesApi.getAll(),
      rawMaterialsApi.getAll()
    ]);
    setEntries(entriesRes.data);
    setMaterials(matRes.data);
    if (matRes.data.length > 0 && !formState.materialId) {
      setFormState(prev => ({
        ...prev,
        materialId: matRes.data[0].id,
        siloDestination: matRes.data[0].siloLocation
      }));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetMat = materials.find(m => m.id === formState.materialId);
    const created = await entriesApi.create({
      materialId: formState.materialId,
      materialName: targetMat?.name || 'Polímero',
      supplierName: formState.supplierName,
      supplierBatch: formState.supplierBatch,
      quantityKg: Number(formState.quantityKg),
      invoiceNumber: formState.invoiceNumber,
      siloDestination: formState.siloDestination,
      qualityCertificatePassed: formState.qualityCertificatePassed,
      notes: formState.notes,
      receivedBy: formState.receivedBy
    });
    setShowModal(false);
    await loadData();
    if (created?.data) {
      showToast(
        'Entrada Registrada en Báscula',
        `Lote ${created.data.entryCode} ingresado a ${created.data.siloDestination} (+${created.data.quantityKg.toLocaleString()} kg).`,
        'success'
      );
      setSelectedQrEntry(created.data);
    }
  };

  const filteredEntries = entries.filter(e => 
    e.entryCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.materialName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.supplierBatch.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalKgReceived = entries.reduce((acc, e) => acc + e.quantityKg, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Scale className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Módulo de Báscula & Recepción</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white font-outfit">
            Entradas de Materia Prima & Control de Lotes
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Registro de camiones, pesaje bruto y tara, inspección de calidad petroquímica y asignación de lotes a silos de almacenamiento.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Entrada en Báscula</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Total Ingresado</span>
            <div className="text-xl font-extrabold text-emerald-400 mt-0.5">+{totalKgReceived.toLocaleString()} kg</div>
            <span className="text-[10px] text-slate-400">{entries.length} recepciones registradas</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Certificados de Calidad</span>
            <div className="text-xl font-extrabold text-cyan-400 mt-0.5">100% Conformes</div>
            <span className="text-[10px] text-cyan-400/80">Densidad & MFI validados</span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400">Última Recepción</span>
            <div className="text-sm font-extrabold text-white mt-1">
              {entries[0] ? entries[0].materialName : 'Sin registros'}
            </div>
            <span className="text-[10px] text-slate-500">{entries[0]?.createdAt || '-'}</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código de entrada, factura, lote o material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Entries List */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4">Código / Fecha</th>
              <th className="py-3.5 px-4">Materia Prima & Silo</th>
              <th className="py-3.5 px-4">Proveedor & Lote Petroquímica</th>
              <th className="py-3.5 px-4">Factura / Guía</th>
              <th className="py-3.5 px-4 text-right">Peso Neto (kg)</th>
              <th className="py-3.5 px-4 text-center">Calidad</th>
              <th className="py-3.5 px-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-mono font-bold text-cyan-400">{entry.entryCode}</div>
                  <div className="text-[10px] text-slate-500">{entry.createdAt}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-bold text-white text-sm">{entry.materialName}</div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Destino: {entry.siloDestination}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-200">{entry.supplierName}</div>
                  <div className="font-mono text-[10px] text-purple-300">Lote: {entry.supplierBatch}</div>
                </td>
                <td className="py-3 px-4 font-mono text-slate-300">
                  {entry.invoiceNumber}
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-extrabold text-emerald-400 text-sm">
                    +{entry.quantityKg.toLocaleString()} kg
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Conforme
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => setSelectedQrEntry(entry)}
                      title="Ver e Imprimir Etiqueta con Código QR"
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors inline-flex items-center gap-1 shadow-sm"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Etiqueta QR</span>
                    </button>
                    <button
                      onClick={() => setSelectedTicket(entry)}
                      title="Ver Ticket de Báscula"
                      className="px-2.5 py-1 text-[11px] font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ticket</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Etiqueta Industrial QR */}
      {selectedQrEntry && (
        <LotQrLabelModal
          entry={selectedQrEntry}
          onClose={() => setSelectedQrEntry(null)}
        />
      )}

      {/* Modal: Ticket de Báscula Imprimible */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl relative">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pb-4 border-b border-dashed border-slate-700">
              <div className="font-extrabold text-lg text-white font-outfit">PLASTCONTROL</div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ticket de Pesaje & Recepción en Báscula</p>
              <div className="font-mono text-xs font-bold text-cyan-400 mt-1">{selectedTicket.entryCode}</div>
            </div>

            <div className="py-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Fecha / Hora:</span>
                <span className="font-mono text-white">{selectedTicket.createdAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Materia Prima:</span>
                <span className="font-bold text-white">{selectedTicket.materialName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Proveedor Petroquímico:</span>
                <span className="text-slate-200">{selectedTicket.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Lote de Origen:</span>
                <span className="font-mono text-purple-300">{selectedTicket.supplierBatch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Factura / Guía:</span>
                <span className="font-mono text-slate-200">{selectedTicket.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Silo Destino:</span>
                <span className="font-bold text-cyan-400">{selectedTicket.siloDestination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recibido por:</span>
                <span className="text-slate-200">{selectedTicket.receivedBy}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center mt-3">
                <span className="text-xs font-bold text-slate-300 uppercase">Peso Neto Recibido:</span>
                <span className="text-lg font-extrabold text-emerald-400">+{selectedTicket.quantityKg.toLocaleString()} KG</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Ticket</span>
              </button>
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Formulario de Nueva Entrada */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-400" />
              Recepción de Materia Prima en Báscula
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Ingresa los datos del albarán de entrega, certificado de análisis y peso neto de la báscula.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Materia Prima / Polímero</label>
                <select
                  value={formState.materialId}
                  onChange={(e) => {
                    const sel = materials.find(m => m.id === e.target.value);
                    setFormState({
                      ...formState,
                      materialId: e.target.value,
                      siloDestination: sel?.siloLocation || 'Silo 1'
                    });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.code}) — {m.siloLocation}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Proveedor Petroquímico</label>
                  <input
                    type="text"
                    required
                    value={formState.supplierName}
                    onChange={(e) => setFormState({ ...formState, supplierName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Lote del Fabricante</label>
                  <input
                    type="text"
                    required
                    value={formState.supplierBatch}
                    onChange={(e) => setFormState({ ...formState, supplierBatch: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Número de Factura / Guía</label>
                  <input
                    type="text"
                    required
                    value={formState.invoiceNumber}
                    onChange={(e) => setFormState({ ...formState, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Peso Neto Báscula (kg)</label>
                  <input
                    type="number"
                    required
                    value={formState.quantityKg}
                    onChange={(e) => setFormState({ ...formState, quantityKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Silo o Almacén de Descarga</label>
                <input
                  type="text"
                  required
                  value={formState.siloDestination}
                  onChange={(e) => setFormState({ ...formState, siloDestination: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/30 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="certQuality"
                  checked={formState.qualityCertificatePassed}
                  onChange={(e) => setFormState({ ...formState, qualityCertificatePassed: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                />
                <label htmlFor="certQuality" className="text-xs text-emerald-300 font-medium">
                  Certificado de Análisis y MFI del lote recibido verificado conforme
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20"
                >
                  Registrar e Ingresar a Silo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
