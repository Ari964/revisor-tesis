"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneratorService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("util");
const uuid_1 = require("uuid");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
let GeneratorService = class GeneratorService {
    configService;
    apiKey;
    apiModel;
    constructor(configService) {
        this.configService = configService;
        this.apiKey = this.configService.get('GEMINI_API_KEY') || '';
        this.apiModel = this.configService.get('GEMINI_MODEL') || 'gemini-2.5-flash-lite';
    }
    cleanJsonString(str) {
        const cleaned = str.replace(/```json\s?|```/g, '').trim();
        let result = '';
        let inString = false;
        let escape = false;
        for (let i = 0; i < cleaned.length; i++) {
            const char = cleaned[i];
            if (char === '"' && !escape) {
                inString = !inString;
            }
            if (char === '\\' && inString) {
                escape = !escape;
            }
            else {
                escape = false;
            }
            if (inString && (char === '\n' || char === '\r')) {
                result += '\\n';
            }
            else if (inString && char === '\t') {
                result += '\\t';
            }
            else {
                result += char;
            }
        }
        return result;
    }
    async callGemini(systemPrompt, userPrompt, isJson = true) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.apiModel}:generateContent?key=${this.apiKey}`;
        const body = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: `${systemPrompt}\n\n${userPrompt}` }
                    ]
                }
            ],
            generationConfig: isJson ? {
                responseMimeType: 'application/json'
            } : undefined
        };
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
            }
            const resJson = await response.json();
            const text = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                throw new Error('Respuesta vacía de la API de Gemini');
            }
            if (isJson) {
                const cleanedText = this.cleanJsonString(text);
                try {
                    return JSON.parse(cleanedText);
                }
                catch (e) {
                    console.error('Error al parsear JSON. Texto original:', text);
                    console.error('Texto limpio:', cleanedText);
                    throw new Error(`JSON inválido devuelto por la IA: ${e.message}`);
                }
            }
            return text;
        }
        catch (error) {
            console.error('Error al llamar a Gemini:', error.message);
            throw new common_1.InternalServerErrorException(`Fallo en el servicio de IA: ${error.message}`);
        }
    }
    async initThesis(tema, customMetadata = {}) {
        const systemPrompt = `Eres un asesor de investigación metodológica y experto en Ingeniería de Sistemas en la Universidad Nacional de Trujillo. Tu tarea es analizar el tema propuesto por el usuario y estructurar los metadatos iniciales para su tesis.`;
        const userPrompt = `
Tema propuesto: "${tema}"
Datos personalizados proporcionados: ${JSON.stringify(customMetadata)}

Debes generar un objeto JSON con la siguiente estructura exacta:
{
  "metadata": {
    "titulo_proyecto": "Título formal y optimizado de la tesis basado en el tema",
    "nombre_autor": "Nombre completo del autor (usar el provisto o generar uno realista si falta)",
    "nombre_asesor": "Nombre completo del asesor con Dr. (usar el provisto o generar uno realista si falta)",
    "linea_investigacion": "Una de las 5 líneas de investigación del UNT (usar la provista o clasificar en una de: Gestión de Proyectos de TIC, Gestión de Gobierno y Servicios de TIC, Gestión de Desarrollo de Software, Gestión de Infraestructura y Comunicaciones, Gestión de la Seguridad de la Información)",
    "ciudad": "Ciudad (usar la provista o 'Trujillo')",
    "anio": "Año (usar el provisto o 2024)"
  },
  "metodologia_seleccionada": "Determinar cuál de las 3 metodologías es más apta para el tema: 'KDD', 'CRISP-DM' o 'SEMMA'",
  "lineamientos_clave": {
    "problema_central": "Pregunta formal de investigación científica formulada",
    "hipotesis": "Formulación de la hipótesis principal en base al problema",
    "objetivo_general": "Objetivo general de la tesis",
    "objetivos_especificos": ["Objetivo específico 1", "Objetivo específico 2", "Objetivo específico 3", "Objetivo específico 4"]
  }
}
Responde únicamente con el JSON válido.
`;
        return this.callGemini(systemPrompt, userPrompt, true);
    }
    async generateStep(stepIndex, currentData) {
        const meta = currentData.metadata || {};
        const metaSel = currentData.metodologia_seleccionada || 'KDD';
        const lines = currentData.lineamientos_clave || {};
        const systemPrompt = `Eres un redactor académico senior de Ingeniería de Sistemas en la Universidad Nacional de Trujillo. Redactas tesis con rigurosidad científica, tecnicismo y lenguaje formal peruano.`;
        let userPrompt = '';
        switch (stepIndex) {
            case 1: // Preliminares & Resumen
                userPrompt = `
Basado en los siguientes datos de la tesis:
Título: "${meta.titulo_proyecto}"
Autor: "${meta.nombre_autor}"
Asesor: "Dr. ${meta.nombre_asesor}"
Línea de Investigación: "${meta.linea_investigacion}"
Ciudad: "${meta.ciudad}"
Año: "${meta.anio}"

Escribe las secciones preliminares y el resumen. Debes retornar un objeto JSON con la siguiente estructura exacta:
{
  "preliminares": {
    "dedicatoria": "Redacción emotiva de una dedicatoria académica de tesis (máx. 100 palabras)",
    "agradecimientos": "Redacción formal de agradecimientos a la universidad, jurado, asesor y familia",
    "presentacion": "Un párrafo formal y protocolar dirigido al Jurado Dictaminador presentando la tesis para su evaluación",
    "resumen": "Resumen ejecutivo de la tesis estructurado en un solo párrafo largo y formal (250-300 palabras). Debe incluir la problemática, el objetivo general, la metodología elegida (${metaSel}), y las conclusiones esperadas. Todo en tiempo verbal pasado.",
    "palabras_clave": "Escribir entre 5 y 6 palabras clave separadas por comas",
    "abstract": "The translation of the 'resumen' to English. A formal and technical academic abstract (250-300 words). Must use correct scientific grammar in English.",
    "keywords": "The translation of the 'palabras_clave' to English, separated by commas"
  }
}
Responde únicamente con el JSON.
`;
                break;
            case 2: // Capítulo I: Introducción
                userPrompt = `
Redacta el Capítulo I: Introducción completo para la tesis:
Título: "${meta.titulo_proyecto}"
Metodología elegida: "${metaSel}"
Problema Central: "${lines.problema_central}"
Hipótesis: "${lines.hipotesis}"
Objetivo General: "${lines.objetivo_general}"
Objetivos Específicos: ${JSON.stringify(lines.objetivos_especificos)}

Debes retornar un objeto JSON con la siguiente estructura exacta:
{
  "capitulo1": {
    "realidad_problematica": "Redacción formal de la realidad problemática (mín. 400 palabras) que explore el problema en el contexto mundial, nacional y finalmente local en ${meta.ciudad}, explicando detalladamente las deficiencias, necesidades y oportunidades tecnológicas.",
    "antecedentes": "Redacción de los antecedentes del problema (mín. 500 palabras). Debes detallar exactamente 10 antecedentes reales o altamente realistas (5 internacionales y 5 nacionales), detallando el autor, año (entre 2020 y 2024), título del estudio, objetivo, metodología utilizada, resultados principales, y cómo se relaciona con esta tesis. Usa citas formales estilo (Autor, Año).",
    "marco_teorico": "Redacta el marco teórico (mín. 500 palabras). Describe conceptualmente las 3 metodologías estándar en ciencia de datos y software: KDD, CRISP-DM y SEMMA. Luego realiza un análisis comparativo y justifica de forma técnica y rigurosa por qué se ha elegido la metodología ${metaSel} para este proyecto específico.",
    "justificacion": "Redacción de la justificación de la investigación en tres niveles: Justificación Teórica (aporte cognoscitivo), Justificación Práctica (resolución del problema real) y Justificación Metodológica (nuevos métodos/instrumentos).",
    "enunciado_problema": "La formulación definitiva y formal del problema científico: ${lines.problema_central}",
    "hipotesis": "Formulación de la hipótesis principal y operacional del proyecto: ${lines.hipotesis}",
    "objetivos": "Objetivo General: ${lines.objetivo_general}. Objetivos Específicos: ${lines.objetivos_especificos.join(', ')}",
    "limitaciones": "Las limitaciones del estudio (Limitación Espacial: referida al ámbito geográfico e institucional; Limitación Temporal: referida al rango de meses o año de ejecución)."
  }
}
Responde únicamente con el JSON.
`;
                break;
            case 3: // Capítulo II: Métodos
                userPrompt = `
Redacta el Capítulo II: Métodos completo para la tesis:
Título: "${meta.titulo_proyecto}"
Metodología elegida: "${metaSel}"

Debes retornar un objeto JSON con la siguiente estructura exacta:
{
  "capitulo2": {
    "materiales_objeto": "Descripción formal del objeto de estudio (la empresa, el sector o el conjunto de datos que se analiza en la investigación).",
    "materiales_recursos": "Descripción de los recursos personales, bienes, servicios y herramientas tecnológicas empleadas.",
    "materiales_recursos_tabla": [
      { "recurso": "Ej. Servidor Cloud AWS EC2", "descripcion": "Servidor virtual para procesamiento y entrenamiento", "cantidad": "1 unidad" },
      { "recurso": "Ej. Software Python 3.11", "descripcion": "Lenguaje de programación y entorno científico", "cantidad": "Licencia Libre" }
    ],
    "tipo_investigacion": "Especificar el Tipo de investigación (Ej. Aplicada tecnológica), Nivel (Descriptiva/Explicativa) y Régimen (Libre/Orientado), con sustento teórico.",
    "variables_matriz": "Detallar las variables de estudio (independiente, dependiente o variable única) y explicar la Matriz de Operacionalización de Variables indicando dimensiones, indicadores y escala de medición.",
    "procedimiento": "Explicar el procedimiento detallado paso a paso para la recolección, limpieza y procesamiento de datos, describiendo las fases operativas basadas en la metodología ${metaSel}.",
    "consideraciones_eticas": "Descripción formal de las consideraciones éticas aplicadas (confidencialidad de datos, derechos de autor, veracidad de la información)."
  }
}
Asegúrate de incluir exactamente 4 a 6 filas realistas en la 'materiales_recursos_tabla'. Responde únicamente con el JSON.
`;
                break;
            case 4: // Capítulo III: Resultados
                userPrompt = `
Redacta el Capítulo III: Resultados completo para la tesis:
Título: "${meta.titulo_proyecto}"
Metodología elegida: "${metaSel}"

Debes retornar un objeto JSON con la siguiente estructura exacta:
{
  "capitulo3": {
    "analisis_exploratorio": "Redacción técnica detallada del análisis exploratorio de datos (mín. 300 palabras). Debe describir las características de los datos, distribución, correlaciones o tendencias observadas de forma teórica.",
    "preprocesamiento": "Descripción de las técnicas de preprocesamiento aplicadas (normalización, balanceo de datos, codificación de variables, etc.).",
    "entrenamiento_modelos": "Redacción técnica sobre el proceso de entrenamiento de los modelos y su evaluación inicial. Describe las iteraciones y arquitecturas evaluadas.",
    "entrenamiento_modelos_tabla": [
      { "modelo": "Nombre de Algoritmo 1 (Ej. Random Forest)", "exactitud": 0.885, "precision": 0.872, "exhaustividad": 0.891, "f1": 0.881, "tfp": 0.125, "tvp": 0.891, "mcc": 0.762 },
      { "modelo": "Nombre de Algoritmo 2 (Ej. SVM)", "exactitud": 0.842, "precision": 0.851, "exhaustividad": 0.835, "f1": 0.843, "tfp": 0.158, "tvp": 0.835, "mcc": 0.685 },
      { "modelo": "Nombre de Algoritmo 3 (Ej. Red Neuronal MLP)", "exactitud": 0.913, "precision": 0.908, "exhaustividad": 0.915, "f1": 0.911, "tfp": 0.089, "tvp": 0.915, "mcc": 0.824 }
    ],
    "validacion_modelo": "Explicación detallada de los resultados de validación cruzada y pruebas estadísticas aplicadas para confirmar la significancia de los resultados."
  }
}
Asegúrate de llenar la 'entrenamiento_modelos_tabla' con datos numéricos realistas (decimales entre 0 y 1). Responde únicamente con el JSON.
`;
                break;
            case 5: // Capítulo IV & V
                userPrompt = `
Redacta los Capítulos IV (Discusión) y V (Conclusiones y Recomendaciones) para la tesis:
Título: "${meta.titulo_proyecto}"

Debes retornar un objeto JSON con la siguiente estructura exacta:
{
  "capitulo4": {
    "discusion": "Redacción detallada de la Discusión (mín. 400 palabras). Debes contrastar los resultados obtenidos en el Capítulo III con los 10 antecedentes citados en el Capítulo I, analizando fortalezas, debilidades, por qué tu propuesta obtiene mejores o diferentes métricas, y las implicancias tecnológicas."
  },
  "capitulo5": {
    "conclusiones": [
      "Conclusión 1 detallada (referente al logro del objetivo general)",
      "Conclusión 2 detallada (referente al primer objetivo específico)",
      "Conclusión 3 detallada (referente al segundo objetivo específico)",
      "Conclusión 4 detallada (referente al tercer objetivo específico)",
      "Conclusión 5 detallada (referente al aporte/impacto general de la investigación)"
    ],
    "recomendaciones": [
      "Recomendación 1 formal (sobre la escalabilidad o futuras mejoras en el software/modelo)",
      "Recomendación 2 formal (sobre la recolección de datos y actualización de muestras)",
      "Recomendación 3 formal (sobre la adopción del sistema por parte de la organización objeto de estudio)"
    ]
  }
}
Responde únicamente con el JSON.
`;
                break;
            case 6: // Referencias, Apéndices y Anexos
                userPrompt = `
Genera las Referencias Bibliográficas, Apéndices y Anexos finales para la tesis:
Título: "${meta.titulo_proyecto}"

Debes retornar un objeto JSON con la siguiente estructura exacta:
{
  "referencias": [
    "Referencia 1 en formato APA 7ma edición",
    "Referencia 2 en formato APA 7ma edición",
    "... hasta 30 referencias"
  ],
  "apendices": {
    "apendice_a": "Una tabla textual estructurada en markdown que sintetice los antecedentes internacionales (Autor, Año, Título, Aporte).",
    "apendice_b": "Descripción detallada y estructurada en formato textual de un Árbol de Problemas coherente con el tema (Problema central, 3 Causas, 3 Efectos).",
    "apendice_c": "Descripción detallada del Árbol de Objetivos correspondiente (Objetivo central, 3 Medios, 3 Fines)."
  },
  "anexos": {
    "anexo_a": "Descripción y tabla de distribución de frecuencia o Chi-cuadrado aplicada a la validación de hipótesis.",
    "anexo_b": "Formatos, cuestionarios, o métricas técnicas del entorno experimental.",
    "anexo_c": "Formato de Declaración Jurada de Autoría y no plagio formal, incluyendo firmas del autor.",
    "anexo_d": "Formato de Carta de Autorización de Publicación en el Repositorio Institucional de la UNT."
  }
}

REGLAS DE REFERENCIAS (CRÍTICO):
1. Exactamente 30 referencias.
2. Formato APA 7ª Edición estricto.
3. Mínimo 80% (24 referencias) deben ser de los últimos 5 años (2020-2024).
4. Mínimo 80% (24 referencias) deben estar escritas en inglés (artículos indexados).
5. 80% de las referencias deben ser artículos de revistas científicas, 20% libros.

Responde únicamente con el JSON.
`;
                break;
            default:
                throw new Error('Paso no válido en la secuencia');
        }
        return this.callGemini(systemPrompt, userPrompt, true);
    }
    async exportThesis(thesisData, format) {
        const tempId = (0, uuid_1.v4)();
        const tempDir = path.join(process.cwd(), 'temp_exports');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const jsonPath = path.join(tempDir, `${tempId}.json`);
        const outputPath = path.join(tempDir, `${tempId}.${format}`);
        // Write JSON payload
        fs.writeFileSync(jsonPath, JSON.stringify(thesisData, null, 2), 'utf-8');
        // Path to the python script with fallbacks for dist vs src locations
        let scriptPath = path.join(__dirname, 'scripts', 'generate_docs.py');
        if (!fs.existsSync(scriptPath)) {
            scriptPath = path.join(process.cwd(), 'src', 'modules', 'generator', 'scripts', 'generate_docs.py');
        }
        if (!fs.existsSync(scriptPath)) {
            scriptPath = path.join(process.cwd(), 'packages', 'api', 'src', 'modules', 'generator', 'scripts', 'generate_docs.py');
        }
        try {
            // Execute the python script
            // Wait: call using 'python' or 'python.exe'
            const command = `python "${scriptPath}" "${jsonPath}" "${outputPath}" "${format}"`;
            await execPromise(command);
            // Read output file
            if (!fs.existsSync(outputPath)) {
                throw new Error(`El script de Python no generó el archivo de salida en: ${outputPath}`);
            }
            const buffer = fs.readFileSync(outputPath);
            // Clean up files in background (or immediately)
            try {
                fs.unlinkSync(jsonPath);
                fs.unlinkSync(outputPath);
            }
            catch (e) {
                console.error('Error al limpiar archivos temporales:', e);
            }
            return buffer;
        }
        catch (error) {
            console.error('Error durante la ejecución de exportThesis:', error.message);
            // Clean up files just in case
            try {
                if (fs.existsSync(jsonPath))
                    fs.unlinkSync(jsonPath);
                if (fs.existsSync(outputPath))
                    fs.unlinkSync(outputPath);
            }
            catch { }
            throw new common_1.InternalServerErrorException(`Error al generar el documento exportable: ${error.message}`);
        }
    }
};
exports.GeneratorService = GeneratorService;
exports.GeneratorService = GeneratorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], GeneratorService);
//# sourceMappingURL=generator.service.js.map