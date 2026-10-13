import React, { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

export const ApiDocsView: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const endpoints = [
    {
      id: 'ep-login',
      method: 'POST',
      path: '/api/auth/login',
      title: 'Autenticación & JWT Tokens',
      desc: 'Valida credenciales y retorna access token con rol y turno.',
      body: `{
  "email": "admin@plastcontrol.com",
  "password": "password123"
}`,
      response: `{
  "accessToken": "eyJhbGciOiJIUzI1Ni...",
  "refreshToken": "d8a7c6b5...",
  "user": {
    "id": "usr-001",
    "name": "Carlos Mendoza",
    "email": "admin@plastcontrol.com",
    "role": "ADMIN"
  }
}`
    },
    {
      id: 'ep-materials',
      method: 'GET',
      path: '/api/raw-materials',
      title: 'Consulta de Materias Primas & Silos',
      desc: 'Lista polímeros (HDPE, LDPE, PP, etc.), nivel de stock y estado de silo.',
      body: null,
      response: `[
  {
    "id": "mat-001",
    "code": "HDPE-5502",
    "name": "Polietileno de Alta Densidad",
    "type": "RESINA",
    "category": "SOPLADO",
    "density": 0.955,
    "meltFlowIndex": 0.35,
    "currentStockKg": 18450,
    "minStockKg": 6000,
    "siloLocation": "Silo A-01",
    "status": "OPTIMO"
  }
]`
    },
    {
      id: 'ep-entries',
      method: 'POST',
      path: '/api/entries',
      title: 'Registro de Entrada en Báscula',
      desc: 'Registra un camión/lote y actualiza el stock físico del silo.',
      body: `{
  "materialId": "mat-001",
  "supplierName": "Braskem Química",
  "supplierBatch": "BRK-8921-X",
  "quantityKg": 8000,
  "invoiceNumber": "F001-92384",
  "qualityCertificatePassed": true
}`,
      response: `{
  "success": true,
  "entryId": "ent-092",
  "newStockKg": 26450,
  "message": "Stock de Silo A-01 actualizado correctamente"
}`
    },
    {
      id: 'ep-scrap',
      method: 'POST',
      path: '/api/production/scrap',
      title: 'Balance de Masa & Registro de Merma',
      desc: 'Guarda mermas y retorna % de merma neta y material molible.',
      body: `{
  "productionOrderId": "OP-EXT-402",
  "rawMaterialUsedKg": 1250,
  "finishedProductKg": 1180,
  "recoverableScrapKg": 55,
  "discardScrapKg": 15,
  "cause": "Calibración de cabezal de extrusora"
}`,
      response: `{
  "scrapPercentage": 5.60,
  "recoverableAddedToStockKg": 55,
  "status": "RECORDED"
}`
    }
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h2 className="text-2xl font-extrabold text-white font-outfit">
              Contrato de API REST (`API.md`)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Contrato acordado para que Persona A (NestJS) y Persona C (Expo Mobile) desarrollen en paralelo sin bloqueos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-cyan-400">
            Base URL: http://localhost:3000/api
          </span>
        </div>
      </div>

      {/* Endpoints List */}
      <div className="space-y-6">
        {endpoints.map((ep) => (
          <div key={ep.id} className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-1 rounded-md text-xs font-extrabold font-mono ${
                  ep.method === 'POST' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  ep.method === 'GET' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                  'bg-amber-500/20 text-amber-300'
                }`}>
                  {ep.method}
                </span>
                <span className="text-sm sm:text-base font-bold font-mono text-white">
                  {ep.path}
                </span>
              </div>

              <span className="text-xs font-semibold text-slate-400">
                {ep.title}
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-4">{ep.desc}</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Request Payload */}
              {ep.body && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Request Body (JSON)
                    </span>
                    <button
                      onClick={() => handleCopy(ep.id + '-body', ep.body!)}
                      className="text-slate-400 hover:text-cyan-400 text-xs flex items-center gap-1"
                    >
                      {copiedId === ep.id + '-body' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === ep.id + '-body' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-cyan-300 overflow-x-auto p-2 bg-slate-900/50 rounded-lg">
                    {ep.body}
                  </pre>
                </div>
              )}

              {/* Response Payload */}
              <div className={`p-3.5 rounded-xl bg-slate-950 border border-slate-800 ${!ep.body ? 'lg:col-span-2' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    Response `200 OK`
                  </span>
                  <button
                    onClick={() => handleCopy(ep.id + '-res', ep.response)}
                    className="text-slate-400 hover:text-cyan-400 text-xs flex items-center gap-1"
                  >
                    {copiedId === ep.id + '-res' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === ep.id + '-res' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto p-2 bg-slate-900/50 rounded-lg">
                  {ep.response}
                </pre>
              </div>

            </div>

          </div>
        ))}
      </div>

    </section>
  );
};
