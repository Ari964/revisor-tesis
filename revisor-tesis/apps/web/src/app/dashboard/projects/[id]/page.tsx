'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
  FolderKanban, FileText, Calendar, User2, ArrowLeft, 
  CheckCircle2, XCircle, Clock, ArrowUpRight, Tag, Activity, Award
} from 'lucide-react';
import Link from 'next/link';

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

  useEffect(() => {
    if (params.id) {
      setLoading(true);
      apiClient<any>(`/thesis/${params.id}`)
        .then((res) => {
          setProject(res.data);
        })
        .catch((err) => {
          console.error('Error fetching project:', err);
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

  if (!project) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Proyecto no encontrado</h2>
        <button onClick={() => router.back()} className="mt-4 text-primary-600 hover:underline flex items-center gap-2 mx-auto">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push('/dashboard/projects')} 
          className="p-2 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold truncate flex items-center gap-3">
            {project.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Línea de investigación: <span className="font-semibold text-gray-700 dark:text-gray-300">{project.researchLine || 'No especificada'}</span>
          </p>
        </div>
        {project.currentPhase && (
          <span className="badge-info text-sm py-1.5 px-3 self-center">{project.currentPhase}</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submissions List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              Entregas y Avances de Tesis
            </h2>

            {project.submissions && project.submissions.length > 0 ? (
              <div className="space-y-4">
                {project.submissions.map((sub: any, i: number) => {
                  const statusCfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.UPLOADED;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <div 
                      key={sub.id} 
                      className="p-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900/50 hover:bg-surface-100 dark:hover:bg-surface-900/80 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary-50 dark:bg-primary-950/30 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileText className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 break-all">{sub.fileName}</h4>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span>Sometido el {new Date(sub.submittedAt).toLocaleDateString('es-PE')}</span>
                            {sub.overallScore != null && (
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Award className="w-3.5 h-3.5 inline" /> Nota: {sub.overallScore}/20
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4">
                        <span className={`${statusCfg.color} text-xs font-semibold py-1 px-2.5 rounded-full flex items-center gap-1.5`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusCfg.label}
                        </span>
                        
                        <Link 
                          href={`/dashboard/documents/${sub.id}`} 
                          className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
                        >
                          Ver Detalle <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-surface-200 dark:border-surface-700 rounded-2xl">
                <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <h3 className="font-medium text-gray-700 dark:text-gray-300">No hay entregas todavía</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                  Este proyecto aún no registra entregas. Sube tus avances en la sección de "Documentos".
                </p>
                <Link 
                  href="/dashboard/documents" 
                  className="mt-4 btn-primary text-xs inline-block"
                >
                  Ir a Documentos
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Project Meta Card */}
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <h3 className="text-lg font-semibold border-b border-surface-200 dark:border-surface-700 pb-2 flex items-center gap-2">
              <Activity className="w-5 h-5 text-accent-500" />
              Información del Proyecto
            </h3>

            {/* Description */}
            {project.description && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Descripción</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-line leading-relaxed">
                  {project.description}
                </p>
              </div>
            )}

            {/* Student Info */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <User2 className="w-3.5 h-3.5" /> Estudiante
              </h4>
              <div className="p-3 bg-surface-50 dark:bg-surface-900/50 rounded-xl">
                <p className="text-sm font-semibold">{project.student?.firstName} {project.student?.lastName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{project.student?.email}</p>
              </div>
            </div>

            {/* Advisor Info */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <User2 className="w-3.5 h-3.5" /> Asesor de Tesis
              </h4>
              <div className="p-3 bg-surface-50 dark:bg-surface-900/50 rounded-xl">
                {project.advisor ? (
                  <>
                    <p className="text-sm font-semibold">{project.advisor.firstName} {project.advisor.lastName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{project.advisor.email}</p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500 italic">No asignado aún</p>
                )}
              </div>
            </div>

            {/* Dates / Deadlines */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Creado el
                </h4>
                <p className="text-sm mt-1 font-medium">
                  {new Date(project.createdAt).toLocaleDateString('es-PE')}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Próxima Entrega
                </h4>
                <p className="text-sm mt-1 font-medium text-primary-600 dark:text-primary-400">
                  {project.nextDeadline 
                    ? new Date(project.nextDeadline).toLocaleDateString('es-PE')
                    : 'Sin definir'
                  }
                </p>
              </div>
            </div>

            {/* Pattern/Template */}
            {project.pattern && (
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Estructura / Patrón
                </h4>
                <p className="text-sm mt-1 font-medium text-gray-700 dark:text-gray-300">
                  {project.pattern.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
