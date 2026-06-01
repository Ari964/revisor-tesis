'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Plus, FolderKanban, Calendar, User2, FileText, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [researchLine, setResearchLine] = useState('');

  const fetchProjects = () => {
    apiClient<any>('/thesis')
      .then((res) => { setProjects(res.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient('/thesis', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          researchLine,
        })
      });
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setResearchLine('');
      fetchProjects(); // Recargar lista
    } catch (err: any) {
      alert(err.message || 'Error al crear el proyecto');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proyectos de Tesis</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{projects.length} proyectos</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo Proyecto
        </button>
      </div>

      <div className="grid gap-5">
        {projects.map((project, i) => (
          <Link key={project.id} href={`/dashboard/projects/${project.id}`}
            className="glass-card p-6 hover:shadow-xl transition-all duration-300 animate-slide-up group" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/20">
                  <FolderKanban className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold group-hover:text-primary-600 transition-colors">{project.title}</h3>
                  {project.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{project.description}</p>}
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><User2 className="w-4 h-4" />{project.student?.firstName} {project.student?.lastName}</span>
                    {project.advisor && <span className="flex items-center gap-1"><User2 className="w-4 h-4" />Asesor: {project.advisor.firstName} {project.advisor.lastName}</span>}
                    <span className="flex items-center gap-1"><FileText className="w-4 h-4" />{project.submissionCount || 0} entregas</span>
                    {project.nextDeadline && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{new Date(project.nextDeadline).toLocaleDateString('es-PE')}</span>}
                  </div>
                </div>
              </div>
              {project.currentPhase && <span className="badge-info">{project.currentPhase}</span>}
            </div>
          </Link>
        ))}
        {projects.length === 0 && (
          <div className="glass-card p-12 text-center">
            <FolderKanban className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold">No hay proyectos aún</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Crea tu primer proyecto de tesis para comenzar</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 flex justify-between items-center">
              <h2 className="text-xl font-bold">Nuevo Proyecto</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="new-project-form" onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Título de la Tesis <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-field" 
                    placeholder="Ej. Análisis de impacto de IA en la educación..." 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descripción corta</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-field min-h-[100px] resize-none" 
                    placeholder="Breve resumen del objetivo del proyecto..." 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Línea de Investigación <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required
                    value={researchLine}
                    onChange={(e) => setResearchLine(e.target.value)}
                    className="input-field" 
                    placeholder="Ej. Tecnologías Emergentes" 
                  />
                </div>
                
                {/* En una app completa, aquí irían selectores de Asesor y Patrón, 
                    pero el backend actualmente los asigna o espera un body simple 
                    dependiendo de la implementación de tu controlador de NestJS. */}
              </form>
            </div>

            <div className="px-6 py-4 bg-surface-50 dark:bg-surface-800/50 border-t border-surface-200 dark:border-surface-700 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary"
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                form="new-project-form"
                className="btn-primary"
                disabled={saving}
              >
                {saving ? 'Guardando...' : 'Crear Proyecto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
