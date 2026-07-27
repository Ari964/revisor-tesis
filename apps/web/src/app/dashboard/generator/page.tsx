'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { FileText, BookOpen, Layers, Cpu, CheckCircle2, AlertCircle, Download, RefreshCw, Sparkles, Trash2, Plus, X } from 'lucide-react';
import ThesisGenerator from './components/ThesisGenerator';

type ProductType = 'THESIS' | 'ARTICLE' | 'FINAL_THESIS';

const ROLES_TRANSLATION: Record<string, string> = {
  ADMIN: 'Admin',
  COORDINATOR: 'Coordinador',
  ADVISOR: 'Asesor',
  STUDENT: 'Estudiante',
  JURY: 'Jurado',
  AUTHORITY: 'Autoridad',
};

export default function GeneratorPage() {
  // Estado para controlar qué formulario ver: 'THESIS' o 'ARTICLE'
  const [productType, setProductType] = useState<ProductType>('THESIS');
  
  // List of academic users for autocompleting article authors
  const [academicUsers, setAcademicUsers] = useState<any[]>([]);

  useEffect(() => {
    apiClient<{ success: boolean; data: any[] }>('/users/academic')
      .then((res) => {
        if (res.success && res.data) {
          setAcademicUsers(res.data);
        }
      })
      .catch((err) => console.error('Error fetching academic users for articles', err));
  }, []);

  // =========================================================
  // ESTADOS PARA EL GENERADOR DE ARTÍCULOS (NUEVA MEJORA)
  // =========================================================
  const [articleTitle, setArticleTitle] = useState('');
  const [articleDomain, setArticleDomain] = useState('Educación');
  const [articleTechStack, setArticleTechStack] = useState({
    frontend: 'React',
    backend: 'Django',
    database: 'PostgreSQL',
    aiModel: 'Scikit-learn'
  });
  const [articleLoading, setArticleLoading] = useState(false);
  const [articleResult, setArticleResult] = useState<string | null>(null);
  const [articleRawData, setArticleRawData] = useState<any>(null);
  const [articleSessionId, setArticleSessionId] = useState<string | null>(null);
  const [exportingArticle, setExportingArticle] = useState<string | null>(null);
  const [articleStepMessage, setArticleStepMessage] = useState('');
  const [articleCurrentStep, setArticleCurrentStep] = useState(0);
  const [articleProgress, setArticleProgress] = useState(0);

  // Estados para Artículo Original / Revisión y campos dinámicos
  const [tipoArticulo, setTipoArticulo] = useState<'Articulo_Original' | 'Articulo_Revision'>('Articulo_Original');
  const [authorsList, setAuthorsList] = useState<Array<{ name: string; orcid: string; email: string; institution: string }>>([
    { name: 'Juan Pérez', orcid: 'https://orcid.org/0000-0002-1823-9023', email: 'jperez@unitru.edu.pe', institution: 'Universidad Nacional de Trujillo' }
  ]);
  const [correspondenceEmail, setCorrespondenceEmail] = useState('jperez@unitru.edu.pe');
  const [hasConflict, setHasConflict] = useState(false);
  const [conflictDetail, setConflictDetail] = useState('');
  const [isFinanced, setIsFinanced] = useState(false);
  const [financeDetail, setFinanceDetail] = useState('');
  const [hasDataRepo, setHasDataRepo] = useState(false);
  const [dataRepoDetail, setDataRepoDetail] = useState('');
  
  const [articleRequiredFields, setArticleRequiredFields] = useState<any[]>([]);
  const [articleDynamicValues, setArticleDynamicValues] = useState<Record<string, any>>({});

  // Estados para la plantilla del artículo
  const [articleTemplateFile, setArticleTemplateFile] = useState<File | null>(null);
  const [articleTemplateText, setArticleTemplateText] = useState('');
  const [articleTemplateStyles, setArticleTemplateStyles] = useState<any>(null);
  const [articleTemplateUploading, setArticleTemplateUploading] = useState(false);

  // Múltiples plantillas para Artículo Científico
  const [savedArticleTemplates, setSavedArticleTemplates] = useState<any[]>([]);
  const [selectedArticleTemplateId, setSelectedArticleTemplateId] = useState<string>('');
  const [showArticleUploadModal, setShowArticleUploadModal] = useState(false);
  const [newArticleTemplateName, setNewArticleTemplateName] = useState('');
  const [newArticleTemplateFile, setNewArticleTemplateFile] = useState<File | null>(null);
  const [newArticleTemplateUploading, setNewArticleTemplateUploading] = useState(false);

  const fetchArticleTemplates = async () => {
    try {
      const res = await apiClient<{ success: boolean; data: any[] }>('/generator/templates?type=ARTICLE');
      if (res.success && res.data) {
        setSavedArticleTemplates(res.data);
      }
    } catch (err) {
      console.error('Error fetching article templates:', err);
    }
  };

  useEffect(() => {
    if (productType === 'ARTICLE') {
      fetchArticleTemplates();
    }
  }, [productType]);

  const handleArticleTemplateSelect = async (templateId: string) => {
    setSelectedArticleTemplateId(templateId);
    if (!templateId || templateId === 'standard') {
      setArticleTemplateText('');
      setArticleTemplateStyles(null);
      setArticleRequiredFields([]);
      setArticleTemplateFile(null);
      setArticleDynamicValues({});
      return;
    }

    setArticleTemplateUploading(true);
    try {
      const res = await apiClient<any>(`/generator/templates/${templateId}`);
      if (res.success && res.data) {
        const template = res.data;
        setArticleTemplateText(template.templateText || '');
        setArticleTemplateStyles(template.templateStyles || null);
        setArticleRequiredFields(template.requiredFields || []);
        setArticleTemplateFile({ name: template.fileName } as File);
        
        // Auto-detect tipo de artículo if possible
        if (template.detectedRules?.structureType === 'IMRyD') {
          setTipoArticulo('Articulo_Revision');
        } else {
          setTipoArticulo('Articulo_Original');
        }

        const newDynamicValues: Record<string, any> = {};
        if (template.requiredFields) {
          template.requiredFields.forEach((field: any) => {
            if (articleDynamicValues[field.key]) {
              newDynamicValues[field.key] = articleDynamicValues[field.key];
            }
          });
        }
        setArticleDynamicValues(newDynamicValues);
      }
    } catch (err: any) {
      alert(`Error al cargar plantilla: ${err.message}`);
    } finally {
      setArticleTemplateUploading(false);
    }
  };

  const handleDeleteArticleTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Está seguro de que desea eliminar esta plantilla?')) return;

    try {
      const res = await apiClient<any>(`/generator/templates/${templateId}`, {
        method: 'DELETE'
      });
      if (res.success) {
        alert('Plantilla eliminada correctamente');
        await fetchArticleTemplates();
        if (selectedArticleTemplateId === templateId) {
          handleArticleTemplateSelect('');
        }
      }
    } catch (err: any) {
      alert(`Error al eliminar plantilla: ${err.message}`);
    }
  };

  // =========================================================
  // MANEJADOR PARA EXPORTAR EL ARTÍCULO
  // =========================================================
  const handleExportArticle = async (format: 'docx' | 'pdf' | 'txt') => {
    if (!articleRawData) return;
    setExportingArticle(format);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/generator/export-article`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          articleData: articleRawData,
          sessionId: articleSessionId || undefined,
          format
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `Fallo al descargar el archivo (${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(articleRawData.articulo?.titulo || 'articulo').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_borrador.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (err: any) {
      alert(`Error al exportar el artículo: ${err.message}`);
    } finally {
      setExportingArticle(null);
    }
  };

  // =========================================================
  // MANEJADOR PARA GENERAR ARTÍCULO (ASÍNCRONO CON POLLING)
  // =========================================================
  const handleGenerateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleTitle.trim()) return;
    setArticleLoading(true);
    setArticleResult(null);
    setArticleSessionId(null);
    setArticleCurrentStep(0);
    setArticleProgress(5);
    setArticleStepMessage('Inicializando generación...');

    try {
      const res = await apiClient<{ success: boolean; sessionId: string }>('/generator/generate', {
        method: 'POST',
        body: JSON.stringify({
          type: 'ARTICLE',
          tema: articleTitle.trim(),
          metadata: {
            domain: articleDomain,
            techStack: articleTechStack,
            tipo_articulo: tipoArticulo,
            authorsList: authorsList,
            correspondenceEmail: correspondenceEmail,
            conflicto_intereses: hasConflict ? conflictDetail : undefined,
            financiamiento: isFinanced ? financeDetail : undefined,
            disponibilidad_datos: hasDataRepo ? dataRepoDetail : undefined,
            ...articleDynamicValues
          },
          templateText: articleTemplateText || undefined,
          templateStyles: articleTemplateStyles || undefined
        }),
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!res.success || !res.sessionId) {
        throw new Error('Fallo al iniciar el proceso de generación de artículo en el servidor');
      }

      const activeSessionId = res.sessionId;
      setArticleSessionId(activeSessionId);

      // Polling status
      await new Promise<void>((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const statusRes = await apiClient<{
              success: boolean;
              data: {
                status: string;
                currentStep: number;
                progress: number;
                stepLabel: string;
                data: any;
                error?: string;
              }
            }>(`/generator/status/${activeSessionId}`);

            if (!statusRes.success || !statusRes.data) {
              clearInterval(interval);
              reject(new Error('Fallo al obtener estado de generación del artículo'));
              return;
            }

            const { status, currentStep, progress, stepLabel, data: generatedData, error: apiError } = statusRes.data;
            setArticleStepMessage(stepLabel);
            if (currentStep !== undefined) setArticleCurrentStep(currentStep);
            if (progress !== undefined) setArticleProgress(progress);

            if (status === 'completed') {
              clearInterval(interval);
              const art = generatedData.articulo;
              setArticleRawData(generatedData);
              
              let formattedMarkdown = `# ${art.titulo || 'Artículo Científico'}

**Autores:** ${art.autores || ''}

## Resumen
${art.resumen || ''}

**Palabras clave:** ${art.palabras_clave || ''}

## Abstract
${art.abstract || ''}

**Keywords:** ${art.keywords || ''}

## Introducción
${art.introduccion || art.introducción || ''}

## Métodos
${art.metodos || art.métodos || ''}

## Resultados
${art.resultados || ''}

## Discusión
${art.discusion || art.disqusiòn || art.discusión || ''}

## Conclusiones
${Array.isArray(art.conclusiones) 
  ? art.conclusiones.map((c: string) => `- ${c}`).join('\n') 
  : art.conclusiones || ''}

## Referencias
${Array.isArray(art.referencias) 
  ? art.referencias.map((r: string) => `- ${r}`).join('\n') 
  : art.referencias || ''}`;

              if (art.declaraciones) {
                formattedMarkdown += `\n\n## Declaraciones Obligatorias\n` +
                  `**Agradecimientos:** ${art.declaraciones.agradecimientos || 'No aplica'}\n\n` +
                  `**Conflicto de intereses:** ${art.declaraciones.conflicto_intereses || 'No existe ningún tipo de conflicto de interés relacionado con la materia del trabajo'}\n\n` +
                  `**Fuente de financiamiento:** ${art.declaraciones.financiamiento || 'Los autores no recibieron ningún patrocinio para llevar a cabo este estudio-artículo'}\n\n` +
                  `**Contribución de autoría (Taxonomía CRediT):** ${art.declaraciones.contribucion_autores || ''}\n\n` +
                  `**Disponibilidad de datos depositados:** ${art.declaraciones.disponibilidad_datos || 'No aplica'}`;
              }

              setArticleResult(formattedMarkdown);
              resolve();
            } else if (status === 'error') {
              clearInterval(interval);
              reject(new Error(apiError || 'Ocurrió un error en el servidor durante la generación del artículo.'));
            }
          } catch (pollErr: any) {
            clearInterval(interval);
            reject(pollErr);
          }
        }, 2500);
      });

    } catch (err: any) {
      console.error("Error al generar el artículo científico:", err);
      setArticleResult(`Error: ${err.message || 'No se pudo generar el artículo científico. Por favor, reintente.'}`);
    } finally {
      setArticleLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-fade-in">
      {/* Encabezado Principal */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Generador Académico Inteligente</h1>
        <p className="text-gray-500 mt-1">
          Selecciona el tipo de documento científico que deseas redactar bajo rigor metodológico y estructural.
        </p>
      </div>

      {/* Selector de Tipo de Documento (Tabs principales) */}
      <div className="flex space-x-2 glass-card p-1.5 rounded-2xl w-full max-w-lg bg-surface-100 dark:bg-surface-800">
        <button
          type="button"
          onClick={() => setProductType('THESIS')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${productType === 'THESIS'
            ? 'bg-white dark:bg-surface-700 text-primary-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          <BookOpen className="w-4 h-4" /> Proyecto de Tesis
        </button>
        <button
          type="button"
          onClick={() => setProductType('FINAL_THESIS')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${productType === 'FINAL_THESIS'
            ? 'bg-white dark:bg-surface-700 text-primary-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          <Sparkles className="w-4 h-4" /> Tesis
        </button>
        <button
          type="button"
          onClick={() => setProductType('ARTICLE')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${productType === 'ARTICLE'
            ? 'bg-white dark:bg-surface-700 text-primary-600 shadow-sm'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          <FileText className="w-4 h-4" /> Artículo Científico
        </button>
      </div>

      {/* =========================================================
          VISTA 1: GENERADOR DE PROYECTO DE TESIS
         ========================================================= */}
      {productType === 'THESIS' && (
        <ThesisGenerator type="THESIS" />
      )}

      {/* =========================================================
          VISTA 3: GENERADOR DE TESIS (INFORME FINAL)
         ========================================================= */}
      {productType === 'FINAL_THESIS' && (
        <ThesisGenerator type="FINAL_THESIS" />
      )}

      {/* =========================================================
          VISTA 2: GENERADOR DE ARTÍCULO (NUEVA IMPLEMENTACIÓN)
         ========================================================= */}
      {productType === 'ARTICLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Formulario de Configuración del Artículo */}
          <form onSubmit={handleGenerateArticle} className="lg:col-span-1 glass-card p-5 rounded-2xl space-y-4 border border-surface-200 dark:border-surface-700 bg-surface-50/50 max-h-[85vh] overflow-y-auto pr-2">
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1">Configuración del Artículo</h3>
              <p className="text-xs text-gray-400">Estructura indexada Q1 con validación metodológica y estadística.</p>
            </div>

            {/* Tipo de artículo */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Tipo de Artículo</label>
              <div className="flex space-x-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTipoArticulo('Articulo_Original')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${tipoArticulo === 'Articulo_Original' ? 'bg-white dark:bg-surface-700 text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  Original (IMRD)
                </button>
                <button
                  type="button"
                  onClick={() => setTipoArticulo('Articulo_Revision')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${tipoArticulo === 'Articulo_Revision' ? 'bg-white dark:bg-surface-700 text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  Revisión (Bibliográfico)
                </button>
              </div>
            </div>

            {/* Título de la investigación */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Título o Tema Central</label>
              <textarea
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
                placeholder="Ej. Sistema inteligente de predicción de deserción estudiantil..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                rows={2}
                required
              />
            </div>

            {/* Área de conocimiento / Dominio */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Dominio Académico</label>
              <select
                value={articleDomain}
                onChange={(e) => setArticleDomain(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                {['Salud', 'Educación', 'Medio ambiente', 'Finanzas', 'Recursos humanos', 'Marketing', 'Ingeniería', 'Ciencias sociales'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Lista de Autores */}
            <div className="space-y-2 pt-2 border-t border-surface-200 dark:border-surface-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Autores ({authorsList.length})</span>
                <button
                  type="button"
                  onClick={() => setAuthorsList([...authorsList, { name: '', orcid: '', email: '', institution: '' }])}
                  className="text-[10px] text-emerald-600 font-bold hover:underline"
                >
                  + Añadir Autor
                </button>
              </div>
              
              <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                {authorsList.map((author, index) => (
                  <div key={index} className="p-2.5 bg-surface-100/50 dark:bg-surface-800/30 border border-surface-200 dark:border-surface-700 rounded-xl space-y-1.5 relative animate-fade-in">
                    {authorsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = authorsList.filter((_, i) => i !== index);
                          setAuthorsList(updated);
                          if (correspondenceEmail === author.email && updated.length > 0) {
                            setCorrespondenceEmail(updated[0].email);
                          }
                        }}
                        className="absolute top-1.5 right-1.5 text-xs text-red-500 hover:text-red-700"
                        title="Eliminar autor"
                      >
                        ×
                      </button>
                    )}
                    {academicUsers.length > 0 && (
                      <div>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            const selected = academicUsers.find(u => u.id === val);
                            if (selected) {
                              const updated = [...authorsList];
                              const degreeShort = selected.academicDegree === 'Doctor' ? 'Dr.' : selected.academicDegree === 'Magíster' ? 'Mg.' : selected.academicDegree === 'Ingeniero' ? 'Ing.' : selected.academicDegree === 'Licenciado' ? 'Lic.' : '';
                              const fullName = `${degreeShort ? degreeShort + ' ' : ''}${selected.firstName} ${selected.lastName}`;
                              updated[index] = {
                                name: fullName,
                                orcid: selected.orcid || '',
                                email: selected.email,
                                institution: selected.institution || 'Universidad Nacional de Trujillo'
                              };
                              setAuthorsList(updated);
                              if (index === 0) {
                                setCorrespondenceEmail(selected.email);
                              }
                            }
                          }}
                          className="w-full px-2 py-1 text-[11px] bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 mb-1"
                        >
                          <option value="">-- Autocompletar autor --</option>
                          {academicUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.academicDegree ? `${u.academicDegree === 'Doctor' ? 'Dr.' : u.academicDegree === 'Magíster' ? 'Mg.' : 'Ing.'} ` : ''}{u.firstName} {u.lastName} ({ROLES_TRANSLATION[u.role] || u.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <input
                        type="text"
                        placeholder="Nombre del autor"
                        value={author.name}
                        onChange={(e) => {
                          const updated = [...authorsList];
                          updated[index].name = e.target.value;
                          setAuthorsList(updated);
                        }}
                        className="w-full px-2 py-1 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        placeholder="ORCID iD"
                        value={author.orcid}
                        onChange={(e) => {
                          const updated = [...authorsList];
                          updated[index].orcid = e.target.value;
                          setAuthorsList(updated);
                        }}
                        className="w-full px-2 py-1 text-[11px] bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <input
                        type="email"
                        placeholder="Correo"
                        value={author.email}
                        onChange={(e) => {
                          const updated = [...authorsList];
                          updated[index].email = e.target.value;
                          setAuthorsList(updated);
                        }}
                        className="w-full px-2 py-1 text-[11px] bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Filiación (ej. Univ. Nac. de Trujillo)"
                        value={author.institution}
                        onChange={(e) => {
                          const updated = [...authorsList];
                          updated[index].institution = e.target.value;
                          setAuthorsList(updated);
                        }}
                        className="w-full px-2 py-1 text-[11px] bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {authorsList.length > 0 && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Autor de Correspondencia</label>
                  <select
                    value={correspondenceEmail}
                    onChange={(e) => setCorrespondenceEmail(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {authorsList.map((a, i) => (
                      <option key={i} value={a.email || `autor_${i}`}>{a.name || `Autor ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Declaraciones Éticas */}
            <div className="space-y-3 pt-2 border-t border-surface-200 dark:border-surface-700">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Declaraciones Obligatorias</span>
              
              {/* Conflicto de interés */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-650 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={hasConflict}
                    onChange={(e) => setHasConflict(e.target.checked)}
                    className="rounded border-surface-300 text-emerald-650 focus:ring-emerald-500"
                  />
                  ¿Declarar conflicto de interés específico?
                </label>
                {hasConflict && (
                  <textarea
                    value={conflictDetail}
                    onChange={(e) => setConflictDetail(e.target.value)}
                    placeholder="Detalla los conflictos específicos (o desactiva para opción default)..."
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                    rows={2}
                  />
                )}
              </div>

              {/* Financiamiento */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-650 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={isFinanced}
                    onChange={(e) => setIsFinanced(e.target.checked)}
                    className="rounded border-surface-300 text-emerald-650 focus:ring-emerald-500"
                  />
                  ¿Tiene fuente de financiamiento?
                </label>
                {isFinanced && (
                  <input
                    type="text"
                    value={financeDetail}
                    placeholder="Ej. CONCYTEC, Contrato N° 045-2025"
                    onChange={(e) => setFinanceDetail(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                )}
              </div>

              {/* Disponibilidad de datos */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-650 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={hasDataRepo}
                    onChange={(e) => setHasDataRepo(e.target.checked)}
                    className="rounded border-surface-300 text-emerald-650 focus:ring-emerald-500"
                  />
                  ¿Datos en repositorio público?
                </label>
                {hasDataRepo && (
                  <input
                    type="text"
                    value={dataRepoDetail}
                    placeholder="Ej. GitHub, Zenodo, https://doi.org/10..."
                    onChange={(e) => setDataRepoDetail(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                )}
              </div>
            </div>

            {/* Libertad Tecnológica Avanzada */}
            <div className="space-y-3 pt-2 border-t border-surface-200 dark:border-surface-700">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" /> Ecosistema Tecnológico
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Frontend</label>
                  <input
                    type="text" value={articleTechStack.frontend}
                    onChange={e => setArticleTechStack({ ...articleTechStack, frontend: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Backend</label>
                  <input
                    type="text" value={articleTechStack.backend}
                    onChange={e => setArticleTechStack({ ...articleTechStack, backend: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Base de Datos</label>
                  <input
                    type="text" value={articleTechStack.database}
                    onChange={e => setArticleTechStack({ ...articleTechStack, database: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-0.5">IA / Framework</label>
                  <input
                    type="text" value={articleTechStack.aiModel}
                    onChange={e => setArticleTechStack({ ...articleTechStack, aiModel: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Campos Dinámicos de la Plantilla */}
            {articleRequiredFields.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-surface-200 dark:border-surface-700 bg-amber-50/10 p-2 rounded-xl border border-amber-200/20">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Campos de la Plantilla</span>
                <div className="space-y-2">
                  {articleRequiredFields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="block text-[10px] font-semibold text-gray-650 dark:text-gray-300">{field.label}</label>
                      {field.type === 'select' ? (
                        <select
                          value={articleDynamicValues[field.key] || ''}
                          onChange={(e) => setArticleDynamicValues({ ...articleDynamicValues, [field.key]: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-205 dark:border-surface-750 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                          required={field.required}
                        >
                          <option value="">Seleccionar...</option>
                          {field.options?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : 'text'}
                          placeholder={field.placeholder}
                          value={articleDynamicValues[field.key] || ''}
                          onChange={(e) => setArticleDynamicValues({ ...articleDynamicValues, [field.key]: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-surface-900 border border-surface-205 dark:border-surface-750 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selección y Gestión de Plantilla del Artículo */}
            <div className="pt-3 border-t border-surface-200 dark:border-surface-700">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Plantilla del Artículo (Opcional)
                </label>
                <button
                  type="button"
                  onClick={() => setShowArticleUploadModal(true)}
                  className="text-[10px] text-emerald-650 dark:text-emerald-450 hover:underline font-bold flex items-center gap-0.5 transition-all"
                >
                  <Plus className="w-3 h-3" /> Guardar plantilla
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedArticleTemplateId}
                    onChange={(e) => handleArticleTemplateSelect(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none pr-8"
                    disabled={articleTemplateUploading}
                  >
                    <option value="">Ninguna (Formato Estándar)</option>
                    {savedArticleTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.fileName})
                      </option>
                    ))}
                  </select>
                  {articleTemplateUploading && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
                    </div>
                  )}
                </div>
                {selectedArticleTemplateId && selectedArticleTemplateId !== 'standard' && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteArticleTemplate(selectedArticleTemplateId, e)}
                    className="p-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/60 text-red-650 dark:text-red-400 rounded-xl transition-all"
                    title="Eliminar plantilla guardada"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {articleTemplateStyles && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Estilo: {articleTemplateStyles.fontFamily || 'Times New Roman'}, interlineado {articleTemplateStyles.lineSpacing || '1.5'}, márgenes {articleTemplateStyles.margins?.top || '2.54'}cm.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={articleLoading || !articleTitle.trim()}
              className="w-full py-2.5 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md transition-all active:scale-98 disabled:bg-gray-400 disabled:cursor-not-allowed text-center"
            >
              {articleLoading ? 'Redactando Artículo...' : 'Generar Artículo Científico'}
            </button>
          </form>

          {/* Panel de Visualización del Artículo Generado */}
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-surface-200 dark:border-surface-700 min-h-[520px] bg-white dark:bg-surface-900 flex flex-col justify-between">
            {articleLoading && (
              <div className="flex flex-col items-center justify-center flex-1 space-y-6 p-8 text-center animate-pulse">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
                  <RefreshCw className="w-7 h-7 animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">Redactando Artículo Científico</h3>
                  <p className="text-xs text-gray-400 mt-1">Por favor espera, la IA está redactando las secciones según el rigor IMRyD...</p>
                </div>
                {/* Progress bar */}
                <div className="w-full max-w-md bg-surface-200 dark:bg-surface-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${articleProgress || 10}%` }}
                  />
                </div>
                <div className="bg-surface-50 dark:bg-surface-800/50 p-4 rounded-xl border border-surface-200 dark:border-surface-700 w-full max-w-md mx-auto">
                  <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                    Paso {articleCurrentStep} de 5: {articleProgress}%
                  </p>
                  <p className="text-xs font-semibold mt-1 text-gray-700 dark:text-gray-300">
                    {articleStepMessage || 'Inicializando generación...'}
                  </p>
                </div>
              </div>
            )}

            {!articleLoading && !articleResult && (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-400 py-12">
                <Layers className="w-12 h-12 stroke-1 mb-2 text-gray-300" />
                <p className="text-sm">Configura el entorno y haz clic en generar para redactar el artículo completo.</p>
              </div>
            )}

            {!articleLoading && articleResult && (
              <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row items-center justify-between pb-3 border-b border-surface-200 dark:border-surface-700 gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Artículo Científico Indexado Completo
                  </span>
                  
                  {/* Botones de descarga del Artículo */}
                  <div className="flex items-center gap-1.5 w-full md:w-auto">
                    <button
                      onClick={() => handleExportArticle('docx')}
                      disabled={exportingArticle !== null}
                      className="px-2.5 py-1.5 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-650 rounded-lg text-xs font-medium flex items-center gap-1 transition-all disabled:opacity-50"
                      title="Descargar en Word"
                    >
                      {exportingArticle === 'docx' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                      Word
                    </button>
                    <button
                      onClick={() => handleExportArticle('pdf')}
                      disabled={exportingArticle !== null}
                      className="px-2.5 py-1.5 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-650 rounded-lg text-xs font-medium flex items-center gap-1 transition-all disabled:opacity-50"
                      title="Descargar en PDF"
                    >
                      {exportingArticle === 'pdf' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                      PDF
                    </button>
                    <button
                      onClick={() => handleExportArticle('txt')}
                      disabled={exportingArticle !== null}
                      className="px-2.5 py-1.5 bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 border border-surface-200 dark:border-surface-650 rounded-lg text-xs font-medium flex items-center gap-1 transition-all disabled:opacity-50"
                      title="Descargar en TXT"
                    >
                      {exportingArticle === 'txt' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                      TXT
                    </button>
                  </div>
                </div>

                {/* Visualizador del Markdown final */}
                <div className="prose dark:prose-invert max-w-none text-sm max-h-[550px] overflow-y-auto p-4 bg-surface-50 dark:bg-surface-950 rounded-xl font-sans whitespace-pre-wrap leading-relaxed">
                  {articleResult}
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-surface-100 dark:border-surface-800 flex items-center gap-2 text-[11px] text-gray-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>Nota: Todas las secciones obligatorias del artículo se generan de forma coherente con la literatura del área seleccionada.</span>
            </div>
          </div>

        </div>
      )}

      {/* Modal para Guardar Nueva Plantilla del Artículo */}
      {showArticleUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center pb-2 border-b border-surface-200 dark:border-surface-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-150 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                Guardar Plantilla de Artículo
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowArticleUploadModal(false);
                  setNewArticleTemplateName('');
                  setNewArticleTemplateFile(null);
                }}
                className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-gray-400 hover:text-gray-650 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-650 dark:text-gray-400 mb-1.5 font-medium">
                  Nombre de la Plantilla
                </label>
                <input
                  type="text"
                  value={newArticleTemplateName}
                  onChange={(e) => setNewArticleTemplateName(e.target.value)}
                  placeholder="Ej. Plantilla Revista Científica UNT 2026"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-655 dark:text-gray-400 mb-1.5 font-medium">
                  Archivo de Plantilla (.docx o .pdf)
                </label>
                <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 bg-surface-50 dark:bg-surface-800 border border-dashed border-surface-300 dark:border-surface-650 rounded-xl cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-700/50 transition-all">
                  <FileText className="w-8 h-8 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300 text-center px-2">
                    {newArticleTemplateFile ? newArticleTemplateFile.name : "Haga clic para buscar o arrastre el archivo"}
                  </span>
                  <input
                    type="file"
                    accept=".docx,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setNewArticleTemplateFile(file);
                      if (file && !newArticleTemplateName) {
                        const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                        setNewArticleTemplateName(baseName);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-surface-200 dark:border-surface-700">
              <button
                type="button"
                onClick={() => {
                  setShowArticleUploadModal(false);
                  setNewArticleTemplateName('');
                  setNewArticleTemplateFile(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-surface-100 dark:bg-surface-800 dark:hover:bg-surface-700 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={newArticleTemplateUploading || !newArticleTemplateName.trim() || !newArticleTemplateFile}
                onClick={async () => {
                  if (!newArticleTemplateFile || !newArticleTemplateName.trim()) return;
                  setNewArticleTemplateUploading(true);

                  const formData = new FormData();
                  formData.append('file', newArticleTemplateFile);
                  formData.append('name', newArticleTemplateName.trim());
                  formData.append('documentType', 'ARTICLE');

                  try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/generator/templates/upload`, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                      },
                      body: formData
                    });

                    if (!response.ok) {
                      const errJson = await response.json().catch(() => ({}));
                      throw new Error(errJson.message || `Fallo al subir plantilla (${response.status})`);
                    }

                    const resData = await response.json();
                    if (resData.success && resData.data) {
                      alert('¡Plantilla de artículo guardada y analizada con éxito!');
                      setShowArticleUploadModal(false);
                      setNewArticleTemplateName('');
                      setNewArticleTemplateFile(null);
                      
                      await fetchArticleTemplates();
                      await handleArticleTemplateSelect(resData.data.id);
                    }
                  } catch (err: any) {
                    alert(`Error al guardar plantilla: ${err.message}`);
                  } finally {
                    setNewArticleTemplateUploading(false);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-750 disabled:bg-gray-400 rounded-xl transition-all flex items-center gap-1.5"
              >
                {newArticleTemplateUploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Plantilla'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}