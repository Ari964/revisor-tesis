'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import {
    FilePlus2, RefreshCw, Download, FileText, CheckCircle2, AlertTriangle,
    ArrowRight, BookOpen, Layers, User, Calendar, MapPin, Sparkles, BookMarked, Users,
    Trash2, Plus, X
} from 'lucide-react';

const STEPS_THESIS = [
    { id: 0, label: 'Estructuración', desc: 'Analizando tema y definiendo objetivos de investigación...' },
    { id: 1, label: 'Preliminares', desc: 'Generando carátula, jurado dictaminador, índices y resumen...' },
    { id: 2, label: 'Capítulo I', desc: 'Redactando realidad problemática, antecedentes y justificación...' },
    { id: 3, label: 'Capítulo II', desc: 'Estructurando diseño, variables, población, técnicas y procedimientos...' },
    { id: 4, label: 'Capítulo III', desc: 'Generando recursos, presupuesto consolidado y cronograma Gantt...' },
    { id: 5, label: 'Referencias', desc: 'Construyendo 30 referencias bibliográficas en formato APA 7 con DOI...' },
    { id: 6, label: 'Anexos', desc: 'Generando matrices de operacionalización, consistencia y diagramas auxiliares...' }
];

const STEPS_FINAL_THESIS = [
    { id: 0, label: 'Estructuración', desc: 'Analizando tema y definiendo objetivos de investigación...' },
    { id: 1, label: 'Preliminares', desc: 'Generando carátula, jurado dictaminador, índices y resumen en tiempo pasado...' },
    { id: 2, label: 'Capítulo I: Introducción', desc: 'Redactando realidad problemática, antecedentes y justificación...' },
    { id: 3, label: 'Capítulo II: Marco Teórico', desc: 'Estructurando las bases teóricas detalladas de la investigación...' },
    { id: 4, label: 'Capítulo III: Método', desc: 'Detallando tipo de estudio, variables y procedimientos en pasado impersonal...' },
    { id: 5, label: 'Capítulo IV: Resultados', desc: 'Analizando datos reales con tablas descriptivas y de contraste de hipótesis en pasado...' },
    { id: 6, label: 'Capítulo V: Discusión y Rec.', desc: 'Redactando contraste crítico de hallazgos y formulando recomendaciones...' },
    { id: 7, label: 'Conclusiones', desc: 'Construyendo conclusiones finales correlativas con objetivos e hipótesis...' },
    { id: 8, label: 'Referencias', desc: 'Construyendo 30 referencias bibliográficas en formato APA 7 con DOI...' },
    { id: 9, label: 'Anexos', desc: 'Generando matrices, diagramas e instrumentos metodológicos en tiempo pasado...' }
];

export default function ThesisGeneratorPage({ type = 'THESIS' }: { type?: 'THESIS' | 'FINAL_THESIS' }) {
    const steps = type === 'FINAL_THESIS' ? STEPS_FINAL_THESIS : STEPS_THESIS;
    // Form fields
    const [tema, setTema] = useState('');
    const [nombreAutor, setNombreAutor] = useState('');
    const [nombreAsesor, setNombreAsesor] = useState('');
    const [lineaInvestigacion, setLineaInvestigacion] = useState('Gestión de Proyectos de TIC');
    const [ciudad, setCiudad] = useState('Trujillo');
    const [anio, setAnio] = useState(new Date().getFullYear());

    // Toggle manual input states
    const [isManualAutor, setIsManualAutor] = useState(false);
    const [isManualAsesor, setIsManualAsesor] = useState(false);
    const [isManualPresidente, setIsManualPresidente] = useState(false);
    const [isManualSecretario, setIsManualSecretario] = useState(false);
    const [isManualVocal, setIsManualVocal] = useState(false);

    // Jury fields states
    const [juradoPresidenteNombre, setJuradoPresidenteNombre] = useState('');
    const [juradoPresidenteGrado, setJuradoPresidenteGrado] = useState('Doctor');
    const [juradoSecretarioNombre, setJuradoSecretarioNombre] = useState('');
    const [juradoSecretarioGrado, setJuradoSecretarioGrado] = useState('Magíster');
    const [juradoVocalNombre, setJuradoVocalNombre] = useState('');
    const [juradoVocalGrado, setJuradoVocalGrado] = useState('Ingeniero');

    // Authorities list states
    const [studentsList, setStudentsList] = useState<any[]>([]);
    const [advisorsList, setAdvisorsList] = useState<any[]>([]);
    const [juriesList, setJuriesList] = useState<any[]>([]);

    useEffect(() => {
        // Fetch academic users
        apiClient<any>('/users/academic')
            .then((res) => {
                if (res.success && res.data) {
                    const data = res.data;
                    setStudentsList(data.filter((u: any) => u.role === 'STUDENT'));
                    setAdvisorsList(data.filter((u: any) => u.role === 'ADVISOR'));
                    setJuriesList(data.filter((u: any) => u.role === 'JURY' || u.role === 'ADVISOR' || u.role === 'AUTHORITY'));
                }
            })
            .catch((err) => console.error('Error fetching academic users', err));

        // Auto-populate current logged in user if student
        const stored = localStorage.getItem('user');
        if (stored) {
            try {
                const u = JSON.parse(stored);
                if (u.role === 'STUDENT') {
                    setNombreAutor(`${u.firstName} ${u.lastName}`);
                }
            } catch (e) {}
        }
    }, []);

    // Dynamic template upload state
    const [templateFile, setTemplateFile] = useState<File | null>(null);
    const [templateText, setTemplateText] = useState('');
    const [templateStyles, setTemplateStyles] = useState<any>(null);
    const [templateUploading, setTemplateUploading] = useState(false);

    const [requiredFields, setRequiredFields] = useState<any[]>([]);
    const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});

    // Multi-template states
    const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateFile, setNewTemplateFile] = useState<File | null>(null);
    const [newTemplateUploading, setNewTemplateUploading] = useState(false);

    // Fetch saved templates
    const fetchTemplates = async () => {
        try {
            const res = await apiClient<{ success: boolean; data: any[] }>(`/generator/templates?type=${type}`);
            if (res.success && res.data) {
                setSavedTemplates(res.data);
            }
        } catch (err) {
            console.error('Error fetching templates:', err);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, [type]);

    const handleTemplateSelect = async (templateId: string) => {
        setSelectedTemplateId(templateId);
        setError('');
        if (!templateId || templateId === 'standard') {
            setTemplateText('');
            setTemplateStyles(null);
            setRequiredFields([]);
            setTemplateFile(null);
            setDynamicValues({});
            return;
        }

        setTemplateUploading(true);
        try {
            const res = await apiClient<any>(`/generator/templates/${templateId}`);
            if (res.success && res.data) {
                const template = res.data;
                setTemplateText(template.templateText || '');
                setTemplateStyles(template.templateStyles || null);
                setRequiredFields(template.requiredFields || []);
                setTemplateFile({ name: template.fileName } as File);
                
                const newDynamicValues: Record<string, any> = {};
                if (template.requiredFields) {
                    template.requiredFields.forEach((field: any) => {
                        if (dynamicValues[field.key]) {
                            newDynamicValues[field.key] = dynamicValues[field.key];
                        }
                    });
                }
                setDynamicValues(newDynamicValues);
            }
        } catch (err: any) {
            setError(`Error al cargar plantilla: ${err.message}`);
        } finally {
            setTemplateUploading(false);
        }
    };

    const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('¿Está seguro de que desea eliminar esta plantilla?')) return;

        try {
            const res = await apiClient<any>(`/generator/templates/${templateId}`, {
                method: 'DELETE'
            });
            if (res.success) {
                setSuccess('Plantilla eliminada correctamente');
                setTimeout(() => setSuccess(''), 4000);
                await fetchTemplates();
                if (selectedTemplateId === templateId) {
                    handleTemplateSelect('');
                }
            }
        } catch (err: any) {
            setError(`Error al eliminar plantilla: ${err.message}`);
        }
    };

    // Generation status
    const [generating, setGenerating] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [stepMessage, setStepMessage] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Generated document state
    const [thesisData, setThesisData] = useState<any>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('prelims');
    const [exporting, setExporting] = useState<string | null>(null);

    const metodoData = type === 'FINAL_THESIS' ? thesisData?.capitulo3 : thesisData?.capitulo2;

    const startGeneration = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tema.trim()) return;

        setGenerating(true);
        setError('');
        setThesisData(null);
        setSessionId(null);
        setCurrentStep(0);
        setStepMessage(steps[0].desc);

        try {
            const selectedAdvisor = advisorsList.find(a => `${a.firstName} ${a.lastName}` === nombreAsesor.trim());
            const advisorDegree = selectedAdvisor?.academicDegree || 'Doctor';

            const res = await apiClient<{ success: boolean; sessionId: string }>('/generator/generate', {
                method: 'POST',
                body: JSON.stringify({
                    type: type,
                    tema: tema.trim(),
                    metadata: {
                        nombre_autor: nombreAutor.trim() || 'Estudiante UNT',
                        nombre_asesor: nombreAsesor.trim() || 'Asesor Académico',
                        grado_asesor: advisorDegree,
                        jurado_presidente_nombre: juradoPresidenteNombre.trim() || undefined,
                        jurado_presidente_grado: juradoPresidenteGrado,
                        jurado_secretario_nombre: juradoSecretarioNombre.trim() || undefined,
                        jurado_secretario_grado: juradoSecretarioGrado,
                        jurado_vocal_nombre: juradoVocalNombre.trim() || undefined,
                        jurado_vocal_grado: juradoVocalGrado,
                        linea_investigacion: lineaInvestigacion,
                        ciudad: ciudad.trim() || 'Trujillo',
                        anio: anio,
                        ...dynamicValues
                    },
                    templateText: templateText || undefined,
                    templateStyles: templateStyles || undefined
                }),
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!res.success || !res.sessionId) {
                throw new Error('Fallo al iniciar el proceso de generación en el servidor');
            }

            const activeSessionId = res.sessionId;
            setSessionId(activeSessionId);

            // Poll generation status
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
                            reject(new Error('Fallo al obtener estado de generación'));
                            return;
                        }

                        const { status, currentStep, progress, stepLabel, data: generatedData, error: apiError } = statusRes.data;

                        setCurrentStep(currentStep);
                        setStepMessage(stepLabel);

                        if (status === 'completed') {
                            clearInterval(interval);
                            setThesisData(generatedData);
                            setSuccess('¡Tesis generada exitosamente!');
                            setTimeout(() => setSuccess(''), 5000);
                            resolve();
                        } else if (status === 'error') {
                            clearInterval(interval);
                            reject(new Error(apiError || 'Ocurrió un error en el servidor durante la generación.'));
                        }
                    } catch (pollErr: any) {
                        clearInterval(interval);
                        reject(pollErr);
                    }
                }, 2500);
            });

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
                    sessionId: sessionId || undefined,
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
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 1000);
        } catch (err: any) {
            alert(`Error al exportar: ${err.message}`);
        } finally {
            setExporting(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Main Container */}
            {!thesisData && !generating && (
                <div className="glass-card p-6 max-w-4xl mx-auto animate-slide-up">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <FilePlus2 className="w-5 h-5 text-primary-500" />
                        Configuración del {type === 'FINAL_THESIS' ? 'Borrador de Tesis (Informe Final)' : 'Proyecto de Tesis'}
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
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-sm font-medium flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                                        <User className="w-4 h-4 text-gray-400" /> Nombre del Autor
                                    </label>
                                    <label className="flex items-center gap-1 text-[11px] text-gray-450 cursor-pointer hover:text-primary-600 select-none">
                                        <input
                                            type="checkbox"
                                            checked={isManualAutor}
                                            onChange={(e) => {
                                                setIsManualAutor(e.target.checked);
                                                if (e.target.checked) setNombreAutor('');
                                            }}
                                            className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 w-3 h-3"
                                        />
                                        Ingresar manual
                                    </label>
                                </div>
                                {isManualAutor ? (
                                    <input
                                        type="text"
                                        value={nombreAutor}
                                        onChange={(e) => setNombreAutor(e.target.value)}
                                        className="input-field"
                                        placeholder="Ej. Juan Pérez Medina"
                                        required
                                    />
                                ) : (
                                    <select
                                        value={nombreAutor}
                                        onChange={(e) => setNombreAutor(e.target.value)}
                                        className="input-field animate-fade-in"
                                        required
                                    >
                                        <option value="">-- Seleccionar Estudiante/Autor --</option>
                                        {studentsList.map((s) => (
                                            <option key={s.id} value={`${s.firstName} ${s.lastName}`}>
                                                {s.firstName} {s.lastName} ({s.email})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-sm font-medium flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                                        <User className="w-4 h-4 text-gray-400" /> Nombre del Asesor
                                    </label>
                                    <label className="flex items-center gap-1 text-[11px] text-gray-450 cursor-pointer hover:text-primary-600 select-none">
                                        <input
                                            type="checkbox"
                                            checked={isManualAsesor}
                                            onChange={(e) => {
                                                setIsManualAsesor(e.target.checked);
                                                if (e.target.checked) setNombreAsesor('');
                                            }}
                                            className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 w-3 h-3"
                                        />
                                        Ingresar manual
                                    </label>
                                </div>
                                {isManualAsesor ? (
                                    <input
                                        type="text"
                                        value={nombreAsesor}
                                        onChange={(e) => setNombreAsesor(e.target.value)}
                                        className="input-field"
                                        placeholder="Ej. Carlos Alvarez Ríos"
                                        required
                                    />
                                ) : (
                                    <select
                                        value={nombreAsesor}
                                        onChange={(e) => setNombreAsesor(e.target.value)}
                                        className="input-field animate-fade-in"
                                        required
                                    >
                                        <option value="">-- Seleccionar Asesor --</option>
                                        {advisorsList.map((a) => (
                                            <option key={a.id} value={`${a.firstName} ${a.lastName}`}>
                                                {a.academicDegree ? `${a.academicDegree === 'Doctor' ? 'Dr.' : a.academicDegree === 'Magíster' ? 'Mg.' : 'Ing.'} ` : ''}{a.firstName} {a.lastName}
                                            </option>
                                        ))}
                                    </select>
                                )}
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

                        {/* Jurado Dictaminador (Opcional) */}
                        <div className="pt-5 border-t border-surface-200 dark:border-surface-700 space-y-4 bg-surface-50/30 dark:bg-surface-800/10 p-4 rounded-2xl border border-surface-200/50 dark:border-surface-700/50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <Users className="w-4.5 h-4.5 text-primary-500" />
                                    Jurado Dictaminador (Opcional)
                                </h3>
                                <p className="text-[10px] text-gray-400">Si no se especifica, se generarán nombres genéricos.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Presidente */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Presidente</label>
                                        <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer hover:text-primary-500 select-none">
                                            <input
                                                type="checkbox"
                                                checked={isManualPresidente}
                                                onChange={(e) => {
                                                    setIsManualPresidente(e.target.checked);
                                                    if (e.target.checked) setJuradoPresidenteNombre('');
                                                }}
                                                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 w-2.5 h-2.5"
                                            />
                                            Manual
                                        </label>
                                    </div>
                                    {isManualPresidente ? (
                                        <div className="space-y-1.5 animate-fade-in">
                                            <input
                                                type="text"
                                                value={juradoPresidenteNombre}
                                                onChange={(e) => setJuradoPresidenteNombre(e.target.value)}
                                                className="input-field py-1.5 text-xs"
                                                placeholder="Nombre del Presidente"
                                            />
                                            <select
                                                value={juradoPresidenteGrado}
                                                onChange={(e) => setJuradoPresidenteGrado(e.target.value)}
                                                className="input-field py-1.5 text-xs"
                                            >
                                                <option value="Doctor">Doctor (Dr.)</option>
                                                <option value="Magíster">Magíster (Mg.)</option>
                                                <option value="Ingeniero">Ingeniero (Ing.)</option>
                                                <option value="Licenciado">Licenciado (Lic.)</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <select
                                            value={juradoPresidenteNombre}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setJuradoPresidenteNombre(val);
                                                const found = juriesList.find(j => `${j.firstName} ${j.lastName}` === val);
                                                if (found?.academicDegree) setJuradoPresidenteGrado(found.academicDegree);
                                            }}
                                            className="input-field text-xs animate-fade-in"
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {juriesList.map(j => (
                                                <option key={j.id} value={`${j.firstName} ${j.lastName}`}>
                                                    {j.academicDegree ? `${j.academicDegree === 'Doctor' ? 'Dr.' : j.academicDegree === 'Magíster' ? 'Mg.' : 'Ing.'} ` : ''}{j.firstName} {j.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Secretario */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Secretario</label>
                                        <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer hover:text-primary-500 select-none">
                                            <input
                                                type="checkbox"
                                                checked={isManualSecretario}
                                                onChange={(e) => {
                                                    setIsManualSecretario(e.target.checked);
                                                    if (e.target.checked) setJuradoSecretarioNombre('');
                                                }}
                                                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 w-2.5 h-2.5"
                                            />
                                            Manual
                                        </label>
                                    </div>
                                    {isManualSecretario ? (
                                        <div className="space-y-1.5 animate-fade-in">
                                            <input
                                                type="text"
                                                value={juradoSecretarioNombre}
                                                onChange={(e) => setJuradoSecretarioNombre(e.target.value)}
                                                className="input-field py-1.5 text-xs"
                                                placeholder="Nombre del Secretario"
                                            />
                                            <select
                                                value={juradoSecretarioGrado}
                                                onChange={(e) => setJuradoSecretarioGrado(e.target.value)}
                                                className="input-field py-1.5 text-xs"
                                            >
                                                <option value="Doctor">Doctor (Dr.)</option>
                                                <option value="Magíster">Magíster (Mg.)</option>
                                                <option value="Ingeniero">Ingeniero (Ing.)</option>
                                                <option value="Licenciado">Licenciado (Lic.)</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <select
                                            value={juradoSecretarioNombre}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setJuradoSecretarioNombre(val);
                                                const found = juriesList.find(j => `${j.firstName} ${j.lastName}` === val);
                                                if (found?.academicDegree) setJuradoSecretarioGrado(found.academicDegree);
                                            }}
                                            className="input-field text-xs animate-fade-in"
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {juriesList.map(j => (
                                                <option key={j.id} value={`${j.firstName} ${j.lastName}`}>
                                                    {j.academicDegree ? `${j.academicDegree === 'Doctor' ? 'Dr.' : j.academicDegree === 'Magíster' ? 'Mg.' : 'Ing.'} ` : ''}{j.firstName} {j.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Vocal */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Vocal</label>
                                        <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer hover:text-primary-500 select-none">
                                            <input
                                                type="checkbox"
                                                checked={isManualVocal}
                                                onChange={(e) => {
                                                    setIsManualVocal(e.target.checked);
                                                    if (e.target.checked) setJuradoVocalNombre('');
                                                }}
                                                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500 w-2.5 h-2.5"
                                            />
                                            Manual
                                        </label>
                                    </div>
                                    {isManualVocal ? (
                                        <div className="space-y-1.5 animate-fade-in">
                                            <input
                                                type="text"
                                                value={juradoVocalNombre}
                                                onChange={(e) => setJuradoVocalNombre(e.target.value)}
                                                className="input-field py-1.5 text-xs"
                                                placeholder="Nombre del Vocal"
                                            />
                                            <select
                                                value={juradoVocalGrado}
                                                onChange={(e) => setJuradoVocalGrado(e.target.value)}
                                                className="input-field py-1.5 text-xs"
                                            >
                                                <option value="Doctor">Doctor (Dr.)</option>
                                                <option value="Magíster">Magíster (Mg.)</option>
                                                <option value="Ingeniero">Ingeniero (Ing.)</option>
                                                <option value="Licenciado">Licenciado (Lic.)</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <select
                                            value={juradoVocalNombre}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setJuradoVocalNombre(val);
                                                const found = juriesList.find(j => `${j.firstName} ${j.lastName}` === val);
                                                if (found?.academicDegree) setJuradoVocalGrado(found.academicDegree);
                                            }}
                                            className="input-field text-xs animate-fade-in"
                                        >
                                            <option value="">-- Seleccionar --</option>
                                            {juriesList.map(j => (
                                                <option key={j.id} value={`${j.firstName} ${j.lastName}`}>
                                                    {j.academicDegree ? `${j.academicDegree === 'Doctor' ? 'Dr.' : j.academicDegree === 'Magíster' ? 'Mg.' : 'Ing.'} ` : ''}{j.firstName} {j.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Selección y Gestión de Plantilla */}
                        <div className="pt-4 border-t border-surface-200 dark:border-surface-700">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Plantilla de {type === 'FINAL_THESIS' ? 'Tesis' : 'Proyecto de Tesis'} a usar (Opcional)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowUploadModal(true)}
                                    className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-350 font-semibold flex items-center gap-1 transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Guardar nueva plantilla
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <select
                                        value={selectedTemplateId}
                                        onChange={(e) => handleTemplateSelect(e.target.value)}
                                        className="input-field w-full pr-10 animate-fade-in"
                                        disabled={templateUploading}
                                    >
                                        <option value="">Ninguna (Formato Estándar)</option>
                                        {savedTemplates.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.name} ({t.fileName})
                                            </option>
                                        ))}
                                    </select>
                                    {templateUploading && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <RefreshCw className="w-4 h-4 text-primary-500 animate-spin" />
                                        </div>
                                    )}
                                </div>
                                {selectedTemplateId && selectedTemplateId !== 'standard' && (
                                    <button
                                        type="button"
                                        onClick={(e) => handleDeleteTemplate(selectedTemplateId, e)}
                                        className="p-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 rounded-xl transition-all"
                                        title="Eliminar plantilla guardada"
                                    >
                                        <Trash2 className="w-4.5 h-4.5" />
                                    </button>
                                )}
                            </div>
                            {templateStyles && (
                                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Estilo de plantilla cargado: {templateStyles.fontFamily || 'Arial'}, interlineado {templateStyles.lineSpacing || '1.5'}, márgenes {templateStyles.margins?.top || '2.54'}cm.
                                </p>
                            )}
                        </div>

                        {/* Campos Dinámicos Requeridos por la Plantilla */}
                        {requiredFields.length > 0 && (
                            <div className="pt-4 border-t border-surface-200 dark:border-surface-700 bg-amber-50/5 dark:bg-amber-900/5 p-4 rounded-xl border border-amber-200/20">
                                <span className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-3">
                                    <Layers className="w-4 h-4" /> Campos requeridos por la plantilla institucional
                                </span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {requiredFields.map((field) => (
                                        <div key={field.key} className="space-y-1">
                                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">{field.label}</label>
                                            {field.type === 'select' ? (
                                                <select
                                                    value={dynamicValues[field.key] || ''}
                                                    onChange={(e) => setDynamicValues({ ...dynamicValues, [field.key]: e.target.value })}
                                                    className="input-field"
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
                                                    value={dynamicValues[field.key] || ''}
                                                    onChange={(e) => setDynamicValues({ ...dynamicValues, [field.key]: e.target.value })}
                                                    className="input-field"
                                                    required={field.required}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
                            Generar Borrador Completo de {type === 'FINAL_THESIS' ? 'Tesis' : 'Proyecto de Tesis'}
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
                        <h3 className="text-xl font-bold">Generando borrador de {type === 'FINAL_THESIS' ? 'Tesis (Informe Final)' : 'Proyecto de Tesis'}</h3>
                        <p className="text-gray-400 text-sm mt-1">Por favor espera, la IA está redactando los capítulos detalladamente...</p>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-surface-200 dark:bg-surface-700 h-2.5 rounded-full overflow-hidden">
                        <div
                            className="bg-primary-600 h-full transition-all duration-500 rounded-full"
                            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                        />
                    </div>

                    <div className="bg-surface-50 dark:bg-surface-800/50 p-4 rounded-xl border border-surface-200 dark:border-surface-700">
                        <p className="text-xs uppercase font-semibold text-primary-500 tracking-wider">
                            Paso {currentStep + 1} de {steps.length}: {steps[currentStep]?.label}
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
                            {(type === 'FINAL_THESIS'
                                ? [
                                    { key: 'prelims', label: '1. Páginas Preliminares', icon: FileText },
                                    { key: 'cap1', label: '2. Cap. I: Introducción', icon: BookOpen },
                                    { key: 'cap_marco', label: '3. Cap. II: Marco Teórico', icon: BookMarked },
                                    { key: 'cap_metodo', label: '4. Cap. III: Método', icon: Layers },
                                    { key: 'cap_res', label: '5. Cap. IV: Resultados', icon: Sparkles },
                                    { key: 'cap_disc', label: '6. Cap. V: Discusión/Rec.', icon: FileText },
                                    { key: 'conclusiones', label: '7. Conclusiones', icon: CheckCircle2 },
                                    { key: 'refs', label: '8. Referencias Bibliográficas', icon: FileText },
                                    { key: 'anexos', label: '9. Anexos Obligatorios', icon: CheckCircle2 }
                                  ]
                                : [
                                    { key: 'prelims', label: '1. Páginas Preliminares', icon: FileText },
                                    { key: 'cap1', label: '2. Cap. I: Introducción', icon: BookOpen },
                                    { key: 'cap2', label: '3. Cap. II: Método', icon: Layers },
                                    { key: 'cap3', label: '4. Cap. III: Aspectos Adm.', icon: BookMarked },
                                    { key: 'refs', label: '5. Referencias Bibliográficas', icon: FileText },
                                    { key: 'anexos', label: '6. Anexos Obligatorios', icon: CheckCircle2 }
                                  ]
                            ).map((tab) => {
                                const TabIcon = tab.icon;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl text-left transition-all ${activeTab === tab.key
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

                                    {thesisData.preliminares?.indice_general && (
                                        <div className="bg-surface-100 dark:bg-surface-800 p-4 rounded-xl border border-surface-200 dark:border-surface-700">
                                            <h4 className="text-xs uppercase text-primary-500 tracking-wider">Esquema del Índice General</h4>
                                            <ul className="list-disc pl-5 mt-2 text-xs space-y-1">
                                                {thesisData.preliminares.indice_general.map((item: string, i: number) => (
                                                    <li key={i}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
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
                                        <h4>1.2 Antecedentes de la investigación</h4>
                                        <p className="whitespace-pre-wrap">{thesisData.capitulo1?.antecedentes}</p>
                                    </div>
                                    <div>
                                        <h4>1.3 Marco Teórico</h4>
                                        <p>{thesisData.capitulo1?.marco_teorico}</p>
                                    </div>
                                    <div>
                                        <h4>1.4 Metodologías alternativas</h4>
                                        <p>{thesisData.capitulo1?.metodologias_alternativas}</p>
                                    </div>
                                    <div>
                                        <h4>1.5 Justificación de la Investigación</h4>
                                        <p>{thesisData.capitulo1?.justificacion}</p>
                                    </div>
                                    <div>
                                        <h4>1.6 Formulación del Problema</h4>
                                        {thesisData.capitulo1?.formulacion_problema && typeof thesisData.capitulo1.formulacion_problema === 'object' ? (
                                            <div className="space-y-2 mt-2">
                                                <p className="text-gray-800 dark:text-gray-200">
                                                    <strong>Problema General:</strong> {thesisData.capitulo1.formulacion_problema.general}
                                                </p>
                                                <p className="text-gray-800 dark:text-gray-200"><strong>Problemas Específicos:</strong></p>
                                                <ul className="list-disc pl-5 text-gray-850 dark:text-gray-250 space-y-1">
                                                    {(thesisData.capitulo1.formulacion_problema.especificos || []).map((obj: string, i: number) => (
                                                        <li key={i}>{obj}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : (
                                            <p className="text-gray-800 dark:text-gray-200">{thesisData.capitulo1?.formulacion_problema}</p>
                                        )}
                                    </div>
                                    <div>
                                        <h4>1.7 Hipótesis</h4>
                                        {thesisData.capitulo1?.hipotesis && typeof thesisData.capitulo1.hipotesis === 'object' ? (
                                            <div className="space-y-2 mt-2">
                                                <p className="text-gray-800 dark:text-gray-200">
                                                    <strong>Hipótesis General:</strong> {thesisData.capitulo1.hipotesis.general}
                                                </p>
                                                <p className="text-gray-800 dark:text-gray-200"><strong>Hipótesis Específicas:</strong></p>
                                                <ul className="list-disc pl-5 text-gray-850 dark:text-gray-250 space-y-1">
                                                    {(thesisData.capitulo1.hipotesis.especificas || []).map((obj: string, i: number) => (
                                                        <li key={i}>{obj}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : (
                                            <p className="text-gray-800 dark:text-gray-200">{thesisData.capitulo1?.hipotesis}</p>
                                        )}
                                    </div>
                                    <div>
                                        <h4>1.8 Objetivos</h4>
                                        {thesisData.capitulo1?.objetivos && typeof thesisData.capitulo1.objetivos === 'object' ? (
                                            <div className="space-y-2 mt-2">
                                                <p className="text-gray-800 dark:text-gray-200">
                                                    <strong>Objetivo General:</strong> {thesisData.capitulo1.objetivos.general}
                                                </p>
                                                <p className="text-gray-800 dark:text-gray-200"><strong>Objetivos Específicos:</strong></p>
                                                <ul className="list-disc pl-5 text-gray-850 dark:text-gray-250 space-y-1">
                                                    {(thesisData.capitulo1.objetivos.especificos || []).map((obj: string, i: number) => (
                                                        <li key={i}>{obj}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : (
                                            <p className="text-gray-800 dark:text-gray-200">{thesisData.capitulo1?.objetivos}</p>
                                        )}
                                    </div>
                                    <div>
                                        <h4>1.9 Limitaciones del Estudio</h4>
                                        <p>{thesisData.capitulo1?.limitaciones}</p>
                                    </div>
                                </div>
                            )}

                            {(activeTab === 'cap2' || activeTab === 'cap_metodo') && (
                                <div className="space-y-6">
                                    <h2>{type === 'FINAL_THESIS' ? 'CAPÍTULO III: MÉTODO' : 'CAPÍTULO II: MÉTODO'}</h2>
                                    <div>
                                        <h4>{type === 'FINAL_THESIS' ? '3.1' : '2.1'} Tipo de investigación</h4>
                                        <p>{metodoData?.tipo_investigacion}</p>
                                        <h4>{type === 'FINAL_THESIS' ? '3.2' : '2.2'} Nivel de investigación</h4>
                                        <p>{metodoData?.nivel_investigacion}</p>
                                        <h4>{type === 'FINAL_THESIS' ? '3.3' : '2.3'} Diseño de investigación</h4>
                                        <p>{metodoData?.diseno_investigacion}</p>
                                    </div>
                                    {metodoData?.poblacion_muestra && (
                                        <div>
                                            <h4>{type === 'FINAL_THESIS' ? '3.4' : '2.4'} Población, muestra y muestreo</h4>
                                            <p><strong>Población:</strong> {metodoData.poblacion_muestra.poblacion}</p>
                                            <p><strong>Muestra:</strong> {metodoData.poblacion_muestra.muestra}</p>
                                            <p><strong>Muestreo:</strong> {metodoData.poblacion_muestra.muestreo}</p>
                                        </div>
                                    )}
                                    {metodoData?.variables && (
                                        <div>
                                            <h4>{type === 'FINAL_THESIS' ? '3.5' : '2.5'} Variables</h4>
                                            <p><strong>Tipo de variables:</strong> {metodoData.variables.tipo}</p>
                                            <h5>Matriz de Operacionalización</h5>
                                            {metodoData.variables.operacionalizacion_tabla && (
                                                <div className="overflow-x-auto my-4">
                                                    <table className="min-w-full text-xs">
                                                        <thead>
                                                            <tr className="bg-surface-100 dark:bg-surface-800">
                                                                <th className="px-3 py-2 text-left">Variable</th>
                                                                <th className="px-3 py-2 text-left">Def. Conceptual</th>
                                                                <th className="px-3 py-2 text-left">Def. Operacional</th>
                                                                <th className="px-3 py-2 text-left">Dimensiones</th>
                                                                <th className="px-3 py-2 text-left">Indicadores</th>
                                                                <th className="px-3 py-2 text-left">Escala</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {metodoData.variables.operacionalizacion_tabla.map((r: any, i: number) => (
                                                                <tr key={i} className="border-t border-surface-200 dark:border-surface-700">
                                                                    <td className="px-3 py-2 font-medium">{r.variable}</td>
                                                                    <td className="px-3 py-2">{r.definicion_conceptual}</td>
                                                                    <td className="px-3 py-2">{r.definicion_operacional}</td>
                                                                    <td className="px-3 py-2">{r.dimensiones}</td>
                                                                    <td className="px-3 py-2">{r.indicadores}</td>
                                                                    <td className="px-3 py-2">{r.escala_medicion}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {metodoData?.tecnicas_instrumentos && (
                                        <div>
                                            <h4>{type === 'FINAL_THESIS' ? '3.6' : '2.6'} Técnicas e instrumentos</h4>
                                            <p><strong>Descripción:</strong> {metodoData.tecnicas_instrumentos.descripcion}</p>
                                            <p><strong>Validación y confiabilidad:</strong> {metodoData.tecnicas_instrumentos.validacion_confiabilidad}</p>
                                        </div>
                                    )}
                                    <div>
                                        <h4>{type === 'FINAL_THESIS' ? '3.7' : '2.7'} Método de análisis de datos</h4>
                                        <p>{metodoData?.metodo_analisis}</p>
                                        <h4>{type === 'FINAL_THESIS' ? '3.8' : '2.8'} Procedimiento</h4>
                                        <p>{metodoData?.procedimiento}</p>
                                        <h4>{type === 'FINAL_THESIS' ? '3.9' : '2.9'} Consideraciones éticas</h4>
                                        <p>{metodoData?.consideraciones_eticas}</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'cap3' && type === 'THESIS' && (
                                <div className="space-y-6">
                                    <h2>CAPÍTULO III: ASPECTOS ADMINISTRATIVOS</h2>
                                    {thesisData.capitulo3?.recursos && (
                                        <div>
                                            <h4>3.1 Recursos</h4>
                                            <p><strong>Personal:</strong> {thesisData.capitulo3.recursos.personal}</p>
                                            <p><strong>Bienes:</strong> {thesisData.capitulo3.recursos.bienes}</p>
                                            <p><strong>Viajes:</strong> {thesisData.capitulo3.recursos.viajes}</p>
                                            <p><strong>Servicios:</strong> {thesisData.capitulo3.recursos.servicios || thesisData.capitulo3.recursos.services}</p>
                                            <p><strong>Tecnológicos:</strong> {thesisData.capitulo3.recursos.tecnologicos}</p>
                                        </div>
                                    )}
                                    {thesisData.capitulo3?.presupuesto_tabla && (
                                        <div>
                                            <h4>3.2 Presupuesto</h4>
                                            <div className="overflow-x-auto my-4">
                                                <table className="min-w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-surface-100 dark:bg-surface-800">
                                                            <th className="px-4 py-2 text-left">Categoría</th>
                                                            <th className="px-4 py-2 text-left">Recurso</th>
                                                            <th className="px-4 py-2 text-left">Unidad</th>
                                                            <th className="px-4 py-2 text-center">Costo Unit.</th>
                                                            <th className="px-4 py-2 text-center">Cant.</th>
                                                            <th className="px-4 py-2 text-right">Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {thesisData.capitulo3.presupuesto_tabla.map((r: any, i: number) => (
                                                            <tr key={i} className="border-t border-surface-200 dark:border-surface-700">
                                                                <td className="px-4 py-2">{r.categoria}</td>
                                                                <td className="px-4 py-2 font-medium">{r.recurso}</td>
                                                                <td className="px-4 py-2">{r.unidad}</td>
                                                                <td className="px-4 py-2 text-center">S/. {r.costo_unitario}</td>
                                                                <td className="px-4 py-2 text-center">{r.cantidad}</td>
                                                                <td className="px-4 py-2 text-right font-medium">S/. {r.costo_total || (r.costo_unitario * r.cantidad)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <h4>3.3 Financiamiento</h4>
                                        <p>{thesisData.capitulo3?.financiamiento}</p>
                                    </div>
                                    {thesisData.capitulo3?.cronograma && (
                                        <div>
                                            <h4>3.4 Cronograma de ejecución</h4>
                                            <p><strong>Período:</strong> {thesisData.capitulo3.cronograma.periodo}</p>
                                            <h5>Diagrama Gantt de Actividades</h5>
                                            {thesisData.capitulo3.cronograma.cronograma_tabla && (
                                                <div className="overflow-x-auto my-4">
                                                    <table className="min-w-full text-xs">
                                                        <thead>
                                                            <tr className="bg-surface-100 dark:bg-surface-800 text-center">
                                                                <th className="px-4 py-2 text-left">Actividad</th>
                                                                <th className="px-2 py-2">M1</th>
                                                                <th className="px-2 py-2">M2</th>
                                                                <th className="px-2 py-2">M3</th>
                                                                <th className="px-2 py-2">M4</th>
                                                                <th className="px-2 py-2">M5</th>
                                                                <th className="px-2 py-2">M6</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {thesisData.capitulo3.cronograma.cronograma_tabla.map((r: any, i: number) => (
                                                                <tr key={i} className="border-t border-surface-200 dark:border-surface-700 text-center">
                                                                    <td className="px-4 py-2 text-left font-medium">{r.actividad}</td>
                                                                    <td className="px-2 py-2 bg-primary-50 dark:bg-primary-950/20">{r.mes_1}</td>
                                                                    <td className="px-2 py-2">{r.mes_2}</td>
                                                                    <td className="px-2 py-2 bg-primary-50 dark:bg-primary-950/20">{r.mes_3}</td>
                                                                    <td className="px-2 py-2">{r.mes_4}</td>
                                                                    <td className="px-2 py-2 bg-primary-50 dark:bg-primary-950/20">{r.mes_5}</td>
                                                                    <td className="px-2 py-2">{r.mes_6}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'cap_marco' && type === 'FINAL_THESIS' && (
                                <div className="space-y-6">
                                    <h2>CAPÍTULO II: MARCO TEÓRICO</h2>
                                    <div>
                                        <h4>2.1 Bases teóricas</h4>
                                        <p className="whitespace-pre-wrap">{thesisData.capitulo2?.bases_teoricas}</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'cap_res' && type === 'FINAL_THESIS' && (
                                <div className="space-y-6">
                                    <h2>CAPÍTULO IV: RESULTADOS</h2>
                                    <div>
                                        <h4>4.1 Análisis descriptivo y contrastación de hipótesis</h4>
                                        <p className="whitespace-pre-wrap">{thesisData.capitulo4?.resultados}</p>
                                    </div>
                                    {thesisData.capitulo4?.resultados_tablas && thesisData.capitulo4.resultados_tablas.map((tab: any, idx: number) => (
                                        <div key={idx} className="mt-6 border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-surface-50 dark:bg-surface-850">
                                            <h5 className="font-bold mb-2">{tab.titulo || `Tabla ${idx + 2}`}</h5>
                                            <div className="overflow-x-auto my-2">
                                                <table className="min-w-full text-xs">
                                                    <thead>
                                                        <tr className="bg-surface-100 dark:bg-surface-800 text-left">
                                                            {(tab.columnas || []).map((col: string, cIdx: number) => (
                                                                <th key={cIdx} className="px-3 py-2">{col}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(tab.filas || []).map((row: any, rIdx: number) => (
                                                            <tr key={rIdx} className="border-t border-surface-200 dark:border-surface-750">
                                                                {(tab.columnas || []).map((col: string, cIdx: number) => (
                                                                    <td key={cIdx} className="px-3 py-2">{row[col]}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                    {thesisData.capitulo4?.resultados_figuras && thesisData.capitulo4.resultados_figuras.map((fig: any, idx: number) => (
                                        <div key={idx} className="mt-6 bg-surface-50 dark:bg-surface-850 p-4 rounded-xl border border-surface-200 dark:border-surface-700 text-center">
                                            <div className="font-bold text-sm mb-2 text-primary-500">[ {fig.titulo || 'Figura'} ]</div>
                                            <div className="text-xs italic text-gray-500 dark:text-gray-400">{fig.titulo || 'Figura'}. {fig.descripcion}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'cap_disc' && type === 'FINAL_THESIS' && (
                                <div className="space-y-6">
                                    <h2>CAPÍTULO V: DISCUSIÓN Y RECOMENDACIONES</h2>
                                    <div>
                                        <h4>5.1 Discusión de los hallazgos</h4>
                                        <p className="whitespace-pre-wrap">{thesisData.capitulo5?.discusion}</p>
                                    </div>
                                    {thesisData.capitulo5?.recomendaciones && (
                                        <div className="mt-6">
                                            <h4>5.2 Recomendaciones</h4>
                                            <ol className="list-decimal pl-5 space-y-2 mt-2">
                                                {thesisData.capitulo5.recomendaciones.map((rec: string, idx: number) => (
                                                    <li key={idx} className="text-gray-700 dark:text-gray-300">{rec}</li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'conclusiones' && type === 'FINAL_THESIS' && (
                                <div className="space-y-6">
                                    <h2>CONCLUSIONES</h2>
                                    <ol className="list-decimal pl-5 space-y-3">
                                        {thesisData.conclusiones?.map((conc: string, idx: number) => (
                                            <li key={idx} className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                                {conc}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            {activeTab === 'refs' && (
                                <div className="space-y-6">
                                    <h2>REFERENCIAS BIBLIOGRÁFICAS</h2>
                                    <p className="text-xs text-gray-400">Total referencias generadas: {thesisData.referencias?.length || 0} (Mínimo requerido: 30)</p>
                                    <div className="pl-6 text-sm space-y-3">
                                        {thesisData.referencias?.map((r: string, i: number) => (
                                            <p key={i} className="-indent-6 pl-6 text-gray-700 dark:text-gray-300">
                                                {r}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'anexos' && (
                                <div className="space-y-6">
                                    <h2>ANEXOS OBLIGATORIOS</h2>
                                    
                                    <div>
                                        <h4>Anexo 1: Matriz de Operacionalización de Variables</h4>
                                        <div className="prose prose-sm dark:prose-invert max-w-none text-xs bg-surface-50 dark:bg-surface-850 p-4 rounded-xl border border-surface-200 dark:border-surface-700 whitespace-pre-wrap">
                                            {thesisData.anexos?.anexo_1}
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <h4>Anexo 2: Matriz de Consistencia</h4>
                                        <div className="prose prose-sm dark:prose-invert max-w-none text-xs bg-surface-50 dark:bg-surface-850 p-4 rounded-xl border border-surface-200 dark:border-surface-700 whitespace-pre-wrap">
                                            {thesisData.anexos?.anexo_2}
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <h4>Anexo 3: Diagrama de Ishikawa</h4>
                                        <div className="text-sm bg-surface-50 dark:bg-surface-850 p-4 rounded-xl border border-surface-200 dark:border-surface-700 whitespace-pre-wrap">
                                            {thesisData.anexos?.anexo_3}
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <h4>Anexo 4: Árbol de Problemas</h4>
                                        <div className="text-sm bg-surface-50 dark:bg-surface-850 p-4 rounded-xl border border-surface-200 dark:border-surface-700 whitespace-pre-wrap">
                                            {thesisData.anexos?.anexo_4}
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <h4>Anexo 5: Árbol de Objetivos</h4>
                                        <div className="text-sm bg-surface-50 dark:bg-surface-850 p-4 rounded-xl border border-surface-200 dark:border-surface-700 whitespace-pre-wrap">
                                            {thesisData.anexos?.anexo_5}
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <h4>Anexo 6: Instrumentos de Recolección de Datos</h4>
                                        <div className="text-sm bg-surface-50 dark:bg-surface-850 p-4 rounded-xl border border-surface-200 dark:border-surface-700 whitespace-pre-wrap">
                                            {thesisData.anexos?.anexo_6}
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <h4>Anexo 7: Constancia de Aplicación de Instrumentos</h4>
                                        <div className="text-sm bg-surface-50 dark:bg-surface-850 p-4 rounded-xl border border-surface-200 dark:border-surface-700 whitespace-pre-wrap">
                                            {thesisData.anexos?.anexo_7}
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        <h4>Anexo 8: Declaración de originalidad y conformidad</h4>
                                        <div className="text-sm bg-surface-50 dark:bg-surface-850 p-4 rounded-xl border border-surface-200 dark:border-surface-700 whitespace-pre-wrap">
                                            {thesisData.anexos?.anexo_8}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal para Guardar Nueva Plantilla */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-up">
                        <div className="flex justify-between items-center pb-2 border-b border-surface-200 dark:border-surface-700">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-150 flex items-center gap-2">
                                <FilePlus2 className="w-5 h-5 text-primary-500" />
                                Guardar Nueva Plantilla
                            </h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setNewTemplateName('');
                                    setNewTemplateFile(null);
                                }}
                                className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg text-gray-400 hover:text-gray-600 transition-all"
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
                                    value={newTemplateName}
                                    onChange={(e) => setNewTemplateName(e.target.value)}
                                    placeholder="Ej. Plantilla UNT 2026 - APA 7"
                                    className="input-field w-full"
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
                                        {newTemplateFile ? newTemplateFile.name : "Haga clic para buscar o arrastre el archivo"}
                                    </span>
                                    <input
                                        type="file"
                                        accept=".docx,.pdf"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setNewTemplateFile(file);
                                            if (file && !newTemplateName) {
                                                const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                                                setNewTemplateName(baseName);
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
                                    setShowUploadModal(false);
                                    setNewTemplateName('');
                                    setNewTemplateFile(null);
                                }}
                                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 bg-surface-100 dark:bg-surface-800 dark:hover:bg-surface-700 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={newTemplateUploading || !newTemplateName.trim() || !newTemplateFile}
                                onClick={async () => {
                                    if (!newTemplateFile || !newTemplateName.trim()) return;
                                    setNewTemplateUploading(true);
                                    setError('');

                                    const formData = new FormData();
                                    formData.append('file', newTemplateFile);
                                    formData.append('name', newTemplateName.trim());
                                    formData.append('documentType', type);

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
                                            setSuccess('¡Plantilla guardada y analizada con éxito!');
                                            setTimeout(() => setSuccess(''), 4000);
                                            setShowUploadModal(false);
                                            setNewTemplateName('');
                                            setNewTemplateFile(null);
                                            
                                            await fetchTemplates();
                                            await handleTemplateSelect(resData.data.id);
                                        }
                                    } catch (err: any) {
                                        setError(`Error al guardar plantilla: ${err.message}`);
                                    } finally {
                                        setNewTemplateUploading(false);
                                    }
                                }}
                                className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-750 disabled:bg-gray-400 rounded-xl transition-all flex items-center gap-1.5"
                            >
                                {newTemplateUploading ? (
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
