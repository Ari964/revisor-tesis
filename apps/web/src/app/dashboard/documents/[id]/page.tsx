'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { FileText, CheckCircle2, AlertTriangle, Clock, XCircle, ArrowLeft, Layers, ShieldAlert, Quote, ThumbsUp, Edit2, ThumbsDown, Save, X } from 'lucide-react';
import Link from 'next/link';

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

  const handleFeedback = async (findingId: string, action: 'ACCEPTED' | 'MODIFIED' | 'DISCARDED', newText?: string) => {
    // In a real app this would POST to /api/review/feedback
    console.log('Feedback submitted:', { findingId, action, newText });
    setFeedbackStatus(prev => ({ ...prev, [findingId]: action }));
    if (action === 'MODIFIED') {
      setEditingFinding(null);
    }
  };

  useEffect(() => {
    if (params.id) {
      setLoading(true);
      apiClient<any>(`/documents/${params.id}`)
        .then((res) => {
          setDoc(res.data);
        })
        .catch((err) => {
          console.error(err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [params.id]);

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
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {doc.fileName}
            <span className={statusCfg.color}><StatusIcon className="w-4 h-4 inline mr-1" />{statusCfg.label}</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Subido el {new Date(doc.submittedAt).toLocaleDateString('es-PE')} • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 glass-card p-1 rounded-2xl w-full max-w-md">
        <button
          onClick={() => setActiveTab('revision')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'revision' ? 'bg-white dark:bg-surface-800 shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <Layers className="w-4 h-4" /> Revisión IA
        </button>
        <button
          onClick={() => setActiveTab('plagiarism')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'plagiarism' ? 'bg-white dark:bg-surface-800 shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <ShieldAlert className="w-4 h-4" /> Plagio
        </button>
        <button
          onClick={() => setActiveTab('citations')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'citations' ? 'bg-white dark:bg-surface-800 shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <Quote className="w-4 h-4" /> Citas
        </button>
      </div>

      {/* Content Area */}
      <div className="glass-card p-6 min-h-[400px] animate-slide-up">
        {activeTab === 'revision' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Layers className="w-5 h-5 text-primary-500" /> Hallazgos de Revisión</h2>
            {doc.findings && doc.findings.length > 0 ? (
              <div className="space-y-3 mt-4">
                {doc.findings.map((finding: any, idx: number) => {
                  const findingId = finding.id || idx.toString();
                  const currentStatus = feedbackStatus[findingId];
                  const isEditing = editingFinding === findingId;

                  return (
                    <div key={idx} className={`p-4 rounded-xl border transition-all ${currentStatus === 'DISCARDED' ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-60' :
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
                          {currentStatus && (
                            <span className={`text-xs font-semibold px-2 py-1 rounded-md ${currentStatus === 'ACCEPTED' ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/50' :
                                currentStatus === 'MODIFIED' ? 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/50' :
                                  'text-gray-700 bg-gray-200 dark:text-gray-400 dark:bg-gray-800'
                              }`}>
                              {currentStatus === 'ACCEPTED' ? 'Aceptado' : currentStatus === 'MODIFIED' ? 'Modificado' : 'Descartado'}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">Pág. {finding.pageNumber}</span>
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
                            <button onClick={() => handleFeedback(findingId, 'MODIFIED', feedbackText)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium">
                              <Save className="w-4 h-4" /> Guardar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className={`font-medium ${currentStatus === 'DISCARDED' ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                            {finding.suggestion || finding.title || finding.name || 'Hallazgo de IA'}
                          </h3>
                          <p className={`text-sm mt-2 whitespace-pre-line ${currentStatus === 'DISCARDED' ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {finding.explanation || finding.description || finding.details || finding.message || 'Sin descripción detallada.'}
                          </p>
                          {finding.originalText && (
                            <div className={`mt-3 p-3 rounded-lg text-sm italic border-l-2 ${currentStatus === 'DISCARDED' ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 text-gray-400' : 'bg-surface-100 dark:bg-surface-900 border-primary-400'}`}>
                              "{finding.originalText}"
                            </div>
                          )}
                        </>
                      )}

                      {/* Advisor Action Buttons */}
                      {!isEditing && (
                        <div className="mt-4 pt-3 border-t border-surface-200 dark:border-surface-700 flex items-center gap-2">
                          <button
                            onClick={() => handleFeedback(findingId, 'ACCEPTED')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${currentStatus === 'ACCEPTED' ? 'bg-emerald-500 text-white' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40'}`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" /> Aceptar
                          </button>
                          <button
                            onClick={() => {
                              setEditingFinding(findingId);
                              setFeedbackText(finding.suggestion + '\n\n' + finding.explanation);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${currentStatus === 'MODIFIED' ? 'bg-blue-500 text-white' : 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40'}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Modificar
                          </button>
                          <button
                            onClick={() => handleFeedback(findingId, 'DISCARDED')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${currentStatus === 'DISCARDED' ? 'bg-gray-500 text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" /> Descartar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No se han reportado hallazgos de revisión o el análisis está en curso.</p>
            )}
          </div>
        )}

        {activeTab === 'plagiarism' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-500" /> Alertas de Plagio</h2>
            {doc.plagiarismAlerts && doc.plagiarismAlerts.length > 0 ? (
              <div className="space-y-3 mt-4">
                {doc.plagiarismAlerts.map((alert: any, idx: number) => (
                  <div key={idx} className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-red-700 dark:text-red-400">Coincidencia detectada</span>
                      <span className="text-xs font-medium px-2 py-1 bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-full">
                        Similitud: {Math.round(alert.similarityScore * 100)}%
                      </span>
                    </div>
                    <p className="text-sm mt-2">{alert.matchedText}</p>
                    <a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-3 inline-block">
                      Fuente: {alert.sourceUrl}
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No se detectaron similitudes significativas o el análisis está en curso.</p>
            )}
          </div>
        )}

        {activeTab === 'citations' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Quote className="w-5 h-5 text-blue-500" /> Formato y Citas (APA)</h2>
            {doc.citationErrors && doc.citationErrors.length > 0 ? (
              <div className="space-y-3 mt-4">
                {doc.citationErrors.map((error: any, idx: number) => (
                  <div key={idx} className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300">{error.message}</p>
                    {error.context && (
                      <div className="mt-2 text-xs p-2 bg-white/50 dark:bg-black/20 rounded">
                        {error.context}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No se detectaron errores de citación o el análisis está en curso.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
