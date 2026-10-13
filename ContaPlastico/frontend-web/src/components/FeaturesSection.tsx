import React, { useState } from 'react';
import { 
  PackageCheck, 
  Truck, 
  Workflow, 
  Recycle, 
  BellRing, 
  FileSpreadsheet, 
  ChevronRight,
  Cpu,
  CheckCircle,
  Database
} from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState(0);

  const modules = [
    {
      id: 1,
      title: "1. Catálogo de Materia Prima & Silos",
      subtitle: "Día 3 — CRUD e Inventario",
      icon: PackageCheck,
      color: "from-cyan-500 to-blue-600",
      textColor: "text-cyan-400",
      description: "Clasificación integral de resinas vírgenes (HDPE, LDPE, PP, PET, PVC), material recuperado de post-consumo o post-industrial, masterbatch concentrado y aditivos (CaCO3, UV, deslizantes).",
      features: [
        "Registro de propiedades reológicas: Índice de Fluidez (MFI) y Densidad (g/cm³)",
        "Control de capacidad volumétrica por silo exterior y tolvas internas",
        "Trazabilidad por código de resina y especificación técnica de inyección/extrusión",
        "Cálculo de stock físico vs stock comprometido en órdenes de producción"
      ],
      apiEndpoint: "GET /api/raw-materials"
    },
    {
      id: 2,
      title: "2. Registro de Entradas & Trazabilidad",
      subtitle: "Día 4 — Entradas + Lotes",
      icon: Truck,
      color: "from-emerald-500 to-teal-600",
      textColor: "text-emerald-400",
      description: "Gestión de recepción de materia prima en báscula con verificación de remisiones de proveedores, registro de lote original de petroquímica y asignación a silo de descarga.",
      features: [
        "Asignación automática de lote interno con código QR / Barcode",
        "Control de calidad en recepción (humedad, color, granulometría)",
        "Registro de factura/guía de remisión y pesaje bruto/tara",
        "Historial inmutable de ingresos para auditorías ISO 9001"
      ],
      apiEndpoint: "POST /api/entries"
    },
    {
      id: 3,
      title: "3. Solicitudes y Despacho a Producción",
      subtitle: "Día 5 — Salidas / Aprobación",
      icon: Workflow,
      color: "from-purple-500 to-indigo-600",
      textColor: "text-purple-400",
      description: "Flujo digital para que los supervisores de Extrusión, Inyección y Soplado soliciten mezclas de resina virgen con recuperado y aditivos según receta estándar.",
      features: [
        "Vinculación a la Orden de Producción (OP) activa",
        "Validación automática de disponibilidad de stock antes de autorizar",
        "Aprobación en tiempo real por el encargado de almacén",
        "Descuento automático de stock de silo tras la confirmación de pesaje"
      ],
      apiEndpoint: "POST /api/production-requests"
    },
    {
      id: 4,
      title: "4. Balance de Masa & Control de Merma (Scrap)",
      subtitle: "Día 6-7 — Producción + Consumo + Merma",
      icon: Recycle,
      color: "from-amber-500 to-orange-600",
      textColor: "text-amber-400",
      description: "Cálculo riguroso del balance de masa en planta: Materia Prima Utilizada = Producto Conforme + Merma Recuperable + Desecho Contaminado.",
      features: [
        "Diferenciación entre 'Scrap Recuperable' (retales para remolienda) y 'Purga/Desecho'",
        "Reintegro automático de merma molida al inventario de material recuperado",
        "Clasificación de causas de merma (arranque de máquina, atasco, corte, calibración)",
        "Métricas de eficiencia OEE y rendimiento porcentual de resina"
      ],
      apiEndpoint: "POST /api/production/scrap"
    },
    {
      id: 5,
      title: "5. Monitor de Alertas & Cron de Stock Mínimo",
      subtitle: "Día 9 — Alertas de Stock (NestJS Cron)",
      icon: BellRing,
      color: "from-rose-500 to-pink-600",
      textColor: "text-rose-400",
      description: "Servicio programado en background (@nestjs/schedule) que evalúa el inventario contra el punto de reorden para evitar paradas inesperadas de las líneas de extrusión.",
      features: [
        "Notificaciones inmediatas a compras cuando el stock cruza el umbral de seguridad",
        "Predicción de agotamiento de silo según velocidad de consumo por turno",
        "Semaforización visual en dashboards web y notificaciones push en móvil",
        "Registro de eventos de stockout para análisis de cadena de suministro"
      ],
      apiEndpoint: "GET /api/alerts"
    },
    {
      id: 6,
      title: "6. Reportes Mensuales y Exportación",
      subtitle: "Día 10 — Exportación Excel / PDF",
      icon: FileSpreadsheet,
      color: "from-blue-500 to-cyan-600",
      textColor: "text-blue-400",
      description: "Motor de reportería avanzada con ExcelJS y PDFKit para consolidar balances de materia prima, valorización de inventarios y pérdidas de merma por línea de proceso.",
      features: [
        "Exportación a hojas de cálculo Excel filtrable por fechas, lotes y proveedores",
        "Generación de reportes PDF ejecutivos listos para imprimir y firmar",
        "Gráficos de evolución de consumo de resinas vs toneladas producidas",
        "Indicadores de costo por kilogramo de merma no aprovechable"
      ],
      apiEndpoint: "GET /api/reports/monthly-balance"
    }
  ];

  const current = modules[selectedModule];

  return (
    <section className="py-16 bg-slate-950/60 border-t border-b border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-800/60">
            Plan de Desarrollo de 2 Semanas
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-outfit mt-3 mb-4">
            Los 6 Módulos Centrales del Sistema
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Estructura modular dividida entre Backend (Persona A), Web (Persona B) y Móvil (Persona C) para entrega en paralelo.
          </p>
        </div>

        {/* Interactive Module Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Module Selector Sidebar */}
          <div className="lg:col-span-5 space-y-2">
            {modules.map((m, idx) => {
              const Icon = m.icon;
              const isSelected = selectedModule === idx;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedModule(idx)}
                  className={`w-full text-left p-4 rounded-xl transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-900/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected ? `bg-gradient-to-tr ${m.color} text-white` : 'bg-slate-800 text-slate-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {m.title}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">{m.subtitle}</span>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-cyan-400 translate-x-1' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>

          {/* Module Detailed Preview Panel */}
          <div className="lg:col-span-7">
            <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-700/80 shadow-2xl relative overflow-hidden">
              
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${current.color} p-0.5`}>
                    <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                      <current.icon className={`w-6 h-6 ${current.textColor}`} />
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{current.subtitle}</span>
                    <h3 className="text-xl font-extrabold text-white font-outfit">{current.title}</h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300">
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{current.apiEndpoint}</span>
                </div>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                {current.description}
              </p>

              <div className="border-t border-slate-800/80 pt-5 mb-6">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  Capacidades Técnicas & Reglas de Negocio
                </h5>
                <div className="space-y-2.5">
                  {current.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-300">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                <div className="text-slate-400">
                  <span className="font-semibold text-white">Equipo responsable: </span>
                  Persona A (API) + Persona B (Web) + Persona C (Móvil)
                </div>
                <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono text-[11px]">
                  Semana 1 & 2
                </span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
