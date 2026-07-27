'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
  Clock, CheckCircle2, XCircle, ArrowLeft, Layers,
  ShieldAlert, Quote, ThumbsUp, Edit2, ThumbsDown, Save, X
} from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ReviewPDFReport } from './components/ReviewPDFReport';
import { FileDown } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  UPLOADED: { label: 'Subido', color: 'badge-info', icon: Clock },
  EXTRACTING: { label: 'Extrayendo', color: 'badge-info', icon: Clock },
  VECTORIZING: { label: 'Vectorizando', color: 'badge-minor', icon: Clock },
  ANALYZING: { label: 'Analizando IA', color: 'badge-major', icon: Clock },
  REVIEWED: { label: 'Revisado', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold', icon: CheckCircle2 },
  ERROR: { label: 'Error', color: 'badge-critical', icon: XCircle },
};

type TabId = 'revision' | 'plagiarism' | 'citations';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('revision');

  // Feedback state
  const [editingFinding, setEditingFinding] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<Record<string, 'ACCEPTED' | 'MODIFIED' | 'DISCARDED'>>({});

  // Ref para el Polling
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchDocumentData = useCallback(async (showLoader = false) => {
    if (!params.id) return;
    if (showLoader) setLoading(true);

    try {
      const res = await apiClient<any>(`/documents/${params.id}`);
      setDoc(res.data);

      if (res.data?.status === 'REVIEWED' || res.data?.status === 'ERROR') {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
          pollingInterval.current = null;
        }
      }
    } catch (err) {
      console.error("Error cargando el documento:", err);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchDocumentData(true);

    pollingInterval.current = setInterval(() => {
      fetchDocumentData(false);
    }, 4000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [fetchDocumentData]);

  const handleFeedback = async (findingId: string, action: 'ACCEPTED' | 'MODIFIED' | 'DISCARDED', newText?: string) => {
    console.log('Feedback enviado:', { findingId, action, newText });
    setFeedbackStatus(prev => ({ ...prev, [findingId]: action }));
    if (action === 'MODIFIED') {
      setEditingFinding(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Documento no encontrado</h2>
        <button onClick={() => router.back()} className="mt-4 text-primary-600 hover:underline">Volver</button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.UPLOADED;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-surface-200 dark:border-surface-700 pb-5">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {doc.fileName}
              <span className={`${statusCfg.color} inline-flex items-center`}>
                <StatusIcon className="w-4 h-4 mr-1" />
                {statusCfg.label}
              </span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Subido el {new Date(doc.submittedAt).toLocaleDateString('es-PE')} • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
              {doc.overallScore != null && <span className="ml-3 font-semibold text-primary-600">• Nota global: {doc.overallScore}/20</span>}
            </p>
          </div>
        </div>

        {/* Botón de exportación a PDF añadido estratégicamente a la derecha */}
        <div className="flex items-center">
          <PDFDownloadLink
            document={<ReviewPDFReport doc={doc} />}
            fileName={`Informe-Revision-${doc.fileName.replace(/\.[^/.]+$/, "")}.pdf`}
          >
            {({ blob, url, loading, error }) => (
              <button
                disabled={loading}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200 text-white
                  ${loading
                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-600/10'
                  }`}
              >
                <Clock className={`w-4 h-4 ${loading ? 'animate-spin' : 'hidden'}`} />
                <span>{loading ? 'Generando reporte...' : 'Descargar Informe PDF'}</span>
              </button>
            )}
          </PDFDownloadLink>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 glass-card p-1 rounded-2xl w-full max-w-md">
        {(['revision', 'plagiarism', 'citations'] as const).map((tab) => {
          const tabLabels = {
            revision: { label: 'Revisión IA', icon: Layers },
            plagiarism: { label: 'Plagio', icon: ShieldAlert },
            citations: { label: 'Citas', icon: Quote }
          };
          const Icon = tabLabels[tab].icon;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === tab ? 'bg-white dark:bg-surface-800 shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <Icon className="w-4 h-4" /> {tabLabels[tab].label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="glass-card p-6 min-h-[400px] animate-slide-up">

        {/* TAB 1: REVISIÓN IA */}
        {activeTab === 'revision' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary-500" /> Hallazgos de Revisión
            </h2>
            {doc.findings && doc.findings.length > 0 ? (
              <div className="space-y-3 mt-4">
                {doc.findings.map((finding: any, idx: number) => {
                  const findingId = finding.id || idx.toString();
                  const currentStatus = feedbackStatus[findingId];
                  const isEditing = editingFinding === findingId;

                  return (
                    <div key={findingId} className={`p-4 rounded-xl border transition-all ${currentStatus === 'DISCARDED' ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60' :
                      currentStatus === 'ACCEPTED' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50' :
                        currentStatus === 'MODIFIED' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50' :
                          'bg-surface-50 dark:bg-surface-800 border-surface-200 dark:border-surface-700'
                      }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${finding.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            finding.severity === 'MAJOR' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                            {finding.severity}
                          </span>
                          {finding.category && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-gray-300">
                              {finding.category}
                            </span>
                          )}
                          {currentStatus && (
                            <span className={`text-xs font-semibold px-2 py-1 rounded-md ${currentStatus === 'ACCEPTED' ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/50' : currentStatus === 'MODIFIED' ? 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/50' : 'text-gray-700 bg-gray-200 dark:text-gray-400 dark:bg-gray-800'}`}>
                              {currentStatus === 'ACCEPTED' ? 'Aceptado' : currentStatus === 'MODIFIED' ? 'Modificado' : 'Descartado'}
                            </span>
                          )}
                        </div>
                        {finding.affectedSection && (
                          <span className="text-xs text-gray-400 font-medium">Sección: {finding.affectedSection}</span>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-3 space-y-3">
                          <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            rows={3}
                          />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingFinding(null)} className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleFeedback(findingId, 'MODIFIED', feedbackText)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium">
                              <Save className="w-4 h-4" /> Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className={`font-semibold text-base ${currentStatus === 'DISCARDED' ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                            {finding.title}
                          </h3>
                          <p className={`text-sm mt-1 whitespace-pre-line ${currentStatus === 'DISCARDED' ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                            {finding.description}
                          </p>
                          {finding.instruction && (
                            <div className="mt-3 p-3 rounded-lg text-sm border-l-2 bg-surface-100 dark:bg-surface-900 border-primary-500 text-gray-700 dark:text-gray-300">
                              <span className="font-semibold block text-xs uppercase tracking-wider text-primary-600 mb-0.5">Instrucción de Corrección:</span>
                              "{finding.instruction}"
                            </div>
                          )}
                        </>
                      )}

                      {!isEditing && (
                        <div className="mt-4 pt-3 border-t border-surface-200 dark:border-surface-700 flex items-center gap-2">
                          <button onClick={() => handleFeedback(findingId, 'ACCEPTED')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${currentStatus === 'ACCEPTED' ? 'bg-emerald-500 text-white' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20'}`}>
                            <ThumbsUp className="w-3.5 h-3.5" /> Aceptar
                          </button>
                          <button onClick={() => { setEditingFinding(findingId); setFeedbackText(`${finding.title}\n\n${finding.description}`); }} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${currentStatus === 'MODIFIED' ? 'bg-blue-500 text-white' : 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20'}`}>
                            <Edit2 className="w-3.5 h-3.5" /> Modificar
                          </button>
                          <button onClick={() => handleFeedback(findingId, 'DISCARDED')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${currentStatus === 'DISCARDED' ? 'bg-gray-500 text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-400 dark:bg-gray-800'}`}>
                            <ThumbsDown className="w-3.5 h-3.5" /> Descartar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm mt-4">No se han reportado hallazgos de revisión o el análisis está en curso.</p>
            )}
          </div>
        )}

        {/* TAB 2: ALERTAS DE PLAGIO */}
        {activeTab === 'plagiarism' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Alertas de Plagio
            </h2>
            {doc.plagiarismAlerts && doc.plagiarismAlerts.length > 0 ? (
              <div className="space-y-3 mt-4">
                {doc.plagiarismAlerts.map((alert: any, idx: number) => (
                  <div key={alert.id || idx} className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-red-700 dark:text-red-400 text-sm">Coincidencia en Base de Datos Vectorial</span>
                      <span className="text-xs font-bold px-2 py-1 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-full">
                        Similitud: {Math.round(alert.similarityScore * 100)}%
                      </span>
                    </div>
                    <p className="text-sm mt-2 text-gray-700 dark:text-gray-300 italic bg-white dark:bg-surface-900/50 p-3 rounded-lg border border-red-200/40">
                      "{alert.matchedText}"
                    </p>
                    {alert.sourceUrl && (
                      <a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-3 inline-block font-medium">
                        Ver Documento Fuente original ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm mt-4">No se detectaron similitudes significativas o el análisis está en curso.</p>
            )}
          </div>
        )}

        {/* TAB 3: VALIDACIÓN DE CITAS */}
        {activeTab === 'citations' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Quote className="w-5 h-5 text-blue-500" /> Formato y Citas Bibliográficas
            </h2>
            {doc.citationValidations && doc.citationValidations.length > 0 ? (
              <div className="space-y-3 mt-4">
                {doc.citationValidations.map((validation: any, idx: number) => (
                  <div key={validation.id || idx} className={`p-4 rounded-xl border ${validation.isValid ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`font-semibold text-sm ${validation.isValid ? 'text-emerald-800 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400'}`}>
                        {validation.isValid ? '✓ Cita Verificada (CrossRef)' : '⚠️ Inconsistencia Detectada'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{validation.citationText}</p>
                    {validation.errorMessage && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-mono">Detalle: {validation.errorMessage}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm mt-4">No se encontraron citas registradas o el análisis automático está en curso.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}