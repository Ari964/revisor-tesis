'use client';

import { useState } from 'react';
import { BookTemplate, FileText, Plus, CheckCircle2, Edit, Trash2, Settings2, Clock, ShieldCheck, ArrowLeft, Save } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

type TabId = 'rubrics' | 'formats';

export default function PatternsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('rubrics');
  const [isBuilding, setIsBuilding] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Builder state
  const [rubricName, setRubricName] = useState('');
  const [chapters, setChapters] = useState([
    { id: 1, title: 'Capítulo 1: Planteamiento del Problema', criteria: ['Identificación clara del problema', 'Justificación relevante'] }
  ]);
  
  // Placeholder data
  const [rubrics, setRubrics] = useState<any[]>([
    { id: '1', name: 'Rúbrica Pregrado (Ingeniería)', criteriaCount: 5, maxScore: 20, updatedAt: '2026-05-10T10:00:00Z', status: 'ACTIVE' },
    { id: '2', name: 'Rúbrica Maestría (Ciencias)', criteriaCount: 8, maxScore: 100, updatedAt: '2026-05-12T10:00:00Z', status: 'DRAFT' }
  ]);
  
  const [formats, setFormats] = useState<any[]>([
    { id: '1', name: 'Formato APA 7ma Edición', description: 'Márgenes 2.54cm, Times New Roman 12pt, Interlineado Doble', status: 'ACTIVE' },
  ]);

  const handleAddChapter = () => {
    setChapters([...chapters, { id: Date.now(), title: '', criteria: [''] }]);
  };

  const handleAddCriterion = (chapterIndex: number) => {
    const newChapters = [...chapters];
    newChapters[chapterIndex].criteria.push('');
    setChapters(newChapters);
  };

  const handleUpdateChapter = (index: number, value: string) => {
    const newChapters = [...chapters];
    newChapters[index].title = value;
    setChapters(newChapters);
  };

  const handleUpdateCriterion = (chapterIndex: number, critIndex: number, value: string) => {
    const newChapters = [...chapters];
    newChapters[chapterIndex].criteria[critIndex] = value;
    setChapters(newChapters);
  };

  const handleRemoveCriterion = (chapterIndex: number, critIndex: number) => {
    const newChapters = [...chapters];
    newChapters[chapterIndex].criteria.splice(critIndex, 1);
    setChapters(newChapters);
  };

  const handleSaveRubric = async () => {
    setSaving(true);
    // Simulate API call to save JSON
    setTimeout(() => {
      const newRubric = {
        id: Date.now().toString(),
        name: rubricName || 'Nueva Rúbrica',
        criteriaCount: chapters.reduce((acc, curr) => acc + curr.criteria.length, 0),
        maxScore: 20,
        updatedAt: new Date().toISOString(),
        status: 'DRAFT',
      };
      setRubrics([...rubrics, newRubric]);
      setSaving(false);
      setIsBuilding(false);
      setRubricName('');
      setChapters([{ id: 1, title: 'Capítulo 1: Planteamiento del Problema', criteria: ['Identificación clara del problema'] }]);
    }, 1000);
  };

  if (isBuilding) {
    return (
      <div className="space-y-6 animate-fade-in pb-10">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsBuilding(false)} className="p-2 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Constructor de Rúbrica</h1>
            <p className="text-gray-500 dark:text-gray-400">Define la estructura esperada para evaluación de la IA</p>
          </div>
          <div className="flex-1" />
          <button onClick={handleSaveRubric} disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar JSON'}
          </button>
        </div>

        <div className="glass-panel p-6 rounded-2xl space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre de la Rúbrica</label>
            <input 
              type="text" 
              value={rubricName}
              onChange={(e) => setRubricName(e.target.value)}
              placeholder="Ej. Rúbrica de Tesis de Ingeniería 2026" 
              className="w-full px-4 py-2 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BookTemplate className="w-5 h-5 text-primary-500" />
              Estructura de Capítulos
            </h3>
            
            {chapters.map((chapter, cIdx) => (
              <div key={chapter.id} className="p-4 bg-surface-50 dark:bg-surface-800/50 rounded-xl border border-surface-200 dark:border-surface-700 space-y-4">
                <input 
                  type="text" 
                  value={chapter.title}
                  onChange={(e) => handleUpdateChapter(cIdx, e.target.value)}
                  placeholder={`Título del Capítulo ${cIdx + 1}`} 
                  className="w-full px-3 py-2 font-medium bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
                
                <div className="pl-6 border-l-2 border-primary-100 dark:border-primary-900/50 space-y-3">
                  {chapter.criteria.map((crit, crIdx) => (
                    <div key={crIdx} className="flex items-start gap-3">
                      <div className="mt-2 w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                      <input 
                        type="text" 
                        value={crit}
                        onChange={(e) => handleUpdateCriterion(cIdx, crIdx, e.target.value)}
                        placeholder="Descripción del criterio que la IA evaluará..." 
                        className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                      <button onClick={() => handleRemoveCriterion(cIdx, crIdx)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => handleAddCriterion(cIdx)} className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Añadir criterio
                  </button>
                </div>
              </div>
            ))}

            <button onClick={handleAddChapter} className="w-full py-3 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-xl text-gray-500 hover:text-primary-600 hover:border-primary-400 dark:hover:text-primary-400 dark:hover:border-primary-600 transition-colors flex items-center justify-center gap-2 font-medium">
              <Plus className="w-5 h-5" /> Agregar Nuevo Capítulo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Gestión de Patrones
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Configura rúbricas y formatos para la evaluación automatizada</p>
        </div>
        <button onClick={() => activeTab === 'rubrics' && setIsBuilding(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          <span>Crear {activeTab === 'rubrics' ? 'Rúbrica' : 'Formato'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 glass-card p-1 rounded-2xl w-full max-w-sm">
        <button
          onClick={() => setActiveTab('rubrics')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'rubrics' ? 'bg-white dark:bg-surface-800 shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <ShieldCheck className="w-4 h-4" /> Rúbricas
        </button>
        <button
          onClick={() => setActiveTab('formats')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === 'formats' ? 'bg-white dark:bg-surface-800 shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <FileText className="w-4 h-4" /> Formatos
        </button>
      </div>

      {/* Content */}
      <div className="animate-slide-up">
        {activeTab === 'rubrics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {rubrics.map((rubric) => (
              <div key={rubric.id} className="glass-card p-6 flex flex-col hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${rubric.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-gray-100 text-gray-600 dark:bg-gray-800'}`}>
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${rubric.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                    {rubric.status === 'ACTIVE' ? 'Activo' : 'Borrador'}
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-1">{rubric.name}</h3>
                <div className="flex flex-col gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400 flex-grow">
                  <span className="flex items-center gap-2"><Settings2 className="w-4 h-4"/> {rubric.criteriaCount} criterios de evaluación</span>
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Puntuación máxima: {rubric.maxScore}</span>
                  <span className="flex items-center gap-2"><Clock className="w-4 h-4"/> Actualizado: {new Date(rubric.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-surface-200 dark:border-surface-700">
                  <button className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-xl transition-colors text-gray-500" title="Editar">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded-xl transition-colors text-gray-500" title="Eliminar">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'formats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {formats.map((format) => (
              <div key={format.id} className="glass-card p-6 flex items-center justify-between hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                <div className="flex gap-4 items-center">
                  <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                    <BookTemplate className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{format.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{format.description}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      En uso
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button className="p-2 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-xl transition-colors text-gray-500" title="Editar">
                    <Edit className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
