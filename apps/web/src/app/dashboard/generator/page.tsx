'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  FilePlus2, RefreshCw, Download, FileText, CheckCircle2, AlertTriangle,
  ArrowRight, BookOpen, Layers, User, Calendar, MapPin, Sparkles, BookMarked
} from 'lucide-react';

const STEPS = [
  { id: 0, label: 'Estructuración', desc: 'Analizando tema y definiendo objetivos de investigación...' },
  { id: 1, label: 'Preliminares', desc: 'Generando páginas preliminares, dedicatoria y resumen...' },
  { id: 2, label: 'Capítulo I', desc: 'Redactando realidad problemática, antecedentes y marco teórico...' },
  { id: 3, label: 'Capítulo II', desc: 'Estructurando materiales, operacionalización de variables y métodos...' },
  { id: 4, label: 'Capítulo III', desc: 'Calculando métricas, tablas de rendimiento y resultados...' },
  { id: 5, label: 'Capítulo IV y V', desc: 'Escribiendo contrastación científica, conclusiones y recomendaciones...' },
  { id: 6, label: 'Referencias y Anexos', desc: 'Construyendo 30 referencias APA v7, apéndices y formatos de la UNT...' }
];

export default function ThesisGeneratorPage() {
  // Form fields
  const [tema, setTema] = useState('');
  const [nombreAutor, setNombreAutor] = useState('');
  const [nombreAsesor, setNombreAsesor] = useState('');
  const [lineaInvestigacion, setLineaInvestigacion] = useState('Gestión de Proyectos de TIC');
  const [ciudad, setCiudad] = useState('Trujillo');
  const [anio, setAnio] = useState(new Date().getFullYear());

  // Generation status
  const [generating, setGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepMessage, setStepMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Generated document state
  const [thesisData, setThesisData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('prelims');
  const [exporting, setExporting] = useState<string | null>(null);

  const startGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tema.trim()) return;

    setGenerating(true);
    setError('');
    setThesisData(null);
    setCurrentStep(0);
    setStepMessage(STEPS[0].desc);

    let docState: any = {};

    try {
      // Step 0: Init
      const initRes = await apiClient<any>('/generator/init', {
        method: 'POST',
        body: JSON.stringify({
          tema: tema.trim(),
          metadata: {
            nombre_autor: nombreAutor.trim() || 'Estudiante UNT',
            nombre_asesor: nombreAsesor.trim() || 'Asesor Académico',
            linea_investigacion: lineaInvestigacion,
            ciudad: ciudad.trim() || 'Trujillo',
            anio: anio
          }
        })
      });

      if (!initRes.success || !initRes.data) {
        throw new Error('Fallo al inicializar la estructura de la tesis');
      }

      docState = { ...initRes.data };
      
      // Run steps 1 to 6
      for (let s = 1; s <= 6; s++) {
        setCurrentStep(s);
        setStepMessage(STEPS[s].desc);

        const stepRes = await apiClient<any>('/generator/generate-step', {
          method: 'POST',
          body: JSON.stringify({
            stepIndex: s,
            currentData: docState
          })
        });

        if (!stepRes.success || !stepRes.data) {
          throw new Error(`Fallo al generar el paso ${s}: ${STEPS[s].label}`);
        }

        // Merge generated data
        docState = { ...docState, ...stepRes.data };
      }

      setThesisData(docState);
      setSuccess('¡Tesis generada exitosamente!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error durante la generación. Reintente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format: 'docx' | 'pdf' | 'txt') => {
    if (!thesisData) return;
    setExporting(format);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/generator/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          thesisData,
          format
        })
      });

      if (!response.ok) {
        throw new Error('Fallo al descargar el archivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${thesisData.metadata?.titulo_proyecto?.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_borrador.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Error al exportar: ${err.message}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary-500 animate-pulse" />
          Generador de Tesis UNT
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Redacta un borrador completo y realista estructurado según las normas y capítulos exigidos por la Universidad Nacional de Trujillo
        </p>
      </div>

      {/* Main Container */}
      {!thesisData && !generating && (
        <div className="glass-card p-6 max-w-4xl mx-auto animate-slide-up">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-primary-500" />
            Configuración del Proyecto de Tesis
          </h2>

          <form onSubmit={startGeneration} className="space-y-5">
            {/* Tema input */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Tema o Idea de Investigación (Solo ingresando esto, el sistema creará toda la estructura y contenido)
              </label>
              <textarea
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                required
                rows={3}
                className="input-field w-full text-base"
                placeholder="Ej. Sistema de recomendación para cultivos de arroz usando machine learning para optimizar la cosecha..."
              />
            </div>

            {/* Custom metadata grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <User className="w-4 h-4 text-gray-400" /> Nombre del Autor (Estudiante)
                </label>
                <input
                  type="text"
                  value={nombreAutor}
                  onChange={(e) => setNombreAutor(e.target.value)}
                  className="input-field"
                  placeholder="Ej. Juan Pérez Medina"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <User className="w-4 h-4 text-gray-400" /> Nombre del Asesor
                </label>
                <input
                  type="text"
                  value={nombreAsesor}
                  onChange={(e) => setNombreAsesor(e.target.value)}
                  className="input-field"
                  placeholder="Ej. Carlos Alvarez Ríos"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                  <Layers className="w-4 h-4 text-gray-400" /> Línea de Investigación
                </label>
                <select
                  value={lineaInvestigacion}
                  onChange={(e) => setLineaInvestigacion(e.target.value)}
                  className="input-field"
                >
                  <option value="Gestión de Proyectos de TIC">Gestión de Proyectos de TIC</option>
                  <option value="Gestión de Gobierno y Servicios de TIC">Gestión de Gobierno y Servicios de TIC</option>
                  <option value="Gestión de Desarrollo de Software">Gestión de Desarrollo de Software</option>
                  <option value="Gestión de Infraestructura y Comunicaciones">Gestión de Infraestructura y Comunicaciones</option>
                  <option value="Gestión de la Seguridad de la Información">Gestión de la Seguridad de la Información</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                    <MapPin className="w-4 h-4 text-gray-400" /> Ciudad
                  </label>
                  <input
                    type="text"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    className="input-field"
                    placeholder="Trujillo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                    <Calendar className="w-4 h-4 text-gray-400" /> Año
                  </label>
                  <input
                    type="number"
                    value={anio}
                    onChange={(e) => setAnio(parseInt(e.target.value) || 2024)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!tema.trim()}
              className="btn-primary w-full py-3 text-base font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
            >
              <Sparkles className="w-5 h-5" />
              Generar Borrador Completo de Tesis
            </button>
          </form>
        </div>
      )}

      {/* Progress View */}
      {generating && (
        <div className="glass-card p-8 max-w-2xl mx-auto text-center space-y-6 animate-slide-up">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto text-primary-600 animate-bounce">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>

          <div>
            <h3 className="text-xl font-bold">Generando borrador de Tesis</h3>
            <p className="text-gray-400 text-sm mt-1">Por favor espera, la IA está redactando los capítulos detalladamente...</p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-surface-200 dark:bg-surface-700 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-primary-600 h-full transition-all duration-500 rounded-full"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>

          <div className="bg-surface-50 dark:bg-surface-800/50 p-4 rounded-xl border border-surface-200 dark:border-surface-700">
            <p className="text-xs uppercase font-semibold text-primary-500 tracking-wider">
              Paso {currentStep + 1} de {STEPS.length}: {STEPS[currentStep].label}
            </p>
            <p className="text-sm font-medium mt-1 text-gray-700 dark:text-gray-300">
              {stepMessage}
            </p>
          </div>
        </div>
      )}

      {/* Generated Results & Tab Viewer */}
      {thesisData && !generating && (
        <div className="space-y-6 animate-slide-up">
          {/* Success Banner */}
          {success && (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl text-sm font-semibold max-w-4xl mx-auto shadow-md">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              {success}
            </div>
          )}

          {/* Actions & Export Panel */}
          <div className="glass-card p-5 flex flex-col md:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
            <div>
              <h3 className="font-bold text-lg">{thesisData.metadata?.titulo_proyecto}</h3>
              <p className="text-xs text-gray-400">
                Autor: {thesisData.metadata?.nombre_autor} • Asesor: Dr. {thesisData.metadata?.nombre_asesor}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button
                onClick={() => handleExport('docx')}
                disabled={exporting !== null}
                className="btn-secondary flex-1 md:flex-none flex items-center justify-center gap-1.5 text-sm"
              >
                {exporting === 'docx' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                📄 DOCX
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={exporting !== null}
                className="btn-secondary flex-1 md:flex-none flex items-center justify-center gap-1.5 text-sm"
              >
                {exporting === 'pdf' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                📑 PDF
              </button>
              <button
                onClick={() => handleExport('txt')}
                disabled={exporting !== null}
                className="btn-secondary flex-1 md:flex-none flex items-center justify-center gap-1.5 text-sm"
              >
                {exporting === 'txt' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                📃 TXT
              </button>
              <button
                onClick={() => setThesisData(null)}
                className="btn-primary flex-1 md:flex-none flex items-center justify-center gap-1.5 text-sm"
              >
                Nueva Tesis
              </button>
            </div>
          </div>

          {/* Tab Viewer */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Sidebar list of tabs */}
            <div className="glass-card p-4 h-fit space-y-1">
              {[
                { key: 'prelims', label: '1. Páginas Preliminares', icon: FileText },
                { key: 'cap1', label: '2. Cap. I: Introducción', icon: BookOpen },
                { key: 'cap2', label: '3. Cap. II: Métodos', icon: Layers },
                { key: 'cap3', label: '4. Cap. III: Resultados', icon: BookMarked },
                { key: 'cap4_5', label: '5. Cap. IV y V: Conclusiones', icon: CheckCircle2 },
                { key: 'refs_ap', label: '6. Referencias y Anexos', icon: FileText }
              ].map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl text-left transition-all ${
                      activeTab === tab.key
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'hover:bg-surface-100 dark:hover:bg-surface-850'
                    }`}
                  >
                    <TabIcon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab content panel */}
            <div className="lg:col-span-3 glass-card p-6 min-h-[500px] prose dark:prose-invert max-w-none">
              {activeTab === 'prelims' && (
                <div className="space-y-6">
                  <h2>PÁGINAS PRELIMINARES</h2>
                  
                  <div>
                    <h4 className="text-xs uppercase text-primary-500 tracking-wider">Dedicatoria</h4>
                    <p className="italic text-right pl-12">"{thesisData.preliminares?.dedicatoria}"</p>
                  </div>
                  
                  <div>
                    <h4 className="text-xs uppercase text-primary-500 tracking-wider">Agradecimientos</h4>
                    <p>{thesisData.preliminares?.agradecimientos}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-xs uppercase text-primary-500 tracking-wider">Presentación al Jurado</h4>
                    <p>{thesisData.preliminares?.presentacion}</p>
                  </div>
                  
                  <div className="text-gray-900 dark:text-gray-150 bg-surface-100 dark:bg-surface-800 p-4 rounded-xl border border-surface-200 dark:border-surface-700">
                    <h4 className="text-xs uppercase text-primary-500 tracking-wider">Resumen</h4>
                    <p className="text-gray-800 dark:text-gray-200 mt-2">{thesisData.preliminares?.resumen}</p>
                    <p className="text-xs font-semibold mt-2 text-gray-600 dark:text-gray-400">Palabras clave: <span className="font-normal text-gray-800 dark:text-gray-200">{thesisData.preliminares?.palabras_clave}</span></p>
                  </div>
                  
                  <div className="text-gray-900 dark:text-gray-150 bg-surface-100 dark:bg-surface-800 p-4 rounded-xl border border-surface-200 dark:border-surface-700">
                    <h4 className="text-xs uppercase text-primary-500 tracking-wider">Abstract</h4>
                    <p className="italic text-gray-800 dark:text-gray-200 mt-2">{thesisData.preliminares?.abstract}</p>
                    <p className="text-xs font-semibold mt-2 text-gray-600 dark:text-gray-400">Keywords: <span className="font-normal text-gray-800 dark:text-gray-200">{thesisData.preliminares?.keywords}</span></p>
                  </div>
                </div>
              )}

              {activeTab === 'cap1' && (
                <div className="space-y-6">
                  <h2>CAPÍTULO I: INTRODUCCIÓN</h2>
                  <div>
                    <h4>1.1 Realidad Problemática</h4>
                    <p>{thesisData.capitulo1?.realidad_problematica}</p>
                  </div>
                  <div>
                    <h4>1.2 Antecedentes del Problema</h4>
                    <p>{thesisData.capitulo1?.antecedentes}</p>
                  </div>
                  <div>
                    <h4>1.3 Marco Teórico</h4>
                    <p>{thesisData.capitulo1?.marco_teorico}</p>
                  </div>
                  <div>
                    <h4>1.4 Justificación de la Investigación</h4>
                    <p>{thesisData.capitulo1?.justificacion}</p>
                  </div>
                  <div>
                    <h4>1.5 Enunciado del Problema</h4>
                    <p className="font-semibold text-lg">{thesisData.capitulo1?.enunciado_problema}</p>
                  </div>
                  <div>
                    <h4>1.6 Hipótesis</h4>
                    <p>{thesisData.capitulo1?.hipotesis}</p>
                  </div>
                  <div>
                    <h4>1.7 Objetivos</h4>
                    {thesisData.capitulo1?.objetivos && typeof thesisData.capitulo1.objetivos === 'object' ? (
                      <div className="space-y-2 mt-2">
                        <p className="text-gray-800 dark:text-gray-200">
                          <strong>Objetivo General:</strong> {thesisData.capitulo1.objetivos.general || thesisData.capitulo1.objetivos.general_objective || ''}
                        </p>
                        <p className="text-gray-800 dark:text-gray-200"><strong>Objetivos Específicos:</strong></p>
                        <ul className="list-disc pl-5 text-gray-850 dark:text-gray-250 space-y-1">
                          {(thesisData.capitulo1.objetivos.especificos || thesisData.capitulo1.objetivos.specific_objectives || []).map((obj: string, i: number) => (
                            <li key={i}>{obj}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-gray-800 dark:text-gray-200">{thesisData.capitulo1?.objetivos}</p>
                    )}
                  </div>
                  <div>
                    <h4>1.8 Limitaciones del Estudio</h4>
                    <p>{thesisData.capitulo1?.limitaciones}</p>
                  </div>
                </div>
              )}

              {activeTab === 'cap2' && (
                <div className="space-y-6">
                  <h2>CAPÍTULO II: MÉTODOS</h2>
                  <div>
                    <h4>2.1 Materiales</h4>
                    <h5>2.1.1 Objeto de estudio</h5>
                    <p>{thesisData.capitulo2?.materiales_objeto}</p>
                    
                    <h5>2.1.2 Recursos</h5>
                    <p>{thesisData.capitulo2?.materiales_recursos}</p>

                    {thesisData.capitulo2?.materiales_recursos_tabla && (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="bg-surface-100 dark:bg-surface-800">
                              <th className="px-4 py-2 text-left">Recurso</th>
                              <th className="px-4 py-2 text-left">Descripción</th>
                              <th className="px-4 py-2 text-left">Cantidad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {thesisData.capitulo2.materiales_recursos_tabla.map((r: any, i: number) => (
                              <tr key={i} className="border-t border-surface-200 dark:border-surface-700">
                                <td className="px-4 py-2 font-medium">{r.recurso}</td>
                                <td className="px-4 py-2">{r.descripcion}</td>
                                <td className="px-4 py-2">{r.cantidad}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4>2.2 Métodos</h4>
                    <h5>2.2.1 Tipo de investigación</h5>
                    <p>{thesisData.capitulo2?.tipo_investigacion}</p>
                    <h5>2.2.6 Variables y Operacionalización</h5>
                    <p>{thesisData.capitulo2?.variables_matriz}</p>
                    <h5>2.2.10 Procedimiento</h5>
                    <p>{thesisData.capitulo2?.procedimiento}</p>
                    <h5>2.2.11 Consideraciones éticas</h5>
                    <p>{thesisData.capitulo2?.consideraciones_eticas}</p>
                  </div>
                </div>
              )}

              {activeTab === 'cap3' && (
                <div className="space-y-6">
                  <h2>CAPÍTULO III: RESULTADOS</h2>
                  <div>
                    <h4>3.1 Análisis Exploratorio</h4>
                    <p>{thesisData.capitulo3?.analisis_exploratorio}</p>
                  </div>
                  <div>
                    <h4>3.2 Preprocesamiento</h4>
                    <p>{thesisData.capitulo3?.preprocesamiento}</p>
                  </div>
                  <div>
                    <h4>3.3 Entrenamiento y Evaluación de Modelos</h4>
                    <p>{thesisData.capitulo3?.entrenamiento_modelos}</p>

                    {thesisData.capitulo3?.entrenamiento_modelos_tabla && (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="bg-surface-100 dark:bg-surface-800">
                              <th className="px-3 py-2 text-left">Modelo</th>
                              <th className="px-3 py-2 text-center">Exactitud</th>
                              <th className="px-3 py-2 text-center">Precisión</th>
                              <th className="px-3 py-2 text-center">Sensibilidad</th>
                              <th className="px-3 py-2 text-center">F1</th>
                              <th className="px-3 py-2 text-center">TFP</th>
                              <th className="px-3 py-2 text-center">TVP</th>
                              <th className="px-3 py-2 text-center">MCC</th>
                            </tr>
                          </thead>
                          <tbody>
                            {thesisData.capitulo3.entrenamiento_modelos_tabla.map((r: any, i: number) => (
                              <tr key={i} className="border-t border-surface-200 dark:border-surface-700 text-center">
                                <td className="px-3 py-2 text-left font-medium">{r.modelo}</td>
                                <td className="px-3 py-2">{r.exactitud}</td>
                                <td className="px-3 py-2">{r.precision}</td>
                                <td className="px-3 py-2">{r.exhaustividad}</td>
                                <td className="px-3 py-2">{r.f1}</td>
                                <td className="px-3 py-2">{r.tfp}</td>
                                <td className="px-3 py-2">{r.tvp}</td>
                                <td className="px-3 py-2">{r.mcc}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4>3.4 Validación del Modelo</h4>
                    <p>{thesisData.capitulo3?.validacion_modelo}</p>
                  </div>
                </div>
              )}

              {activeTab === 'cap4_5' && (
                <div className="space-y-6">
                  <h2>CAPÍTULO IV: DISCUSIÓN</h2>
                  <p>{thesisData.capitulo4?.discusion}</p>

                  <h2 className="pt-6">CAPÍTULO V: CONCLUSIONES Y RECOMENDACIONES</h2>
                  <div>
                    <h4>5.1 Conclusiones</h4>
                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                      {thesisData.capitulo5?.conclusiones?.map((c: string, i: number) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h4>5.2 Recomendaciones</h4>
                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                      {thesisData.capitulo5?.recomendaciones?.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {activeTab === 'refs_ap' && (
                <div className="space-y-6">
                  <h2>REFERENCIAS BIBLIOGRÁFICAS</h2>
                  <div className="pl-6 text-sm space-y-3">
                    {thesisData.referencias?.map((r: string, i: number) => (
                      <p key={i} className="-indent-6 pl-6 text-gray-700 dark:text-gray-300">
                        {r}
                      </p>
                    ))}
                  </div>

                  <h2 className="pt-6">APÉNDICES Y ANEXOS</h2>
                  <div>
                    <h4>Apéndice A: Tabla Detallada de Antecedentes Internacionales</h4>
                    <p className="whitespace-pre-wrap text-sm bg-surface-50 dark:bg-surface-850 p-4 rounded-xl border border-surface-200 dark:border-surface-700">
                      {thesisData.apendices?.apendice_a}
                    </p>
                  </div>
                  <div>
                    <h4>Apéndice B: Descripción Textual del Árbol de Problemas</h4>
                    <p className="whitespace-pre-wrap text-sm bg-surface-50 dark:bg-surface-850 p-4 rounded-xl border border-surface-200 dark:border-surface-700">
                      {thesisData.apendices?.apendice_b}
                    </p>
                  </div>
                  <div>
                    <h4>Apéndice C: Descripción Textual del Árbol de Objetivos</h4>
                    <p className="whitespace-pre-wrap text-sm bg-surface-50 dark:bg-surface-850 p-4 rounded-xl border border-surface-200 dark:border-surface-700">
                      {thesisData.apendices?.apendice_c}
                    </p>
                  </div>
                  <div>
                    <h4>Anexo A: Distribución Chi-Cuadrado (χ²)</h4>
                    <p className="whitespace-pre-wrap text-sm">{thesisData.anexos?.anexo_a}</p>
                  </div>
                  <div>
                    <h4>Anexo B: Instrumentos y Formatos</h4>
                    <p className="whitespace-pre-wrap text-sm">{thesisData.anexos?.anexo_b}</p>
                  </div>
                  <div>
                    <h4>Anexo C: Declaración Jurada</h4>
                    <p className="whitespace-pre-wrap text-sm bg-surface-50 dark:bg-surface-850 p-4 rounded-xl border border-surface-200 dark:border-surface-700">
                      {thesisData.anexos?.anexo_c}
                    </p>
                  </div>
                  <div>
                    <h4>Anexo D: Carta de Autorización</h4>
                    <p className="whitespace-pre-wrap text-sm bg-surface-50 dark:bg-surface-850 p-4 rounded-xl border border-surface-200 dark:border-surface-700">
                      {thesisData.anexos?.anexo_d}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
