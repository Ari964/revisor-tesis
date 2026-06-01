'use client';

import { useState } from 'react';
import { Settings2, Cpu, Key, Database, Save, Server, ShieldCheck } from 'lucide-react';

type SettingsTab = 'system' | 'models' | 'api';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('system');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => setSaving(false), 800);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          Ajustes Avanzados
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Configuración del sistema, modelos de IA y parámetros de conexión</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full lg:w-64 space-y-1">
          <button
            onClick={() => setActiveTab('system')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'system' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-gray-600 hover:bg-surface-50 dark:hover:bg-surface-800'}`}
          >
            <Settings2 className="w-5 h-5" /> Sistema
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'models' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-gray-600 hover:bg-surface-50 dark:hover:bg-surface-800'}`}
          >
            <Cpu className="w-5 h-5" /> Modelos IA
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'api' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-gray-600 hover:bg-surface-50 dark:hover:bg-surface-800'}`}
          >
            <Key className="w-5 h-5" /> API Keys
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 glass-card p-6 min-h-[400px]">
          {activeTab === 'system' && (
            <div className="space-y-6 animate-slide-up">
              <h3 className="text-lg font-semibold border-b border-surface-200 dark:border-surface-700 pb-2">Parámetros Generales</h3>
              
              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium mb-1">Límite de subida (MB)</label>
                  <input type="number" className="input-field max-w-xs" defaultValue={50} />
                  <p className="text-xs text-gray-500 mt-1">Tamaño máximo permitido para los documentos PDF y DOCX.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Retención de documentos (Días)</label>
                  <input type="number" className="input-field max-w-xs" defaultValue={365} />
                  <p className="text-xs text-gray-500 mt-1">Tiempo que se mantendrán los archivos en el almacenamiento antes de ser depurados.</p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input type="checkbox" id="maintenance" className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600" />
                  <label htmlFor="maintenance" className="text-sm font-medium">Activar Modo Mantenimiento</label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-6 animate-slide-up">
              <h3 className="text-lg font-semibold border-b border-surface-200 dark:border-surface-700 pb-2">Configuración de LLM y Embeddings</h3>
              
              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium mb-1">Modelo Principal (Análisis Semántico)</label>
                  <select className="input-field">
                    <option>gemini-1.5-pro</option>
                    <option>gemini-1.5-flash</option>
                    <option>gpt-4-turbo</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Umbral de Plagio (%)</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="100" defaultValue="20" className="flex-1" />
                    <span className="font-semibold text-primary-600 w-12">20%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Porcentaje de coincidencia a partir del cual se genera una alerta automática.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Temperatura</label>
                  <input type="number" step="0.1" className="input-field max-w-xs" defaultValue={0.1} />
                  <p className="text-xs text-gray-500 mt-1">Valores bajos (0.1 - 0.3) garantizan revisiones más deterministas y objetivas.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-6 animate-slide-up">
              <h3 className="text-lg font-semibold border-b border-surface-200 dark:border-surface-700 pb-2">Credenciales y Conexiones</h3>
              
              <div className="space-y-4 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-500"/> Pinecone API Key
                  </label>
                  <input type="password" className="input-field" defaultValue="************************" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                    <Server className="w-4 h-4 text-orange-500"/> OpenAI / Google AI Studio Key
                  </label>
                  <input type="password" className="input-field" defaultValue="************************" />
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 p-4 rounded-xl mt-4">
                  <p className="text-sm text-orange-800 dark:text-orange-300 flex items-start gap-2">
                    <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    Las credenciales se encriptan antes de almacenarse en la base de datos. Solo administradores autorizados pueden modificarlas.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-4 border-t border-surface-200 dark:border-surface-700 flex justify-end">
            <button 
              onClick={handleSave} 
              className="btn-primary flex items-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
