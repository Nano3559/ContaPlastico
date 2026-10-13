import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  PlusCircle, 
  Search, 
  Package, 
  CheckCircle2, 
  X, 
  ExternalLink,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { suppliersApi } from '../services/api';

interface SupplierItem {
  id: string;
  code: string;
  name: string;
  country: string;
  materialsSupplied: string[];
  contactPerson: string;
  email: string;
  phone: string;
  qualityRating: number; // 1-5
  status: 'ACTIVO' | 'EN_EVALUACION';
}

export const SuppliersView: React.FC = () => {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    country: 'Nacional',
    materialsSupplied: '',
    contactPerson: '',
    email: '',
    phone: ''
  });

  const loadSuppliers = async () => {
    try {
      setIsLoading(true);
      const res = await suppliersApi.getAll();
      const mapped: SupplierItem[] = (res.data || []).map((s: any) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        country: s.country || 'Nacional / Internacional',
        materialsSupplied: Array.isArray(s.materialsSupplied) && s.materialsSupplied.length > 0
          ? s.materialsSupplied
          : (s.materials && s.materials.length > 0 ? s.materials.map((m: any) => m.name) : ['Polietileno / Polipropileno', 'Masterbatch']),
        contactPerson: s.contactName || s.contactPerson || 'Contacto Comercial',
        email: s.email || 'contacto@proveedor.com',
        phone: s.phone || 'N/A',
        qualityRating: s.qualityRating || 5,
        status: s.status || 'ACTIVO'
      }));
      setSuppliers(mapped);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const cleanName = formData.name.trim();
      const code = formData.code.trim() || `PROV-${cleanName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const cleanEmail = formData.email.trim();
      const email = cleanEmail.includes('@') ? cleanEmail : `contacto@${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'proveedor'}.com`;

      await suppliersApi.create({
        code,
        name: cleanName,
        contactName: formData.contactPerson.trim() || 'Contacto Comercial',
        email: email,
        phone: formData.phone.trim() || '+591 00000000'
      });

      setShowModal(false);
      setFormData({
        code: '',
        name: '',
        country: 'Nacional',
        materialsSupplied: '',
        contactPerson: '',
        email: '',
        phone: ''
      });
      await loadSuppliers();
    } catch (err) {
      console.error('Error al crear proveedor:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase()) ||
    s.materialsSupplied.some(m => m.toLowerCase().includes(search.toLowerCase()))
  );


  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Building2 className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Cadena de Suministro</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white font-outfit">
            Proveedores Petroquímicos & Fabricantes
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Directorio homologado de petroquímicas globales y fabricantes de resinas, masterbatch y aditivos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuevo Proveedor</span>
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por petroquímica, polímero o contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((sup) => (
          <div
            key={sup.id}
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-blue-400">{sup.code}</span>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  Homologado
                </span>
              </div>

              <h3 className="font-bold text-white text-base mb-1">{sup.name}</h3>
              <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {sup.country}
              </p>

              {/* Materials List */}
              <div className="space-y-1.5 mb-4">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Materiales Suministrados:</span>
                <div className="flex flex-wrap gap-1.5">
                  {sup.materialsSupplied.map((m, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-1 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>{sup.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{sup.phone} • Contacto: <strong className="text-slate-200">{sup.contactPerson}</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Nuevo Proveedor */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              Registrar Proveedor Petroquímico
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Ingresa los datos fiscales y contacto del fabricante o distribuidor.
            </p>

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Código</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: PROV-DOW"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Razón Social</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Dow Chemical"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Materiales que Suministra (separados por coma)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: HDPE Inyección, PP Homopolímero"
                  value={formData.materialsSupplied}
                  onChange={(e) => setFormData({ ...formData, materialsSupplied: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Contacto Principal</label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">País / Origen</label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Teléfono</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSaving ? 'Guardando...' : 'Guardar Proveedor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
