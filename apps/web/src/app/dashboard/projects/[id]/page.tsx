'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import Link from 'next/link';
import {
  ArrowLeft, FolderKanban, User2, Calendar, FileText, Clock,
  CheckCircle2, XCircle, AlertTriangle, BookTemplate, Layers,
  GraduationCap, Eye
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  UPLOADED: { label: 'Subido', color: 'badge-info', icon: Clock },
  EXTRACTING: { label: 'Extrayendo', color: 'badge-info', icon: Clock },
  VECTORIZING: { label: 'Vectorizando', color: 'badge-minor', icon: Clock },
  ANALYZING: { label: 'Analizando IA', color: 'badge-major', icon: Clock },
  REVIEWED: { label: 'Revisado', color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold', icon: CheckCircle2 },
  ERROR: { label: 'Error', color: 'badge-critical', icon: XCircle },
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id) {
      apiClient<any>(`/thesis/${params.id}`)
        .then((res) => {
          setProject(res.data);
        })
        .catch((err) => {
          setError(err.message || 'Error al cargar el proyecto');
        })
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <XCircle className="w-16 h-16 mx-auto text-red-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
          {error || 'Proyecto no encontrado'}
        </h2>
        <button onClick={() => router.push('/dashboard/projects')} className="mt-4 text-primary-600 hover:underline">
          Volver a Proyectos
        </button>
      </div>
    );
  }

  const patternStructure = project.pattern?.structure
    ? (() => { try { return JSON.parse(project.pattern.structure); } catch { return null; } })()
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/dashboard/projects')} className="p-2 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {project.title}
          </h1>
          {project.description && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">{project.description}</p>
          )}
        </div>
        {project.currentPhase && <span className="badge-info text-sm">{project.currentPhase}</span>}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Research Line */}
        <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Línea de Investigación</span>
          </div>
          <p className="font-semibold text-lg">{project.researchLine || 'No asignada'}</p>
        </div>

        {/* Student */}
        <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Estudiante</span>
          </div>
          <p className="font-semibold text-lg">{project.student?.firstName} {project.student?.lastName}</p>
          <p className="text-xs text-gray-400 mt-1">{project.student?.email}</p>
        </div>

        {/* Advisor */}
        <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <User2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Asesor</span>
          </div>
          {project.advisor ? (
            <>
              <p className="font-semibold text-lg">{project.advisor.firstName} {project.advisor.lastName}</p>
              <p className="text-xs text-gray-400 mt-1">{project.advisor.email}</p>
            </>
          ) : (
            <p className="text-gray-400 italic">Sin asignar</p>
          )}
        </div>

        {/* Deadline */}
        <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '180ms' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Próxima Entrega</span>
          </div>
          {project.nextDeadline ? (
            <>
              <p className="font-semibold text-lg">{new Date(project.nextDeadline).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              {(() => {
                const daysLeft = Math.ceil((new Date(project.nextDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return <p className={`text-xs mt-1 font-medium ${daysLeft <= 7 ? 'text-red-500' : daysLeft <= 14 ? 'text-amber-500' : 'text-emerald-500'}`}>{daysLeft > 0 ? `${daysLeft} días restantes` : 'Vencido'}</p>;
              })()}
            </>
          ) : (
            <p className="text-gray-400 italic">Sin fecha límite</p>
          )}
        </div>
      </div>

      {/* Coordinator */}
      {project.coordinator && (
        <div className="glass-card p-5 animate-slide-up" style={{ animationDelay: '240ms' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-pink-700 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/20">
              <User2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Coordinador</span>
              <p className="font-semibold">{project.coordinator.firstName} {project.coordinator.lastName}</p>
            </div>
            <p className="text-xs text-gray-400 ml-2">{project.coordinator.email}</p>
          </div>
        </div>
      )}

      {/* Submissions List */}
      <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Entregas de Documentos
          </h2>
          <Link href="/dashboard/documents" className="text-sm text-primary-600 hover:underline font-medium">
            Subir nuevo documento →
          </Link>
        </div>

        {project.submissions && project.submissions.length > 0 ? (
          <div className="space-y-3">
            {project.submissions.map((sub: any, i: number) => {
              const statusCfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.UPLOADED;
              const StatusIcon = statusCfg.icon;
              return (
                <div key={sub.id} className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-surface-100 dark:bg-surface-700 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{sub.fileName}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(sub.submittedAt).toLocaleDateString('es-PE')}
                        {sub.overallScore != null && <span className="ml-2 font-semibold text-primary-600">Nota: {sub.overallScore}/20</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={statusCfg.color}>
                      <StatusIcon className="w-3 h-3 inline mr-1" />
                      {statusCfg.label}
                    </span>
                    {sub.advisorApproved === true && <span className="text-xs text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full font-medium">Aprobado</span>}
                    {sub.advisorApproved === false && <span className="text-xs text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full font-medium">Rechazado</span>}
                    <Link href={`/dashboard/documents/${sub.id}`} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-xl transition-colors" title="Ver detalle">
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No hay entregas de documentos aún</p>
            <Link href="/dashboard/documents" className="mt-3 inline-block text-primary-600 hover:underline text-sm font-medium">
              Subir primer documento →
            </Link>
          </div>
        )}
      </div>

      {/* Pattern Structure */}
      {patternStructure && (
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '360ms' }}>
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-5">
            <BookTemplate className="w-5 h-5 text-primary-500" />
            Estructura del Patrón: {project.pattern?.name}
          </h2>
          {patternStructure.formatRules && (
            <div className="mb-5 p-4 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">
              <h3 className="text-sm font-semibold mb-2 text-gray-500 dark:text-gray-400 uppercase tracking-wide">Reglas de Formato</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-gray-400">Fuente:</span> <span className="font-medium">{patternStructure.formatRules.font}</span></div>
                <div><span className="text-gray-400">Tamaño:</span> <span className="font-medium">{patternStructure.formatRules.fontSize}pt</span></div>
                <div><span className="text-gray-400">Interlineado:</span> <span className="font-medium">{patternStructure.formatRules.lineSpacing}</span></div>
                <div><span className="text-gray-400">Citación:</span> <span className="font-medium">{patternStructure.formatRules.citationStyle}</span></div>
              </div>
            </div>
          )}
          {patternStructure.chapters && (
            <div className="space-y-3">
              {patternStructure.chapters.map((chapter: any, idx: number) => (
                <div key={idx} className="p-4 bg-surface-50 dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg flex items-center justify-center text-sm font-bold">
                      {chapter.order}
                    </span>
                    <h3 className="font-semibold">{chapter.title}</h3>
                    {chapter.required && <span className="text-xs text-red-500 font-medium">Obligatorio</span>}
                    {chapter.minWords && <span className="text-xs text-gray-400">Mín. {chapter.minWords} palabras</span>}
                  </div>
                  {chapter.sections && chapter.sections.length > 0 && (
                    <div className="ml-11 mt-3 space-y-1.5">
                      {chapter.sections.map((section: any, si: number) => (
                        <div key={si} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="w-1.5 h-1.5 bg-primary-400 rounded-full" />
                          <span>{section.title}</span>
                          {section.required && <span className="text-xs text-red-400">*</span>}
                          {section.minWords && <span className="text-xs text-gray-400">(mín. {section.minWords})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
