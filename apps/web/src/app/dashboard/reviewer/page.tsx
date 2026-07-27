'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  FileText, Upload, RefreshCw, AlertTriangle, CheckCircle2,
  XCircle, FileUp, Sparkles, BookOpen, Info, HelpCircle, ArrowRight
} from 'lucide-react';

const PRESET_PROMPTS = [
  {
    label: 'Rigor y Estilo APA 7',
    text: 'Verifica la concordancia con las pautas de estilo APA 7ma edición. Específicamente, comprueba el formato de las citas en el texto, que los títulos estén adecuadamente jerarquizados y que las referencias bibliográficas cuenten con enlace DOI cuando corresponda.'
  },
  {
    label: 'Coherencia Metodológica',
    text: 'Verifica la coherencia lógica interna entre: la formulación del problema, el objetivo general, la hipótesis principal, las variables operacionalizadas y el diseño metodológico propuesto.'
  },
  {
    label: 'Verificación de Estructura de Tesis',
    text: 'Asegúrate de que no falten los capítulos obligatorios (Introducción, Marco Teórico, Metodología, Resultados, Discusión, Conclusiones y Recomendaciones) y que el resumen contenga el objetivo, método, resultados y conclusiones en un solo párrafo.'
  },
  {
    label: 'Rigor de Artículo Científico',
    text: 'Evalúa la estructura bajo el formato IMRD (Introducción, Metodología, Resultados y Discusión). Comprueba que la sección de Métodos contenga suficiente detalle estadístico y tecnológico, y que los Resultados respondan directamente a la pregunta de investigación.'
  }
];

export default function ReviewerPage() {
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<'THESIS' | 'FINAL_THESIS' | 'ARTICLE'>('THESIS');
  
  // Template settings
  const [templateSource, setTemplateSource] = useState<'SAVED' | 'UPLOAD' | 'NONE'>('SAVED');
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [uploadedTemplateFile, setUploadedTemplateFile] = useState<File | null>(null);
  
  // Custom prompt
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Review Status
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState('');
  const [report, setReport] = useState<any>(null);

  // Drag and drop states
  const [dragOverDraft, setDragOverDraft] = useState(false);
  const [dragOverTemplate, setDragOverTemplate] = useState(false);

  // Fetch saved templates when documentType changes
  useEffect(() => {
    setSavedTemplates([]);
    setSelectedTemplateId('');
    
    // In database THESIS map to THESIS type, FINAL_THESIS map to FINAL_THESIS
    const fetchType = documentType;
    apiClient<{ success: boolean; data: any[] }>(`/generator/templates?type=${fetchType}`)
      .then((res) => {
        if (res.success && res.data) {
          setSavedTemplates(res.data);
        }
      })
      .catch((err) => console.error('Error fetching templates:', err));
  }, [documentType]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentFile) return;

    setLoading(true);
    setError('');
    setReport(null);
    setLoadingStep('Subiendo documentos y analizando estilos estructurales...');

    const formData = new FormData();
    formData.append('documentFile', documentFile);
    formData.append('documentType', documentType);
    if (customPrompt) {
      formData.append('customPrompt', customPrompt);
    }

    if (templateSource === 'UPLOAD' && uploadedTemplateFile) {
      formData.append('templateFile', uploadedTemplateFile);
    } else if (templateSource === 'SAVED' && selectedTemplateId) {
      formData.append('templateId', selectedTemplateId);
    }

    try {
      // Small steps simulation for premium feel
      setTimeout(() => setLoadingStep('Analizando concordancia con la plantilla...'), 3500);
      setTimeout(() => setLoadingStep('Evaluando formato de tipografía y márgenes...'), 7000);
      setTimeout(() => setLoadingStep('Ejecutando revisión de pautas personalizadas mediante IA...'), 11000);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/generator/review-document`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Error en el análisis (${response.status})`);
      }

      const resData = await response.json();
      if (resData.success && resData.data) {
        setReport(resData.data);
      } else {
        throw new Error('Estructura de reporte no válida recibida del servidor.');
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo completar la revisión del documento.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'PARTIALLY_COMPLIANT':
        return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
      case 'NON_COMPLIANT':
        return 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30';
      case 'NOT_FOUND':
        return 'bg-gray-100 text-gray-600 border border-gray-250 dark:bg-surface-800 dark:text-gray-400 dark:border-surface-700';
      default:
        return 'bg-gray-50 text-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLIANT': return 'Cumple';
      case 'PARTIALLY_COMPLIANT': return 'Parcial';
      case 'NON_COMPLIANT': return 'No Cumple';
      case 'NOT_FOUND': return 'No Encontrado';
      default: return status;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Revisor con Plantillas</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Evalúa el rigor y cumplimiento de tu documento borrador frente a una plantilla específica e indicaciones personalizadas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Formulario Izquierda (40%) */}
        <form onSubmit={handleReviewSubmit} className="lg:col-span-5 glass-card p-6 space-y-5 border border-surface-200 dark:border-surface-700 bg-surface-50/50">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Configuración de la Revisión</h3>
            <p className="text-xs text-gray-400 mt-0.5">Sube el borrador y vincula la plantilla para comparar estilos y contenido.</p>
          </div>

          {/* Tipo de Documento */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Tipo de Documento</label>
            <div className="flex space-x-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDocumentType('THESIS')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${documentType === 'THESIS' ? 'bg-white dark:bg-surface-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Proyecto Tesis
              </button>
              <button
                type="button"
                onClick={() => setDocumentType('FINAL_THESIS')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${documentType === 'FINAL_THESIS' ? 'bg-white dark:bg-surface-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Tesis
              </button>
              <button
                type="button"
                onClick={() => setDocumentType('ARTICLE')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${documentType === 'ARTICLE' ? 'bg-white dark:bg-surface-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                Artículo
              </button>
            </div>
          </div>

          {/* Documento Borrador (DRAFT) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Documento Borrador a Revisar (.docx o .pdf)</label>
            <div
              className={`border-2 border-dashed transition-all duration-200 cursor-pointer rounded-xl p-5 text-center ${dragOverDraft ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/10' : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900'}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverDraft(true); }}
              onDragLeave={() => setDragOverDraft(false)}
              onDrop={(e) => { e.preventDefault(); setDragOverDraft(false); const file = e.dataTransfer.files?.[0]; if (file) setDocumentFile(file); }}
              onClick={() => document.getElementById('draft-file-input')?.click()}
            >
              <input id="draft-file-input" type="file" className="hidden" accept=".docx,.pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) setDocumentFile(file); }} />
              <FileUp className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-xs font-semibold truncate px-2">
                {documentFile ? documentFile.name : "Seleccionar borrador académico"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">Formatos soportados: Word (.docx), PDF (.pdf)</p>
            </div>
          </div>

          {/* Configuración de Plantilla */}
          <div className="space-y-2 pt-2 border-t border-surface-200 dark:border-surface-700">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Vincular Plantilla de Referencia</label>
            <div className="grid grid-cols-3 gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTemplateSource('SAVED')}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${templateSource === 'SAVED' ? 'bg-white dark:bg-surface-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Guardada
              </button>
              <button
                type="button"
                onClick={() => setTemplateSource('UPLOAD')}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${templateSource === 'UPLOAD' ? 'bg-white dark:bg-surface-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Subir
              </button>
              <button
                type="button"
                onClick={() => setTemplateSource('NONE')}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition-all ${templateSource === 'NONE' ? 'bg-white dark:bg-surface-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Ninguna
              </button>
            </div>

            {/* Condicionales por origen de plantilla */}
            {templateSource === 'SAVED' && (
              <div className="space-y-1 animate-fade-in">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  required={templateSource === 'SAVED'}
                >
                  <option value="">-- Seleccionar Plantilla Guardada --</option>
                  {savedTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.fileName})
                    </option>
                  ))}
                </select>
                {savedTemplates.length === 0 && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                    No hay plantillas guardadas para este tipo de documento.
                  </p>
                )}
              </div>
            )}

            {templateSource === 'UPLOAD' && (
              <div
                className={`border-2 border-dashed transition-all duration-200 cursor-pointer rounded-xl p-4 text-center animate-fade-in ${dragOverTemplate ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/10' : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverTemplate(true); }}
                onDragLeave={() => setDragOverTemplate(false)}
                onDrop={(e) => { e.preventDefault(); setDragOverTemplate(false); const file = e.dataTransfer.files?.[0]; if (file) setUploadedTemplateFile(file); }}
                onClick={() => document.getElementById('template-file-input')?.click()}
              >
                <input id="template-file-input" type="file" className="hidden" accept=".docx,.pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) setUploadedTemplateFile(file); }} />
                <BookOpen className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                <p className="text-[11px] font-semibold truncate px-2">
                  {uploadedTemplateFile ? uploadedTemplateFile.name : "Subir plantilla referencial"}
                </p>
                <p className="text-[9px] text-gray-400 mt-0.5">Archivos: .docx o .pdf</p>
              </div>
            )}

            {templateSource === 'NONE' && (
              <div className="p-3 bg-surface-100/50 dark:bg-surface-800/40 border border-surface-200 dark:border-surface-700 rounded-xl text-center animate-fade-in flex items-center gap-2">
                <Info className="w-4 h-4 text-primary-500 shrink-0" />
                <span className="text-[10px] text-gray-500 text-left">
                  Se utilizará la estructura y pautas estándar del formato académico seleccionado.
                </span>
              </div>
            )}
          </div>

          {/* Indicaciones personalizadas */}
          <div className="space-y-1.5 pt-2 border-t border-surface-200 dark:border-surface-700">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Instrucciones de Revisión IA</label>
              <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" title="Define reglas o requisitos específicos que la IA deba buscar en tu texto borrador." />
            </div>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Ej: Asegúrate de que el objetivo general esté redactado con un verbo en infinitivo y que concuerde con el título de la investigación..."
              className="w-full px-3 py-2 text-xs bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
              rows={4}
            />

            {/* Presets */}
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Pautas Rápidas</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCustomPrompt(p.text)}
                    className="px-2 py-1 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-[10px] font-semibold rounded-lg text-gray-600 dark:text-gray-300 border border-surface-200/50 dark:border-surface-705 transition-all truncate max-w-[140px]"
                    title={p.text}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Errors */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/10 p-3 rounded-xl text-xs border border-red-200/50">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action button */}
          <button
            type="submit"
            disabled={loading || !documentFile}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-750 text-white rounded-xl text-sm font-semibold shadow-md shadow-primary-500/15 transition-all flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed text-center"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Revisando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analizar Documento
              </>
            )}
          </button>
        </form>

        {/* Reporte Derecha (60%) */}
        <div className="lg:col-span-7 glass-card p-6 border border-surface-200 dark:border-surface-700 min-h-[580px] bg-white dark:bg-surface-900 flex flex-col justify-between">
          
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center flex-1 space-y-6 text-center animate-pulse py-12">
              <div className="w-16 h-16 bg-primary-50 dark:bg-primary-950/20 rounded-2xl flex items-center justify-center text-primary-600">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">Ejecutando Revisión de Documento</h3>
                <p className="text-xs text-gray-400 max-w-sm">La inteligencia artificial está contrastando los capítulos, secciones y estilos de tu borrador.</p>
              </div>
              <div className="bg-surface-50 dark:bg-surface-800/40 p-4 rounded-xl border border-surface-200 dark:border-surface-700 w-full max-w-md mx-auto">
                <p className="text-[10px] uppercase font-bold text-primary-600 tracking-wider">Estado del Proceso</p>
                <p className="text-xs font-semibold mt-1 text-gray-700 dark:text-gray-300">
                  {loadingStep}
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !report && (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 py-16 text-center">
              <div className="w-14 h-14 bg-surface-50 dark:bg-surface-800 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 mb-3 border border-surface-200/50 dark:border-surface-700">
                <FileText className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-350">Esperando Análisis</h4>
              <p className="text-xs text-gray-500 max-w-xs mt-1">Configura el entorno en el panel izquierdo y haz clic en &quot;Analizar Documento&quot; para generar el reporte detallado.</p>
            </div>
          )}

          {/* Report Display */}
          {!loading && report && (
            <div className="flex-1 space-y-6">
              
              {/* Compliance score card */}
              <div className="flex items-center justify-between pb-4 border-b border-surface-200 dark:border-surface-700 gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 rounded-full flex items-center justify-center bg-surface-50 dark:bg-surface-800 border-4 border-primary-100 dark:border-primary-950/20 shadow-sm">
                    <span className="text-lg font-extrabold text-primary-600 dark:text-primary-400">
                      {report.compliancePercentage}%
                    </span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-800 dark:text-gray-150">Reporte de Conformidad</h3>
                    <p className="text-xs text-gray-400">Evaluación del borrador académico contra la plantilla</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-450 px-2.5 py-1 rounded-full border border-emerald-150">
                    <CheckCircle2 className="w-3 h-3" /> Completado
                  </span>
                </div>
              </div>

              {/* Executive summary */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide">Resumen Ejecutivo</h4>
                <div className="p-4 bg-surface-50 dark:bg-surface-950 rounded-xl text-xs text-gray-650 dark:text-gray-300 leading-relaxed border border-surface-200/50 dark:border-surface-750">
                  {report.summary}
                </div>
              </div>

              {/* Structure Check */}
              {report.structureEvaluation && report.structureEvaluation.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide">Cumplimiento de Estructura de Secciones</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {report.structureEvaluation.map((item: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl space-y-1 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate max-w-[170px]">{item.sectionName}</span>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${getStatusBadgeClass(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
                          {item.observations}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Styles check */}
              {report.styleEvaluation && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide">Validación de Estilos de Formato</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Font family */}
                    {report.styleEvaluation.fontFamily && (
                      <div className="p-3 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl space-y-1 shadow-sm">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Tipografía</span>
                        <div className="flex flex-col text-[11px]">
                          <span className="truncate">Esperada: <strong>{report.styleEvaluation.fontFamily.expected}</strong></span>
                          <span className="truncate">Detectada: <strong>{report.styleEvaluation.fontFamily.actual}</strong></span>
                        </div>
                        <span className={`inline-block px-1.5 py-0.5 rounded-lg text-[9px] font-bold mt-1.5 ${getStatusBadgeClass(report.styleEvaluation.fontFamily.status)}`}>
                          {getStatusLabel(report.styleEvaluation.fontFamily.status)}
                        </span>
                      </div>
                    )}

                    {/* Line spacing */}
                    {report.styleEvaluation.lineSpacing && (
                      <div className="p-3 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl space-y-1 shadow-sm">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Interlineado</span>
                        <div className="flex flex-col text-[11px]">
                          <span className="truncate">Esperado: <strong>{report.styleEvaluation.lineSpacing.expected}</strong></span>
                          <span className="truncate">Detectado: <strong>{report.styleEvaluation.lineSpacing.actual}</strong></span>
                        </div>
                        <span className={`inline-block px-1.5 py-0.5 rounded-lg text-[9px] font-bold mt-1.5 ${getStatusBadgeClass(report.styleEvaluation.lineSpacing.status)}`}>
                          {getStatusLabel(report.styleEvaluation.lineSpacing.status)}
                        </span>
                      </div>
                    )}

                    {/* Margins */}
                    {report.styleEvaluation.margins && (
                      <div className="p-3 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl space-y-1 shadow-sm">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Márgenes</span>
                        <div className="flex flex-col text-[11px]">
                          <span className="truncate">Esperados: <strong>{report.styleEvaluation.margins.expected}</strong></span>
                          <span className="truncate">Detectados: <strong>{report.styleEvaluation.margins.actual}</strong></span>
                        </div>
                        <span className={`inline-block px-1.5 py-0.5 rounded-lg text-[9px] font-bold mt-1.5 ${getStatusBadgeClass(report.styleEvaluation.margins.status)}`}>
                          {getStatusLabel(report.styleEvaluation.margins.status)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Custom Rules Check */}
              {report.customRulesEvaluation && report.customRulesEvaluation.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide">Pautas Personalizadas</h4>
                  <div className="space-y-2">
                    {report.customRulesEvaluation.map((rule: any, idx: number) => (
                      <div key={idx} className="flex gap-2.5 items-start p-3 bg-surface-50 dark:bg-surface-850 border border-surface-200/50 dark:border-surface-700 rounded-xl text-xs">
                        {rule.status === 'COMPLIANT' ? (
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                        ) : rule.status === 'NON_COMPLIANT' ? (
                          <XCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4.5 h-4.5 text-gray-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-bold text-gray-750 dark:text-gray-200">{rule.rule}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{rule.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations list */}
              {report.recommendations && report.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-400 uppercase tracking-wide">Recomendaciones del Revisor IA</h4>
                  <ul className="space-y-1.5">
                    {report.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="flex gap-2 items-start text-xs text-gray-750 dark:text-gray-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0 mt-1.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          )}

          {/* Footer info */}
          <div className="mt-6 pt-3 border-t border-surface-100 dark:border-surface-800 flex items-center gap-2 text-[11px] text-gray-400">
            <Info className="w-3.5 h-3.5 shrink-0 text-primary-500" />
            <span>Los análisis son complementarios e informativos. Utiliza el criterio del docente o asesor para el dictamen final.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
