import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import * as mammoth from 'mammoth';

const execPromise = promisify(exec);

interface GenerationSession {
  status: 'processing' | 'completed' | 'error';
  currentStep: number;
  totalSteps: number;
  progress: number;
  stepLabel: string;
  type: 'THESIS' | 'ARTICLE' | 'FINAL_THESIS';
  data: any;
  error?: string | null;
}

@Injectable()
export class GeneratorService {
  private apiKey: string = '';
  private apiModel: string = '';
  private maxRetries: number;
  private sessions = new Map<string, GenerationSession>();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // Load AI configuration from environment via ConfigService
    const provider = this.configService.get<string>('AI_PROVIDER') || 'gemini';
    if (provider === 'gemini') {
      this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
      this.apiModel = this.configService.get<string>('AI_MODEL') || 'gemini-2.5-flash';
    } else if (provider === 'gpt-oss') {
      this.apiKey = this.configService.get<string>('GPT_OSS_API_KEY') || '';
      this.apiModel = this.configService.get<string>('AI_MODEL') || 'gpt-oss-120b';
    }
    this.maxRetries = parseInt(
      this.configService.get<string>('AI_MAX_RETRIES') || 
      this.configService.get<string>('GEMINI_MAX_RETRIES') || 
      '3',
      10
    );
  }

  private detectMetadataFromText(text: string): { institution: string; faculty: string; school: string } {
    const result = {
      institution: 'UNIVERSIDAD NACIONAL DE TRUJILLO',
      faculty: 'FACULTAD DE INGENIERÍA',
      school: 'ESCUELA PROFESIONAL DE INGENIERÍA DE SISTEMAS'
    };

    if (!text) return result;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    for (const line of lines.slice(0, 35)) {
      const upperLine = line.toUpperCase();
      
      if (upperLine.includes('UNIVERSIDAD') && result.institution === 'UNIVERSIDAD NACIONAL DE TRUJILLO') {
        result.institution = line.replace(/[\r\n,.:]+$/, '').trim();
      } else if (upperLine.includes('FACULTAD') && result.faculty === 'FACULTAD DE INGENIERÍA') {
        result.faculty = line.replace(/[\r\n,.:]+$/, '').trim();
      } else if ((upperLine.includes('ESCUELA') || upperLine.includes('CARRERA') || upperLine.includes('PROGRAMA') || upperLine.includes('DEPARTAMENTO')) && 
                 result.school === 'ESCUELA PROFESIONAL DE INGENIERÍA DE SISTEMAS') {
        result.school = line.replace(/[\r\n,.:]+$/, '').trim();
      }
    }

    return result;
  }

  private balanceBrackets(str: string): string {
    let inString = false;
    let escape = false;
    const stack: ('{' | '[')[] = [];
    
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (inString) {
        if (escape) {
          escape = false;
        } else if (char === '\\') {
          escape = true;
        } else if (char === '"') {
          inString = false;
        }
      } else {
        if (char === '"') {
          inString = true;
        } else if (char === '{') {
          stack.push('{');
        } else if (char === '[') {
          stack.push('[');
        } else if (char === '}') {
          if (stack[stack.length - 1] === '{') {
            stack.pop();
          }
        } else if (char === ']') {
          if (stack[stack.length - 1] === '[') {
            stack.pop();
          }
        }
      }
    }
    
    let closing = '';
    while (stack.length > 0) {
      const open = stack.pop();
      if (open === '{') {
        closing += '}';
      } else if (open === '[') {
        closing += ']';
      }
    }
    
    return str + closing;
  }

  private cleanJsonString(str: string): string {
    let cleaned = str.replace(/```json\s?|```/g, '').trim();
    
    let startIndex = cleaned.indexOf('{');
    const bracketIndex = cleaned.indexOf('[');
    if (bracketIndex !== -1 && (startIndex === -1 || bracketIndex < startIndex)) {
      startIndex = bracketIndex;
    }
    if (startIndex !== -1) {
      cleaned = cleaned.substring(startIndex);
    }
    
    let result = '';
    let inString = false;
    let escape = false;
    
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      
      if (inString) {
        if (escape) {
          escape = false;
          
          let isValidEscape = false;
          if (char === '"' || char === '\\' || char === '/' || char === 'n' || char === 'r' || char === 't') {
            isValidEscape = true;
          } else if (char === 'u') {
            const hex = cleaned.substring(i + 1, i + 5);
            if (/^[0-9a-fA-F]{4}$/.test(hex)) {
              isValidEscape = true;
            }
          } else if (char === 'b' || char === 'f') {
            const nextChar = cleaned[i + 1] || '';
            const isNextAlphabetic = /^[a-zA-Z]$/.test(nextChar);
            if (!isNextAlphabetic) {
              isValidEscape = true;
            }
          }
          
          if (isValidEscape) {
            result += '\\' + char;
          } else {
            result += '\\\\' + char;
          }
        } else if (char === '\\') {
          escape = true;
        } else if (char === '"') {
          inString = false;
          result += '"';
        } else if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          result += '\\r';
        } else if (char === '\t') {
          result += '\\t';
        } else {
          result += char;
        }
      } else {
        if (char === '"') {
          inString = true;
          result += '"';
        } else {
          result += char;
        }
      }
    }
    
    if (inString) {
      if (escape) {
        result += '\\';
      }
      result += '"';
    }
    
    result = result.replace(/,\s*([}\]])/g, '$1');
    
    result = result.trim();
    if (result.endsWith(',')) {
      result = result.substring(0, result.length - 1);
    }
    result = result.replace(/,\s*"[^"]*"\s*:?\s*$/, '');
    
    return this.balanceBrackets(result);
  }

  private normalizeStepResult(stepIndex: number, result: any, isFinalThesis = false): any {
    const thesisKeys: Record<number, string> = {
      1: 'preliminares',
      2: 'capitulo1',
      3: 'capitulo2',
      4: 'capitulo3',
      5: 'referencias',
      6: 'anexos'
    };

    const finalThesisKeys: Record<number, string> = {
      1: 'preliminares',
      2: 'capitulo1',
      3: 'capitulo2',
      4: 'capitulo3',
      5: 'capitulo4',
      6: 'capitulo5',
      7: 'conclusiones',
      8: 'referencias',
      9: 'anexos'
    };
    
    const key = isFinalThesis ? finalThesisKeys[stepIndex] : thesisKeys[stepIndex];
    if (!key) return result;

    if (!result || typeof result !== 'object') {
      return { [key]: result };
    }

    if (result[key] !== undefined) {
      return result;
    }

    return { [key]: result };
  }

  /**
   * Unified AI call supporting Gemini or GPT‑OSS based on configuration.
   * Handles retry with exponential back‑off and jitter.
   */
  private async callAI(systemPrompt: string, userPrompt: string, isJson = true): Promise<any> {
    const provider = this.configService.get<string>('AI_PROVIDER') || 'gemini';
    let url: string;
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: any;

    if (provider === 'gemini') {
      url = `https://generativelanguage.googleapis.com/v1beta/models/${this.apiModel}:generateContent?key=${this.apiKey}`;
      body = {
        contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
        generationConfig: isJson ? { responseMimeType: 'application/json' } : undefined,
      };
    } else if (provider === 'gpt-oss') {
      url = `https://api.gpt-oss.com/v1/completions`;
      body = {
        model: this.apiModel,
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        max_tokens: 2000,
        temperature: 0.7,
        stream: false,
        json: isJson,
      };
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    } else {
      throw new InternalServerErrorException(`AI provider "${provider}" no soportado`);
    }

    let attempts = 0;
    const maxRetries = this.maxRetries;
    let lastError: any = null;

    while (attempts <= maxRetries) {
      try {
        const response = await fetch(url, { 
          method: 'POST', 
          headers, 
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(35050)
        });
        if (!response.ok) {
          const errorText = await response.text();
          const status = response.status;
          if (status === 429 || status === 503) {
            attempts++;
            if (attempts > maxRetries) {
              throw new Error(`${provider} API returned ${status} (Max retries reached): ${errorText}`);
            }
            const backoffMs = Math.min(120000, Math.pow(2, attempts) * 1000 + Math.random() * 1000);
            console.warn(`[${provider.toUpperCase()} API] Got status ${status}. Retrying attempt ${attempts}/${maxRetries} in ${Math.round(backoffMs)}ms...`);
            await new Promise(r => setTimeout(r, backoffMs));
            continue;
          }
          throw new Error(`${provider} API returned ${status}: ${errorText}`);
        }

        const resJson: any = await response.json();
        const text = isJson ? (resJson?.choices?.[0]?.message?.content || resJson?.candidates?.[0]?.content?.parts?.[0]?.text) : resJson?.choices?.[0]?.message?.content;
        if (!text) {
          throw new Error('Respuesta vacía de la API de IA');
        }
        if (isJson) {
          const cleanedText = this.cleanJsonString(text);
          try {
            return JSON.parse(cleanedText);
          } catch (e: any) {
            // Attempt to repair by slicing up to the error position if there are trailing/extra characters
            const matchPos = e.message.match(/position (\d+)/i);
            if (matchPos) {
              const pos = parseInt(matchPos[1], 10);
              try {
                return JSON.parse(cleanedText.substring(0, pos).trim());
              } catch (innerErr) {
                // If it still fails, fall through to normal error handling
              }
            }

            console.error('Error al parsear JSON. Texto original:', text);
            console.error('Texto limpio:', cleanedText);
            let context = '';
            if (matchPos) {
              const pos = parseInt(matchPos[1], 10);
              const start = Math.max(0, pos - 80);
              const end = Math.min(cleanedText.length, pos + 80);
              context = cleanedText.substring(start, end);
              console.error(`Contexto del error JSON en pos ${pos}:`, context);
            }
            throw new Error(`JSON inválido devuelto por la IA: ${e.message}${context ? ` cerca de: "...${context.replace(/[\n\r]+/g, ' ')}..."` : ''}`);
          }
        }
        return text;
      } catch (error: any) {
        lastError = error;
        if (error.message.includes('fetch failed') || error.message.includes('socket hang up') || error.message.includes('ECONNRESET')) {
          attempts++;
          if (attempts > maxRetries) break;
          const backoffMs = Math.min(120000, Math.pow(2, attempts) * 1000 + Math.random() * 1000);
          console.warn(`[${provider.toUpperCase()} API] Network error: ${error.message}. Retrying attempt ${attempts}/${maxRetries} in ${Math.round(backoffMs)}ms...`);
          await new Promise(r => setTimeout(r, backoffMs));
          continue;
        }
        break;
      }
    }
    console.error('Error al llamar a IA:', lastError?.message);
    throw new InternalServerErrorException(`Fallo en el servicio de IA: ${lastError?.message}`);
  }

  /**
   * Detecta heurísticamente el tipo de documento y los campos requeridos
   * basándose en palabras clave del texto, sin llamar a la IA.
   * Esto garantiza respuesta inmediata.
   */
  private detectTemplateHeuristic(text: string): any {
    const upper = text.toUpperCase();

    // --- Detección del tipo de documento ---
    let documentType: 'ARTICLE' | 'THESIS' | 'PROJECT_THESIS' = 'PROJECT_THESIS';
    const isArticle = upper.includes('ARTÍCULO') || upper.includes('ARTICULO') ||
      upper.includes('ABSTRACT') || upper.includes('KEYWORDS') ||
      upper.includes('REVISTA') || upper.includes('JOURNAL') ||
      (upper.includes('RESUMEN') && upper.includes('PALABRAS CLAVE') && upper.includes('INTRODUCCIÓN'));
    const isFinalThesis = upper.includes('RESULTADOS') && upper.includes('DISCUSIÓN') &&
      upper.includes('CONCLUSIONES') && upper.includes('RECOMENDACIONES');
    const isProjectThesis = upper.includes('PROYECTO') || upper.includes('CRONOGRAMA') ||
      upper.includes('PRESUPUESTO') || upper.includes('PLANTEAMIENTO DEL PROBLEMA');

    if (isArticle) {
      documentType = 'ARTICLE';
    } else if (isFinalThesis && !isProjectThesis) {
      documentType = 'THESIS';
    } else {
      documentType = 'PROJECT_THESIS';
    }

    // --- Detección de reglas ---
    const isRevision = upper.includes('REVISIÓN') || upper.includes('REVISION SISTEMÁTICA') || upper.includes('REVISIÓN BIBLIOGRÁFICA');
    const detectedRules = {
      titleWordLimit: 20,
      abstractWordLimit: documentType === 'ARTICLE' ? 250 : 200,
      structureType: isRevision ? 'IMRyD' : 'IMRD',
      referenceCountMin: isRevision ? 50 : 30,
      referenceRecencyPercentage: 80,
      conclusionsFormat: 'single_paragraph' as 'single_paragraph' | 'bullet_list',
      otherRules: [] as string[]
    };

    // --- Campos requeridos según tipo ---
    const requiredFields: any[] = [];
    if (documentType === 'ARTICLE') {
      requiredFields.push(
        { key: 'nombre_autor_principal', label: 'Nombre del Autor Principal', type: 'text', required: true, placeholder: 'Ej: Juan García López' },
        { key: 'orcid_autor_principal', label: 'ORCID del Autor Principal', type: 'text', required: false, placeholder: 'Ej: https://orcid.org/0000-0002-1823-9023' },
        { key: 'institucion_afiliacion', label: 'Institución de Afiliación', type: 'text', required: true, placeholder: 'Ej: Universidad Nacional de Trujillo' },
        { key: 'email_correspondencia', label: 'Correo de Correspondencia', type: 'text', required: true, placeholder: 'Ej: autor@unitru.edu.pe' }
      );
    } else {
      // THESIS or PROJECT_THESIS
      const hasJurado = upper.includes('JURADO') || upper.includes('DICTAMINADOR') || upper.includes('PRESIDENTE') || upper.includes('SECRETARIO') || upper.includes('VOCAL');
      const hasAsesor = upper.includes('ASESOR') || upper.includes('DIRECTOR');
      requiredFields.push(
        { key: 'nombre_autor', label: 'Nombre del Autor', type: 'text', required: true, placeholder: 'Ej: María López Sánchez' },
        { key: 'linea_investigacion', label: 'Línea de Investigación', type: 'text', required: true, placeholder: 'Ej: Gestión de Proyectos de TIC' },
        { key: 'ciudad', label: 'Ciudad', type: 'text', required: true, placeholder: 'Ej: Trujillo' },
        { key: 'anio', label: 'Año', type: 'number', required: true, placeholder: String(new Date().getFullYear()) }
      );
      if (hasAsesor) {
        requiredFields.push(
          { key: 'nombre_asesor', label: 'Nombre del Asesor', type: 'text', required: true, placeholder: 'Ej: Dr. Roberto Pérez Castro' },
          { key: 'grado_asesor', label: 'Grado Académico del Asesor', type: 'select', required: true, options: ['Doctor', 'Magíster', 'Ingeniero', 'Licenciado'], placeholder: 'Seleccionar grado' }
        );
      }
      if (hasJurado) {
        requiredFields.push(
          { key: 'jurado_presidente_nombre', label: 'Nombre del Presidente del Jurado', type: 'text', required: false, placeholder: 'Ej: Dr. Carlos Mendoza Torres' },
          { key: 'jurado_presidente_grado', label: 'Grado del Presidente del Jurado', type: 'select', required: false, options: ['Doctor', 'Magíster', 'Ingeniero'], placeholder: 'Seleccionar grado' },
          { key: 'jurado_secretario_nombre', label: 'Nombre del Secretario del Jurado', type: 'text', required: false, placeholder: 'Ej: Mg. Ana Flores Vega' },
          { key: 'jurado_secretario_grado', label: 'Grado del Secretario del Jurado', type: 'select', required: false, options: ['Doctor', 'Magíster', 'Ingeniero'], placeholder: 'Seleccionar grado' },
          { key: 'jurado_vocal_nombre', label: 'Nombre del Vocal del Jurado', type: 'text', required: false, placeholder: 'Ej: Ing. Luis Salinas Rojas' },
          { key: 'jurado_vocal_grado', label: 'Grado del Vocal del Jurado', type: 'select', required: false, options: ['Doctor', 'Magíster', 'Ingeniero'], placeholder: 'Seleccionar grado' }
        );
      }
    }

    return { documentType, detectedRules, requiredFields };
  }

  private async analyzeTemplateWithAI(text: string): Promise<any> {
    // 1. Run fast heuristic detection immediately (no AI call needed)
    const heuristic = this.detectTemplateHeuristic(text);

    // 2. Only call AI if we need to refine field detection.
    //    Use only the first 3000 chars (enough for structure detection) with a 20s timeout.
    const shortText = text.substring(0, 3000);
    const systemPrompt = `Eres un experto en documentos académicos. Analiza el siguiente fragmento de una plantilla y devuelve ÚNICAMENTE un JSON con este formato:
{
  "documentType": "ARTICLE" | "THESIS" | "PROJECT_THESIS",
  "requiredFields": [
    { "key": "snake_case_id", "label": "Etiqueta UI", "type": "text|number|select|boolean", "required": true|false, "placeholder": "ejemplo", "options": [] }
  ]
}
Solo incluye campos que la plantilla explícitamente solicita (ej. ORCID, jurado, asesor, año, ciudad). No inventes campos. Si es THESIS/PROJECT_THESIS incluye: nombre_autor, nombre_asesor, grado_asesor, jurado (presidente/secretario/vocal nombre+grado), linea_investigacion, ciudad, anio.`;

    const userPrompt = `Plantilla (primeros 3000 caracteres):
---
${shortText}
---`;

    try {
      // Wrap with a 20-second timeout to avoid blocking the HTTP response too long
      const aiPromise = this.callAI(systemPrompt, userPrompt, true);
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('AI analysis timeout after 20s')), 20000)
      );
      const result = await Promise.race([aiPromise, timeoutPromise]) as any;
      if (!result) throw new Error('Empty AI result');
      // Merge: prefer AI's documentType if more precise, but use heuristic's detectedRules
      return {
        documentType: result.documentType || heuristic.documentType,
        detectedRules: heuristic.detectedRules,
        requiredFields: (result.requiredFields && result.requiredFields.length > 0)
          ? result.requiredFields
          : heuristic.requiredFields
      };
    } catch (e) {
      console.warn('AI template analysis failed or timed out, using heuristic fallback:', (e as Error).message);
      // Return heuristic result immediately
      return heuristic;
    }
  }

  /**
   * Procesa plantillas subidas tanto .docx como .pdf.
   */
  async parseTemplate(file: Express.Multer.File): Promise<any> {
    const tempId = uuidv4();
    const tempDir = path.join(process.cwd(), 'temp_templates');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileExt = file.originalname.toLowerCase().endsWith('.pdf') ? '.pdf' : '.docx';
    const tempFilePath = path.join(tempDir, `${tempId}${fileExt}`);
    fs.writeFileSync(tempFilePath, file.buffer);

    let parsedResult: any = null;
    let fullText = '';

    try {
      if (fileExt === '.pdf') {
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(file.buffer);
        fullText = pdfData.text || '';
        
        const headings: string[] = [];
        const lines = fullText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        
        for (const line of lines) {
          if (line.match(/^(CAPÍTULO|CAPITULO|INTRODUCCIÓN|INTRODUCCION|MÉTODO|METODO|RESULTADOS|DISCUSIÓN|DISCUSION|CONCLUSIONES|REFERENCIAS|ANEXOS)/i) ||
              (line.length < 60 && line.toUpperCase() === line && !line.match(/[0-9]/))) {
            if (headings.length < 50) {
              headings.push(line);
            }
          }
        }

        parsedResult = {
          text: fullText.substring(0, 4000),
          styles: {
            fontFamily: 'Times New Roman',
            lineSpacing: 1.5,
            margins: { top: 2.54, bottom: 2.54, left: 2.54, right: 2.54 },
            headings: headings,
            structure: {
              ...this.detectMetadataFromText(fullText),
              chapters: headings.filter(h => h.toUpperCase().includes('CAPÍTULO') || h.toUpperCase().includes('CAPITULO'))
            }
          }
        };
      } else {
        let scriptPath = path.join(__dirname, 'scripts', 'parse_docx.py');
        if (!fs.existsSync(scriptPath)) {
          scriptPath = path.join(process.cwd(), 'src', 'modules', 'generator', 'scripts', 'parse_docx.py');
        }
        if (!fs.existsSync(scriptPath)) {
          scriptPath = path.join(process.cwd(), 'packages', 'api', 'src', 'modules', 'generator', 'scripts', 'parse_docx.py');
        }

        let stdoutJson: any = null;
        try {
          const command = `python "${scriptPath}" "${tempFilePath}"`;
          const { stdout } = await execPromise(command, { timeout: 15000 });
          stdoutJson = JSON.parse(stdout);
        } catch (e: any) {
          console.error('Error running Python docx parser, falling back to mammoth:', e);
        }

        if (stdoutJson && !stdoutJson.error) {
          fullText = stdoutJson.full_text || stdoutJson.text || '';
          const headings = stdoutJson.styles?.headings || [];
          stdoutJson.styles = stdoutJson.styles || {};
          stdoutJson.styles.structure = {
            ...this.detectMetadataFromText(fullText),
            chapters: headings.filter((h: string) => h.toUpperCase().includes('CAPÍTULO') || h.toUpperCase().includes('CAPITULO'))
          };
          if (stdoutJson.logo) {
            stdoutJson.styles.logo = stdoutJson.logo;
          }
          
          parsedResult = stdoutJson;
        } else {
          const mammothResult = await mammoth.extractRawText({ buffer: file.buffer });
          fullText = mammothResult.value;
          const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          const headings = lines.filter(line => 
            line.match(/^(CAPÍTULO|CAPITULO|INTRODUCCIÓN|INTRODUCCION|MÉTODO|METODO|RESULTADOS|DISCUSIÓN|DISCUSION|CONCLUSIONES|REFERENCIAS|ANEXOS)/i) ||
            (line.length < 60 && line.toUpperCase() === line && !line.match(/[0-9]/))
          );

          parsedResult = {
            text: fullText.substring(0, 4000),
            styles: {
              fontFamily: 'Arial',
              lineSpacing: 1.5,
              margins: { top: 2.54, bottom: 2.54, left: 2.54, right: 2.54 },
              headings: headings.slice(0, 50),
              structure: {
                ...this.detectMetadataFromText(fullText),
                chapters: headings.filter(h => h.toUpperCase().includes('CAPÍTULO') || h.toUpperCase().includes('CAPITULO'))
              }
            }
          };
        }
      }

      // Cleanup temp file
      try { fs.unlinkSync(tempFilePath); } catch {}

      if (parsedResult) {
        // Use first 3000 chars: enough for document type and field detection.
        // analyzeTemplateWithAI uses heuristics first + AI with 20s timeout as refinement.
        const aiAnalysis = await this.analyzeTemplateWithAI(fullText.substring(0, 3000));
        return {
          ...parsedResult,
          fullText: fullText,
          documentType: aiAnalysis.documentType,
          detectedRules: aiAnalysis.detectedRules,
          requiredFields: aiAnalysis.requiredFields
        };
      }
      
      throw new Error('No se pudo parsear el contenido de la plantilla.');
    } catch (err: any) {
      try { fs.unlinkSync(tempFilePath); } catch {}
      throw new BadRequestException(`Error al analizar plantilla: ${err.message}`);
    }
  }

  /**
   * Inicia el proceso de generación asíncrona.
   */
  startGeneration(
    type: 'THESIS' | 'ARTICLE' | 'FINAL_THESIS',
    tema: string,
    metadata: any,
    templateText?: string,
    templateStyles?: any
  ): string {
    const sessionId = uuidv4();
    
    this.sessions.set(sessionId, {
      status: 'processing',
      currentStep: 0,
      totalSteps: type === 'THESIS' ? 7 : (type === 'FINAL_THESIS' ? 10 : 5),
      progress: 0,
      stepLabel: 'Inicializando estructura...',
      type,
      data: {},
      error: null
    });

    if (type === 'THESIS') {
      this.generateThesisAsync(sessionId, tema, metadata, templateText, templateStyles);
    } else if (type === 'FINAL_THESIS') {
      this.generateFinalThesisAsync(sessionId, tema, metadata, templateText, templateStyles);
    } else {
      this.generateArticleAsync(sessionId, tema, metadata, templateText, templateStyles);
    }

    return sessionId;
  }

  getGenerationStatus(sessionId: string): GenerationSession | undefined {
    return this.sessions.get(sessionId);
  }

  private async generateThesisAsync(
    sessionId: string,
    tema: string,
    metadata: any,
    templateText?: string,
    templateStyles?: any
  ) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      session.stepLabel = 'Analizando tema y definiendo objetivos...';
      session.progress = 5;
      this.sessions.set(sessionId, { ...session });

      const customMetadata = { ...metadata, templateText, templateStyles };
      const initData = await this.initThesis(tema, customMetadata);

      let currentData = { ...initData };
      currentData.templateStyles = templateStyles;

      session.currentStep = 0;
      session.progress = 14;
      session.data = currentData;
      this.sessions.set(sessionId, { ...session });

      const stepsCount = 6;
      for (let s = 1; s <= stepsCount; s++) {
        const stepLabels = [
          '',
          'Generando preliminares, dedicatoria, agradecimientos y resumen...',
          'Redactando realidad problemática, antecedentes y justificación...',
          'Estructurando diseño, variables, población, técnicas y procedimientos...',
          'Generando recursos, presupuesto consolidado y cronograma Gantt...',
          'Construyendo 30 referencias bibliográficas en formato APA 7 con DOI...',
          'Generando matrices de operacionalización, consistencia y diagramas auxiliares...'
        ];

        session.currentStep = s;
        session.stepLabel = stepLabels[s];
        session.progress = Math.round(14 + (s / stepsCount) * 80);
        this.sessions.set(sessionId, { ...session });

        if (!currentData.metadata) {
          currentData.metadata = {};
        }
        currentData.metadata.extractedTemplateText = templateText;
        currentData.metadata.templateStyles = templateStyles;

        const stepResult = await this.generateStep(s, currentData);
        currentData = { ...currentData, ...stepResult };
        
        session.data = currentData;
        this.sessions.set(sessionId, { ...session });
      }

      session.status = 'completed';
      session.progress = 100;
      session.stepLabel = '¡Tesis generada exitosamente!';
      this.sessions.set(sessionId, { ...session });
    } catch (err: any) {
      console.error(`Error in generateThesisAsync for session ${sessionId}:`, err);
      session.status = 'error';
      session.error = err.message || 'Error desconocido durante la generación.';
      session.stepLabel = 'Error durante la generación de la tesis.';
      this.sessions.set(sessionId, { ...session });
    }
  }

  private async generateFinalThesisAsync(
    sessionId: string,
    tema: string,
    metadata: any,
    templateText?: string,
    templateStyles?: any
  ) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      session.stepLabel = 'Analizando tema y definiendo objetivos...';
      session.progress = 5;
      this.sessions.set(sessionId, { ...session });

      const customMetadata = { ...metadata, templateText, templateStyles };
      const initData = await this.initThesis(tema, customMetadata);

      let currentData = { ...initData, is_final_thesis: true };
      currentData.templateStyles = templateStyles;

      session.currentStep = 0;
      session.progress = 10;
      session.data = currentData;
      this.sessions.set(sessionId, { ...session });

      const stepsCount = 9;
      for (let s = 1; s <= stepsCount; s++) {
        const stepLabels = [
          '',
          'Generando preliminares, dedicatoria, agradecimientos y resumen en pasado...',
          'Redactando realidad problemática, antecedentes (10 estudios) y justificación en pasado...',
          'Estructurando bases teóricas y conceptos fundamentales en el Capítulo II...',
          'Redactando diseño, variables, población/muestra y procedimientos en pasado...',
          'Construyendo análisis de datos real, tablas descriptivas y contraste de hipótesis...',
          'Estructurando discusión comparativa frente a la literatura y recomendaciones...',
          'Redactando las conclusiones finales alineadas con objetivos e hipótesis...',
          'Construyendo 30 referencias bibliográficas en formato APA 7 con DOI...',
          'Generando matrices de operacionalización, consistencia y diagramas auxiliares...'
        ];

        session.currentStep = s;
        session.stepLabel = stepLabels[s];
        session.progress = Math.round(10 + (s / stepsCount) * 90);
        this.sessions.set(sessionId, { ...session });

        if (!currentData.metadata) {
          currentData.metadata = {};
        }
        currentData.metadata.extractedTemplateText = templateText;
        currentData.metadata.templateStyles = templateStyles;

        const stepResult = await this.generateFinalThesisStep(s, currentData);
        currentData = { ...currentData, ...stepResult };
        
        session.data = currentData;
        this.sessions.set(sessionId, { ...session });
      }

      session.status = 'completed';
      session.progress = 100;
      session.stepLabel = '¡Tesis generada exitosamente!';
      this.sessions.set(sessionId, { ...session });
    } catch (err: any) {
      console.error(`Error in generateFinalThesisAsync for session ${sessionId}:`, err);
      session.status = 'error';
      session.error = err.message || 'Error desconocido durante la generación.';
      session.stepLabel = 'Error durante la generación de la tesis.';
      this.sessions.set(sessionId, { ...session });
    }
  }

  async generateFinalThesisStep(stepIndex: number, currentData: any) {
    const meta = currentData.metadata || {};
    const metaSel = currentData.metodologia_seleccionada || 'KDD';
    const lines = currentData.lineamientos_clave || {};

    const juradoPresidente = meta.jurado_presidente_nombre 
      ? `${meta.jurado_presidente_grado || 'Dr.'} ${meta.jurado_presidente_nombre}`
      : 'Dr. Roberto Carlos Medina';

    const juradoSecretario = meta.jurado_secretario_nombre 
      ? `${meta.jurado_secretario_grado || 'Dr.'} ${meta.jurado_secretario_nombre}`
      : 'Dr. Julio César Alvarez';

    const juradoVocal = meta.jurado_vocal_nombre 
      ? `${meta.jurado_vocal_grado || 'Dr.'} ${meta.jurado_vocal_nombre}`
      : (meta.nombre_asesor ? `${meta.grado_asesor || 'Dr.'} ${meta.nombre_asesor}` : 'Dr. Roberto Carlos Medina');

    const asesorConGrado = meta.nombre_asesor
      ? `${meta.grado_asesor || 'Dr.'} ${meta.nombre_asesor}`
      : 'Dr. Asesor Académico';

    let templateInstructions = '';
    if (meta.extractedTemplateText) {
      templateInstructions = `
REGLA DE ORO GLOBAL: El contenido temático de la plantilla no debe replicarse en absoluto. La plantilla sirve única y exclusivamente como un molde de estructura, jerarquía y formato.
Fuerza la redacción a adoptar un tono exhaustivo y estructurar el texto según el índice y el esqueleto de la plantilla provista a continuación.

TEXTO EXTRAÍDO DE LA PLANTILLA DEL USUARIO (MOLDE DE ESTRUCTURA Y FORMATO):
---
${meta.extractedTemplateText.substring(0, 3000)}
---`;
    }

    const inst = meta.templateStyles?.structure?.institution || 'Universidad Nacional de Trujillo';
    const systemPrompt = `Eres un asesor de investigación metodológica y redactor académico senior de Ingeniería de Sistemas en la ${inst}. Redactas con el más alto rigor científico, tecnicismo y lenguaje académico formal en español, respetando la normativa APA 7 y la tercera persona impersonal.
Normas de Redacción Críticas:
- Redacción en tercera persona impersonal ("se analizó", "se diseñó", "se evaluó").
- NUNCA uses tiempo futuro para describir el desarrollo, el método o los resultados. Todo debe estar en tiempo PASADO / PRETÉRITO por tratarse de la tesis final de una investigación ya ejecutada.
- Tiempo presente se reserva únicamente para bases teóricas estáticas o hechos conceptuales permanentes.
- Coherencia metodológica completa, lenguaje formal and sin contenido redundante.${templateInstructions}`;

    let userPrompt = '';

    switch(stepIndex) {
      case 1:
        userPrompt = `
Basado en los siguientes datos de la Tesis:
Título: "${meta.titulo_proyecto}"
Autor: "${meta.nombre_autor}"
Asesor: "${asesorConGrado}"
Línea de Investigación: "${meta.linea_investigacion}"
Ciudad: "${meta.ciudad}"
Año: "${meta.anio}"

Genera las secciones preliminares obligatorias. Debes retornar un objeto JSON con la estructura exacta:
{
  "preliminares": {
    "dedicatoria": "Redacción de una dedicatoria académica formal (máx. 100 palabras).",
    "agradecimientos": "Redacción formal de agradecimientos a la universidad, jurado, asesor y familia (máx. 150 palabras).",
    "presentacion": "Un párrafo formal y protocolar dirigido al Jurado Dictaminador de la Escuela de Ingeniería de Sistemas presentando el informe final de tesis para su sustentación.",
    "resumen": "Resumen ejecutivo estructurado de la tesis final en un solo párrafo largo y formal (250-300 palabras). Debe detallar la realidad problemática, el objetivo general, la metodología utilizada (${metaSel}), los resultados cuantitativos clave obtenidos y la conclusión general del estudio. Todo redactado en tiempo pasado (pretérito) para las acciones realizadas.",
    "palabras_clave": "Escribir entre 5 y 6 palabras clave separadas por comas",
    "abstract": "The exact formal translation of the 'resumen' to academic English (250-300 words). Must use correct scientific terminology in English in past tense.",
    "keywords": "The English translation of the 'palabras_clave', separated by commas",
    "jurado": {
      "presidente": "${juradoPresidente}",
      "secretario": "${juradoSecretario}",
      "vocal": "${juradoVocal}"
    },
    "indice_general": [
      "DEDICATORIA", "AGRADECIMIENTOS", "PRESENTACIÓN", "RESUMEN", "ABSTRACT",
      "ÍNDICE DE TABLAS", "ÍNDICE DE FIGURAS", "ÍNDICE DE ANEXOS",
      "CAPÍTULO I: INTRODUCCIÓN", "1.1 Realidad problemática", "1.2 Antecedentes de la investigación", "1.3 Justificación de la investigación", "1.4 Formulación del problema", "1.5 Hipótesis", "1.6 Objetivos", "1.7 Limitaciones del estudio",
      "CAPÍTULO II: MARCO TEÓRICO", "2.1 Bases teóricas", "2.2 Bases conceptuales",
      "CAPÍTULO III: MÉTODO", "3.1 Tipo de investigación", "3.2 Nivel de investigación", "3.3 Diseño de investigación", "3.4 Población, muestra y muestreo", "3.5 Variables", "3.6 Técnicas e instrumentos de recolección de datos", "3.7 Método de análisis de datos", "3.8 Procedimiento realizado", "3.9 Consideraciones éticas",
      "CAPÍTULO IV: RESULTADOS", "4.1 Análisis descriptivo de los datos", "4.2 Contrastación de hipótesis",
      "CAPÍTULO V: DISCUSIÓN Y RECOMENDACIONES", "5.1 Discusión de los hallazgos", "5.2 Recomendaciones",
      "CONCLUSIONES",
      "REFERENCIAS BIBLIOGRÁFICAS", "ANEXOS OBLIGATORIOS"
    ],
    "indice_tablas": [
      "Tabla 1. Matriz de Operacionalización de Variables",
      "Tabla 2. Análisis descriptivo y distribución de frecuencias de las variables del estudio",
      "Tabla 3. Coeficientes de contraste y significancia estadística (Prueba de Wilcoxon / t-Student)"
    ],
    "indice_figuras": [
      "Figura 1. Esquema del diseño de investigación",
      "Figura 2. Esquema del procedimiento metodológico",
      "Figura 3. Distribución y comparación del rendimiento de las variables en pre-test y post-test",
      "Figura 4. Diagrama de Ishikawa de causas y efectos",
      "Figura 5. Árbol de problemas",
      "Figura 6. Árbol de objetivos"
    ],
    "indice_anexos": [
      "Anexo 1. Matriz de operacionalización de variables",
      "Anexo 2. Matriz de consistencia",
      "Anexo 3. Diagrama de Ishikawa",
      "Anexo 4. Árbol de problemas",
      "Anexo 5. Árbol de objetivos",
      "Anexo 6. Instrumentos de recolección de datos",
      "Anexo 7. Constancia de aplicación de instrumentos",
      "Anexo 8. Declaración de originalidad y conformidad"
    ]
  }
}
Responde únicamente con el JSON.
`;
        break;

      case 2:
        userPrompt = `
Redacta el Capítulo I: Introducción completo para la tesis final:
Título: "${meta.titulo_proyecto}"
Metodología utilizada: "${metaSel}"
Problema Central: "${lines.problema_central}"
Hipótesis: "${lines.hipotesis}"
Objetivo General: "${lines.objetivo_general}"
Objetivos Específicos: ${JSON.stringify(lines.objetivos_especificos)}
Ciudad: "${meta.ciudad}"

Debes redactar todo en PROSA CONTINUA (sin viñetas ni apartados vacíos) y con alto nivel de profundidad.
Regla de tiempo verbal: Describe la problemática y antecedentes usando el tiempo pasado / pretérito ("se constató", "encontraron", "se evaluó").

Retorna un objeto JSON con la estructura exacta:
{
  "capitulo1": {
    "realidad_problematica": "Redacción formal de la realidad problemática (mín. 600 palabras). Explore de manera continua la problemática en el contexto internacional, nacional y local en ${meta.ciudad}. Explique la situación empírica que motivó el estudio en pasado.",
    "antecedentes": "Redacción de antecedentes (mín. 800 palabras). Detalle exactamente 10 antecedentes académicos de los últimos 5 años (5 internacionales y 5 nacionales). Para cada uno, en prosa continua fluida y tiempo pasado, incluya autor, año, título, objetivo, metodología, resultados principales y la relación/aporte directo con esta tesis. Use citas formales estilo (Autor, Año).",
    "justificacion": "Redacción de la justificación (mín. 300 palabras) abordando conveniencia, relevancia social, implicancias prácticas, valor teórico y utilidad metodológica en tiempo pasado.",
    "formulacion_problema": {
      "general": "${lines.problema_central}",
      "especificos": [
        "Pregunta específica de investigación 1 relacionada al primer objetivo específico",
        "Pregunta específica de investigación 2 relacionada al segundo objetivo específico",
        "Pregunta específica de investigación 3 relacionada al tercer objetivo específico"
      ]
    },
    "hipotesis": {
      "general": "${lines.hipotesis}",
      "especificas": [
        "Hipótesis específica 1 correspondiente al problema específico 1",
        "Hipótesis específica 2 correspondiente al problema específico 2"
      ]
    },
    "objetivos": {
      "general": "${lines.objective_general || lines.objetivo_general}",
      "especificos": ${JSON.stringify(lines.objetivos_especificos)}
    },
    "limitaciones": "Redacción formal en pasado de las limitaciones de la investigación: Limitaciones Espaciales (ámbito geográfico en ${meta.ciudad}), Temporales (meses de ejecución), Técnicas y Operativas."
  }
}
Responde únicamente con el JSON.
`;
        break;

      case 3:
        userPrompt = `
Redacta el Capítulo II: Marco Teórico para la tesis final:
Título de la tesis: "${meta.titulo_proyecto}"
Variables de investigación: ${JSON.stringify(lines)}

Desarrolla en profundidad y prosa continua los fundamentos científicos de la investigación.
Retorna un objeto JSON con la estructura exacta:
{
  "capitulo2": {
    "bases_teoricas": "Redacción de las bases teóricas de nivel de posgrado (mín. 900 palabras). Desarrolle de forma rigurosa y en subsecciones conceptuales (ej. 2.1.1 Conceptos del Método, 2.1.2 Modelos de Predicción) las bases científicas, paradigmas teóricos, modelos matemáticos o de machine learning, y el estado del arte tecnológico relevante a las variables y al ecosistema propuesto."
  }
}
Responde únicamente con el JSON.
`;
        break;

      case 4:
        userPrompt = `
Redacta el Capítulo III: Método completo para la tesis final:
Título: "${meta.titulo_proyecto}"
Metodología utilizada: "${metaSel}"

REGLA DE ORO: Redactar todo en tiempo PASADO / PRETÉRITO impersonal ("se seleccionó", "se operacionalizó", "se aplicó") ya que el estudio se completó.

Retorna un objeto JSON con la estructura exacta:
{
  "capitulo3": {
    "tipo_investigacion": "Clasifique y justifique teóricamente el tipo de investigación aplicado: Según su finalidad (ej. Aplicada Tecnológica) y según su técnica de contrastación (ej. Cuantitativa experimental o correlacional). Redactado en pasado.",
    "nivel_investigacion": "Determine y justifique el nivel de investigación (ej. Explicativo, Descriptivo-Correlacional o Aplicado) alcanzado en pasado.",
    "diseno_investigacion": "Describa detalladamente el diseño de la investigación ejecutado (ej. Preexperimental, cuasiexperimental o no experimental/diseño tecnológico) y represente el diseño mediante un esquema textual (ej. G1 X O1).",
    "poblacion_muestra": {
      "poblacion": "Defina y justifique la población de estudio de la que se extrajeron los datos en pasado.",
      "muestra": "Defina y justifique la muestra representativa y los criterios de inclusión/exclusión aplicados.",
      "muestreo": "Describa el método de muestreo probabilístico o no probabilístico que se empleó."
    },
    "variables": {
      "tipo": "Identifique las variables de la investigación: Variable Independiente (método propuesto), Variable Dependiente (métricas de mejora) e Intervinientes.",
      "operacionalizacion_tabla": [
        {
          "variable": "Variable Independiente: [Nombre de la Variable]",
          "definicion_conceptual": "Definición teórica y científica citando autores.",
          "definicion_operacional": "Cómo se implementó o manipuló esta variable en el estudio.",
          "dimensiones": "Fases o componentes principales de la variable.",
          "indicadores": "Métricas u observaciones empíricas.",
          "escala_medicion": "Escala de medición (Nominal, Ordinal, de Intervalo o de Razón)."
        },
        {
          "variable": "Variable Dependiente: [Nombre de la Variable]",
          "definicion_conceptual": "Definición teórica y científica de las métricas/efectos.",
          "definicion_operacional": "Cómo se midió en el entorno experimental.",
          "dimensiones": "Dimensiones de rendimiento o impacto.",
          "indicadores": "Indicadores de rendimiento, exactitud, tiempos, costos, etc.",
          "escala_medicion": "Escala de medición correspondiente."
        }
      ]
    },
    "tecnicas_instrumentos": {
      "descripcion": "Describa las técnicas de recolección de datos (observación técnica, encuestas, minería de datos) y los instrumentos utilizados (fichas de registro, cuestionarios, APIs de extracción). Indique las fuentes de información.",
      "validacion_confiabilidad": "Explique detalladamente el proceso de validación por Juicio de Expertos (cálculo de coeficiente V de Aiken) y los métodos estadísticos de Confiabilidad aplicados a los instrumentos (ej. Alfa de Cronbach, KR-20 o estabilidad temporal)."
    },
    "metodo_analisis": "Desarrolle las técnicas de análisis de datos que se aplicaron. Describa la estadística descriptiva (medias, desviación, tablas de frecuencia) y la estadística inferencial (pruebas de hipótesis como t-Student, Chi-Cuadrado, ANOVA o Wilcoxon) que validaron las hipótesis del proyecto.",
    "procedimiento": "Describa minuciosamente las fases metodológicas basadas en la metodología ${metaSel} ejecutadas para el desarrollo del proyecto de investigación. Incluya un esquema metodológico textual.",
    "consideraciones_eticas": "Desarrolle de forma ética la investigación: Consentimiento informado, confidencialidad y anonimato de datos, protección de datos sensibles, integridad científica y originalidad (evitando el plagio y respetando derechos de autor)."
  }
}
Responde únicamente con el JSON.
`;
        break;

      case 5:
        userPrompt = `
Redacta el Capítulo IV: Resultados para la tesis final:
Título: "${meta.titulo_proyecto}"

Este capítulo debe presentar los hallazgos empíricos y estadísticos de la investigación.
Regla de tiempo verbal: Todo en tiempo PASADO / PRETÉRITO ("se obtuvo", "se observó", "las pruebas revelaron").
Mínimo 800 palabras estructuradas en párrafos con un máximo de 125 palabras.
Debe hacer referencia explícita a la Tabla 2, Tabla 3 y Figura 3 en el texto.

Retorna un objeto JSON con la estructura exacta:
{
  "capitulo4": {
    "resultados": "Redacción completa y formal de la sección Resultados, interpretando las tablas y figuras de forma científica y exhaustiva. Explique detalladamente el comportamiento de las métricas antes (Pre-test) y después (Post-test) de implementar la propuesta.",
    "resultados_tablas": [
      {
        "titulo": "Tabla 2. Análisis descriptivo y distribución de frecuencias de las variables de estudio",
        "columnas": ["Variable/Dimensión", "Media", "Desv. Estándar", "Mínimo", "Máximo"],
        "filas": [
          { "Variable/Dimensión": "Variable Independiente", "Media": "84.50", "Desv. Estándar": "6.20", "Mínimo": "68.00", "Máximo": "96.00" },
          { "Variable/Dimensión": "Variable Dependiente (Pre-test)", "Media": "52.30", "Desv. Estándar": "8.40", "Mínimo": "32.00", "Máximo": "74.00" },
          { "Variable/Dimensión": "Variable Dependiente (Post-test)", "Media": "88.10", "Desv. Estándar": "4.90", "Mínimo": "76.00", "Máximo": "98.00" }
        ]
      },
      {
        "titulo": "Tabla 3. Coeficientes de contraste y significancia estadística (Prueba de Wilcoxon / t-Student)",
        "columnas": ["Par comparado", "Valor Estadístico (Z / t)", "Grados de Libertad (gl)", "Valor p (Sig. asintótica)", "Decisión"],
        "filas": [
          { "Par comparado": "Post-test vs Pre-test", "Valor Estadístico (Z / t)": "-4.82", "Grados de Libertad (gl)": "29", "Valor p (Sig. asintótica)": "0.000", "Decisión": "Rechazar Hipótesis Nula (p < 0.05)" }
        ]
      }
    ],
    "resultados_figuras": [
      {
        "titulo": "Figura 3. Distribución y comparación del rendimiento de las variables en pre-test y post-test",
        "descripcion": "Gráfico de barras que contrasta el incremento en las medias de la variable dependiente tras la aplicación del método propuesto."
      }
    ]
  }
}
Responde únicamente con el JSON.
`;
        break;

      case 6:
        userPrompt = `
Redacta el Capítulo V: Discusión y Recomendaciones para la tesis final:
Título de la tesis: "${meta.titulo_proyecto}"

La discusión debe contrastar críticamente los resultados obtenidos contra los 10 antecedente internacionales y nacionales presentados en la Introducción.
Regla de tiempo verbal: Mezcla de tiempo pasado para los resultados propios y tiempo presente para la discusión teórica general.
Mínimo 600 palabras en prosa estructurada.
Adicionalmente, genera una lista de exactamente 5 recomendaciones prácticas y metodológicas para futuros investigadores o la organización.

Retorna un objeto JSON con la estructura exacta:
{
  "capitulo5": {
    "discusion": "Tu redacción completa de la Discusión aquí. Analice si las hipótesis se confirmaron, explique las causas de las mejoras empíricas observadas, compare críticamente con los hallazgos de autores previos, describa las limitaciones del estudio y sugiera líneas de investigación futura en base a lo descubierto.",
    "recomendaciones": [
      "Recomendación 1: Metodológica para ampliar el tamaño muestral o el período evaluado.",
      "Recomendación 2: Práctica para la implementación tecnológica del ecosistema en producción.",
      "Recomendación 3: De desarrollo para integrar nuevos algoritmos o modelos alternativos sugeridos.",
      "Recomendación 4: Organizacional para capacitar al personal involucrado en la nueva solución.",
      "Recomendación 5: Científica sobre la replicabilidad del diseño experimental en otros dominios."
    ]
  }
}
Responde únicamente con el JSON.
`;
        break;

      case 7:
        userPrompt = `
Genera las Conclusiones del informe final de tesis:
Título de la tesis: "${meta.titulo_proyecto}"
Objetivos planteados: "${lines.objetivo_general}"

Genera una lista de exactamente 5 conclusiones numeradas coherentes con la hipótesis y objetivos de la investigación.
Regla verbal: Redactado en tiempo pasado (pretérito) que describa de manera concluyente y objetiva lo que se demostró y logró.

Retorna un objeto JSON con la estructura exacta:
{
  "conclusiones": [
    "Conclusión principal 1: Determina el logro del objetivo general y validación de la hipótesis principal con datos de significancia estadística.",
    "Conclusión específica 2: Referente al logro del primer objetivo específico y su impacto.",
    "Conclusión específica 3: Referente al logro del segundo objetivo específico y su comportamiento.",
    "Conclusión específica 4: Referente al logro del tercer objetivo específico.",
    "Conclusión general 5: Aporte metodológico y contribución al dominio de la ingeniería de sistemas."
  ]
}
Responde únicamente con el JSON.
`;
        break;

      case 8:
        userPrompt = `
Genera las Referencias Bibliográficas finales para la tesis:
Título: "${meta.titulo_proyecto}"

Retorna un objeto JSON con la estructura exacta:
{
  "referencias": [
    "Referencia 1 estilo APA 7ma edición completa",
    "Referencia 2 estilo APA 7ma edición completa",
    "... hasta completar las 30 referencias"
  ]
}

REQUISITOS ESTRICTOS DE LAS REFERENCIAS (CRÍTICO):
1. Exactamente 30 referencias reales o altamente hiperrealistas.
2. Formato APA 7ª Edición estricto, ordenadas alfabéticamente.
3. Mínimo 80% (24 referencias) deben ser artículos de revistas científicas indexadas de los últimos 5 años (2021-2026).
4. Mínimo 80% (24 referencias) deben estar escritas en inglés (artículos científicos indexados en bases como Scopus, WoS, IEEE, ScienceDirect).
5. Incluye el identificador DOI en formato URL (https://doi.org/10.xxxx/xxxx) en el 80% de las referencias donde corresponda.
6. Solo incluye referencias que guarden relación directa con el título y las variables de esta tesis.
Responde únicamente con el JSON.
`;
        break;

      case 9:
        userPrompt = `
Genera los Anexos Obligatorios para la Tesis (informe final):
Título: "${meta.titulo_proyecto}"
Metodología utilizada: "${metaSel}"
Problema Central: "${lines.problema_central}"
Hipótesis: "${lines.hipotesis}"
Objetivo General: "${lines.objetivo_general}"
Objetivos Específicos: ${JSON.stringify(lines.objetivos_especificos)}

REGLA VERBAL: Redactar los anexos administrativos, cartas e instrumentos haciendo referencia al estudio en tiempo PASADO ("se aplicó", "se ejecutó").

Debes retornar un objeto JSON con la siguiente estructura exacta (plana, sin envolver en "anexos"):
{
  "anexo_1": "MATRIZ DE OPERACIONALIZACIÓN DE VARIABLES. Una tabla estructurada en markdown que relacione: Variable (Independiente/Dependiente), Definición Conceptual, Definición Operacional, Dimensiones, Indicadores y Escalas de Medición. Debe ser altamente técnica.",
  "anexo_2": "MATRIZ DE CONSISTENCIA. Una tabla estructurada en markdown con 5 columnas: Problema (General y Específicos), Objetivos (General y Específicos), Hipótesis (General y Específicas), Variables y Dimensiones, y Metodología (Tipo, Nivel, Diseño, Población, Muestra, Técnicas en pasado).",
  "anexo_3": "DIAGRAMA DE ISHIKAWA TEXTUAL. Representación detallada del Diagrama de Causa-Efecto estructurado por las 6M (Mano de obra, Maquinaria, Métodos, Materiales, Medidas, Medio ambiente) apuntando al problema central '${lines.problema_central}'.",
  "anexo_4": "ÁRBOL DE PROBLEMAS TEXTUAL. Estructura que defina de manera jerárquica: Efectos principales (al menos 3), Problema central ('${lines.problema_central}'), y Causas directas/indirectas (al menos 3).",
  "anexo_5": "ÁRBOL DE OBJETIVOS TEXTUAL. Estructura correspondiente al Árbol de Problemas, que defina: Fines principales (al menos 3), Objetivo general ('${lines.objetivo_general}'), y Medios para el logro (al menos 3).",
  "anexo_6": "INSTRUMENTOS DE RECOLECCIÓN DE DATOS. Descripción detallada y diseño formal en texto de los instrumentos que se aplicaron (ej. Cuestionario de encuesta con 10-15 ítems y escala de Likert, o Ficha de recolección de métricas experimentales aplicadas en la investigación).",
  "anexo_7": "CONSTANCIA DE APLICACIÓN DE INSTRUMENTOS. Formato de carta formal institucional simulada que certifique que la organización ha permitido y certificado la aplicación y recolección de los datos con fines de investigación.",
  "anexo_8": "DECLARACIÓN JURADA DE ORIGINALIDAD. Formato formal de declaración jurada del autor, asumiendo la originalidad de la tesis, eximiendo de plagio, con firma y DNI simulados."
}
Responde únicamente con el JSON.
`;
        break;

      default:
        throw new Error('Paso no válido en la secuencia');
    }

    const result = await this.callAI(systemPrompt, userPrompt, true);
    return this.normalizeStepResult(stepIndex, result, true);
  }

  private async generateArticleAsync(
    sessionId: string,
    tema: string,
    metadata: any,
    templateText?: string,
    templateStyles?: any
  ) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      const domain = metadata.domain || 'Ingeniería';
      const techStack = metadata.techStack || { frontend: 'React', backend: 'Django', database: 'PostgreSQL', aiModel: 'Scikit-learn' };
      const isOriginal = metadata.tipo_articulo !== 'Articulo_Revision';

      // Format author metadata before prompt execution to ensure alignment rules are strictly followed
      let formattedAuthorsText = '';
      if (metadata.authorsList && Array.isArray(metadata.authorsList) && metadata.authorsList.length > 0) {
        const uniqueInstitutions: string[] = Array.from(new Set(metadata.authorsList.map((a: any) => a.institution).filter(Boolean))) as string[];
        const sameInst = uniqueInstitutions.length <= 1;

        const authorsFormatted = metadata.authorsList.map((a: any) => {
          let nameWithSub = a.name;
          if (!sameInst && a.institution) {
            const instIdx = uniqueInstitutions.indexOf(a.institution) + 1;
            nameWithSub += `<sup>${instIdx}</sup>`;
          }
          let orcidPart = a.orcid ? ` (ORCID iD: ${a.orcid})` : '';
          let emailPart = a.email ? ` (Email: ${a.email})` : '';
          return `${nameWithSub}${orcidPart}${emailPart}`;
        }).join(', ');

        let institutionsFormatted = '';
        if (sameInst) {
          institutionsFormatted = uniqueInstitutions[0] || 'Universidad Nacional de Trujillo';
        } else {
          institutionsFormatted = uniqueInstitutions.map((inst, idx) => `<sup>${idx + 1}</sup> ${inst}`).join(', ');
        }

        let corrFormatted = '';
        if (metadata.correspondenceEmail) {
          corrFormatted = `* Autor de correspondencia: ${metadata.correspondenceEmail}`;
        } else if (metadata.authorsList[0]?.email) {
          corrFormatted = `* Autor de correspondencia: ${metadata.authorsList[0].email}`;
        }

        formattedAuthorsText = `${authorsFormatted}\n${institutionsFormatted}\n${corrFormatted}`;
      } else {
        formattedAuthorsText = metadata.autores || 'Juan Pérez (ORCID iD: https://orcid.org/0000-0002-1823-9023, Email: jperez@unitru.edu.pe)\nUniversidad Nacional de Trujillo\n* Autor de correspondencia: jperez@unitru.edu.pe';
      }

      const combinedArticle: any = {
        templateStyles
      };

      let templateInstructions = '';
      if (templateText) {
        templateInstructions = `
REGLA DE ORO GLOBAL: El contenido temático de la plantilla no debe replicarse en absoluto. La plantilla sirve única y exclusivamente como un molde de estructura, jerarquía y formato.
Fuerza la redacción a adoptar un formato conciso IMRYD (Introducción, Métodos, Resultados y Discusión) o la variante de secciones específicas detectada de la revista en la plantilla provista.

TEXTO EXTRAÍDO DE LA PLANTILLA DEL USUARIO (MOLDE DE ESTRUCTURA Y FORMATO):
---
${templateText.substring(0, 3000)}
---`;
      }

      const systemPrompt = `Eres un investigador científico senior y revisor experto indexado en Scopus. Redactas artículos científicos con el más alto rigor de redacción bajo la estructura IMRyD y las normas más estrictas de escritura académica.
Reglas generales:
1. Precisión, Claridad y Brevedad en todo momento.
2. Extensión de párrafos: Máximo 125 palabras.
3. Oraciones cortas: Menos de 20 palabras con una sola idea principal.
4. Tiempos verbales:
   - Introducción y Discusión: Tiempo PRESENTE (por referirse a evidencia científica).
   - Metodología (Materiales y Métodos): Tiempo PRETÉRITO (pasado).
   - Resultados: Redactado en ${isOriginal ? 'tiempo PRETÉRITO (pasado)' : 'tiempo PRESENTE'}.
5. El documento final simula una extensión de 15 a 20 páginas, por lo que cada sección debe ser profunda y detallada (con min. 400-500 palabras por bloque principal).${templateInstructions}`;

      session.currentStep = 1;
      session.stepLabel = 'Generando título, autores, resumen y abstract...';
      session.progress = 20;
      this.sessions.set(sessionId, { ...session });

      const p1UserPrompt = isOriginal ? `
Genera la cabecera y el resumen bilingüe de un Artículo Científico Original avanzado para el tema: "${tema}".
Ecosistema tecnológico: ${JSON.stringify(techStack)}
Dominio: ${domain}
Autores formateados: ${formattedAuthorsText}

Retorna un objeto JSON con la estructura exacta:
{
  "titulo": "Título técnico en español (Máx 20 palabras, conciso, científico, sin repetir palabras clave)",
  "autores": "${formattedAuthorsText.replace(/\n/g, '\\n')}",
  "resumen": "Resumen estructurado en español (entre 150 y 200 palabras) redactado en un único párrafo continuo sin viñetas ni guiones. Tiempo verbal: estrictamente en tiempo pasado (pretérito). Debe sintetizar: Justificación (breve introducción), Objetivo, Materiales y Métodos, Resultados cuantitativos principales y Conclusiones del estudio.",
  "palabras_clave": "Entre 3 y 5 palabras clave precisas en español, ordenadas alfabéticamente de forma estricta y separadas exclusivamente por comas. NO deben repetir ninguna palabra que aparezca en el título.",
  "abstract": "Traducción académica fiel y exacta al inglés del resumen (150-200 palabras), en tiempo pasado (past tense).",
  "keywords": "Traducción académica exacta al inglés de las palabras clave, separadas por comas."
}
Responde únicamente con el JSON válido.
` : `
Genera la cabecera y el resumen bilingüe de un Artículo Científico de Revisión avanzado para el tema: "${tema}".
Ecosistema tecnológico: ${JSON.stringify(techStack)}
Dominio: ${domain}
Autores formateados: ${formattedAuthorsText}

Retorna un objeto JSON con la estructura exacta:
{
  "titulo": "Título técnico en español (Máx 20 palabras, conciso, científico, sin repetir palabras clave)",
  "autores": "${formattedAuthorsText.replace(/\n/g, '\\n')}",
  "resumen": "Resumen en español estructurado (máximo 100 palabras) en un único párrafo continuo sin viñetas ni guiones. Tiempo verbal: estrictamente en tiempo pasado (pretérito). Debe resumir los hallazgos principales de la revisión.",
  "palabras_clave": "Entre 3 y 5 palabras clave precisas en español, ordenadas alfabéticamente de forma estricta y separadas exclusivamente por comas. NO deben repetir ninguna palabra que aparezca en el título.",
  "abstract": "Traducción académica fiel y exacta al inglés del resumen, en tiempo pasado (past tense).",
  "keywords": "Traducción académica exacta al inglés de las palabras clave, separadas por comas."
}
Responde únicamente con el JSON válido.
`;

      const headerData = await this.callAI(systemPrompt, p1UserPrompt, true);
      combinedArticle.articulo = { ...headerData };

      session.data = combinedArticle;
      this.sessions.set(sessionId, { ...session });

      session.currentStep = 2;
      session.stepLabel = 'Redactando sección de Introducción...';
      session.progress = 40;
      this.sessions.set(sessionId, { ...session });

      const p2UserPrompt = `
Redacta la sección de INTRODUCCIÓN de nivel de revista Scopus para el artículo "${headerData.titulo}" (${isOriginal ? 'Artículo Original' : 'Artículo de Revisión'}).
La Introducción debe detallar:
- Contexto y estado del arte de la investigación.
- Revisión de literatura y antecedentes recientes empleando exclusivamente artículos científicos con antigüedad menor a 5 años (2021-2026) indexados. Prohibido explícitamente el uso de "literatura gris" (tesis no publicadas, blogs, etc.).
- Brecha científica o vacío de conocimiento identificado.
- Justificación y relevancia.
- Propósito y objetivos específicos de la investigación.

Reglas críticas de formato y estilo:
- Redactado estrictamente en TIEMPO PRESENTE.
- Máximo 10 párrafos en total. Cada párrafo debe tener menos de 8 líneas.
- Flujo narrativo fluido: Problema -> Justificación -> Antecedentes -> Brecha -> Propósito.
- Emplea citas formales en estilo APA 7ma edición en el texto.
${!isOriginal ? '- Al tratarse de un Artículo de Revisión, se permite estructurar el cuerpo usando subtítulos legibles.' : '- No uses subtítulos en esta sección, redacta todo en prosa continua.'}

Retorna un objeto JSON con la estructura exacta:
{
  "introduccion": "Tu redacción completa aquí."
}
Responde únicamente con el JSON.
`;

      const introData = await this.callAI(systemPrompt, p2UserPrompt, true);
      combinedArticle.articulo.introduccion = introData.introduccion;

      session.data = combinedArticle;
      this.sessions.set(sessionId, { ...session });

      session.currentStep = 3;
      session.stepLabel = 'Redactando sección metodológica...';
      session.progress = 60;
      this.sessions.set(sessionId, { ...session });

      const p3UserPrompt = isOriginal ? `
Redacta la sección de MÉTODOS (Materiales y Métodos) para el Artículo Original "${headerData.titulo}".
La sección debe detallar de forma secuencial:
- Zona geográfica o espacio controlado del experimento.
- Tipo, nivel y diseño de investigación.
- Población, muestra representativa y método de muestreo.
- Definición de variables operacionales.
- Técnicas e instrumentos de recolección de datos.
- Métodos estadísticos y software utilizado para el análisis.

Reglas críticas de formato y estilo:
- Redacción secuencial escrita estrictamente en TIEMPO PASADO / PRETÉRITO ("se seleccionó", "se aplicó", "se midió").
- Mínimo 800 palabras estructuradas en párrafos con un máximo de 125 palabras.

Retorna un objeto JSON con la estructura exacta:
{
  "metodos": "Tu redacción completa aquí. Estructura el texto con subtítulos como: 2.1 Diseño de Investigación, 2.2 Población y Muestra, 2.3 Variables y Operacionalización, 2.4 Técnicas de Análisis."
}
Responde únicamente con el JSON.
` : `
Redacta la sección de METODOLOGÍA para el Artículo de Revisión "${headerData.titulo}".
La sección debe detallar estrictamente el protocolo de revisión bibliográfica:
- Bases de datos indexadas consultadas (ej. Scopus, Web of Science, PubMed, ScienceDirect).
- Estrategias de búsqueda (palabras clave, operadores booleanos, ecuaciones de búsqueda).
- Criterios de inclusión (antigüedad menor a 5 años, tipo de documento, idioma) y criterios de exclusión.
- Flujo y fases de selección de la literatura (cantidad de artículos iniciales, filtrados, y muestra final de artículos incluidos).

Reglas críticas de formato y estilo:
- Redacción detallada escrita en TIEMPO PASADO / PRETÉRITO.
- Mínimo 600 palabras estructuradas en párrafos.

Retorna un objeto JSON con la estructura exacta:
{
  "metodos": "Tu redacción completa aquí. Estructura el texto con subtítulos como: 2.1 Criterios de Selección, 2.2 Fuentes de Información, 2.3 Estrategia de Búsqueda."
}
Responde únicamente con el JSON.
`;

      const methodsData = await this.callAI(systemPrompt, p3UserPrompt, true);
      combinedArticle.articulo.metodos = methodsData.metodos;

      session.data = combinedArticle;
      this.sessions.set(sessionId, { ...session });

      session.currentStep = 4;
      session.stepLabel = 'Redactando sección de Resultados y construyendo tablas...';
      session.progress = 80;
      this.sessions.set(sessionId, { ...session });

      const p4UserPrompt = isOriginal ? `
Redacta la sección de RESULTADOS Y DISCUSIÓN para el Artículo Original "${headerData.titulo}".
La sección debe detallar de forma secuencial:
- Exposición objetiva (sin interpretar) de los hallazgos técnicos y métricas cuantitativas clave obtenidas.
- Debes incluir referencias explícitas y análisis descriptivo de la Tabla 1 y Figura 1 en el texto ANTES de que aparezcan las estructuras.
- Inmediatamente después del análisis objetivo, cruzar y discutir críticamente dichos resultados contrastándolos con los antecedentes citados en la introducción u otras fuentes científicas de alta confianza.

Reglas críticas de formato:
- Redactado estrictamente en TIEMPO PASADO.
- Párrafos de máximo 125 palabras.
- Estructura las jerarquías con numeración progresiva de hasta 3 niveles (ej: 3 Resultados, 3.1 Modelo de reconocimiento, 3.1.1 Correlación de variables).

Retorna un objeto JSON con la estructura exacta:
{
  "resultados": "Tu redacción completa aquí de la sección Resultados y Discusión.",
  "resultados_tablas": [
    {
      "titulo": "Tabla 1. Métricas comparativas del rendimiento de los modelos en el entorno experimental",
      "columnas": ["Modelo/Algoritmo", "Exactitud (Accuracy)", "Precisión (Precision)", "Sensibilidad (Recall)", "F1-Score"],
      "filas": [
        { "Modelo/Algoritmo": "Algoritmo propuesto", "Exactitud (Accuracy)": "0.945", "Precisión (Precision)": "0.938", "Sensibilidad (Recall)": "0.946", "F1-Score": "0.942" },
        { "Modelo/Algoritmo": "Bosque Aleatorio (Random Forest)", "Exactitud (Accuracy)": "0.892", "Precisión (Precision)": "0.884", "Sensibilidad (Recall)": "0.895", "F1-Score": "0.889" },
        { "Modelo/Algoritmo": "Máquina de Vector de Soporte (SVM)", "Exactitud (Accuracy)": "0.864", "Precisión (Precision)": "0.871", "Sensibilidad (Recall)": "0.858", "F1-Score": "0.864" }
      ]
    }
  ],
  "resultados_figuras": [
    {
      "titulo": "Figura 1. Representación del flujo del algoritmo propuesto y validación cruzada",
      "descripcion": "Diagrama del flujo de entrenamiento de modelos y del proceso de optimización de hiperparámetros mediante validación cruzada de 10 pliegues."
    }
  ]
}
Responde únicamente con el JSON.
` : `
Redacta la sección de RESULTADOS DE LA REVISIÓN para el Artículo de Revisión "${headerData.titulo}".
La sección debe detallar:
- Exposición de la evidencia científica recopilada que respalda cada afirmación principal.
- Indicar explícitamente el nivel de solidez de la evidencia (por ejemplo: si proviene de ensayos clínicos controlados, revisiones sistemáticas, estudios observacionales u opiniones de expertos).
- Si la evidencia disponible en la literatura científica es pobre, deficiente o contradictoria en algún punto, debes señalarlo obligatoriamente.
- Puedes utilizar subtítulos legibles formulados en forma de preguntas para organizar los hallazgos.

Reglas críticas de formato:
- Redactado en TIEMPO PRESENTE.
- Párrafos de máximo 125 palabras.
- Estructura las jerarquías con numeración progresiva de hasta 3 niveles (ej: 3 Resultados, 3.1 Pregunta de revisión, 3.1.1 Subtema).

Retorna un objeto JSON con la estructura exacta:
{
  "resultados": "Tu redacción completa aquí de los resultados de la revisión.",
  "resultados_tablas": [
    {
      "titulo": "Tabla 1. Síntesis de estudios incluidos y niveles de evidencia sobre el tema",
      "columnas": ["Autor y Año", "Diseño del Estudio", "Población/Muestra", "Nivel de Evidencia", "Hallazgo Principal"],
      "filas": [
        { "Autor y Año": "Smith et al. (2023)", "Diseño del Estudio": "Ensayo Clínico Aleatorizado", "Población/Muestra": "N=250", "Nivel de Evidencia": "Alto", "Hallazgo Principal": "Incremento del 15% en la retención estudiantil" },
        { "Autor y Año": "García (2022)", "Diseño del Estudio": "Revisión Sistemática", "Población/Muestra": "N=45 artículos", "Nivel de Evidencia": "Alto", "Hallazgo Principal": "Factores socioeconómicos como causa primordial de deserción" }
      ]
    }
  ],
  "resultados_figuras": [
    {
      "titulo": "Figura 1. Diagrama de flujo PRISMA de selección de estudios",
      "descripcion": "Flujo secuencial de identificación, tamizaje, elegibilidad e inclusión de los artículos científicos analizados en esta revisión bibliográfica."
    }
  ]
}
Responde únicamente con el JSON.
`;

      const resultsData = await this.callAI(systemPrompt, p4UserPrompt, true);
      combinedArticle.articulo.resultados = resultsData.resultados;
      combinedArticle.articulo.resultados_tablas = resultsData.resultados_tablas;
      combinedArticle.articulo.resultados_figuras = resultsData.resultados_figuras;

      session.data = combinedArticle;
      this.sessions.set(sessionId, { ...session });

      session.currentStep = 5;
      session.stepLabel = 'Redactando Conclusiones, Referencias y Declaraciones...';
      session.progress = 95;
      this.sessions.set(sessionId, { ...session });

      const p5UserPrompt = `
Redacta las secciones de CONCLUSIONES, REFERENCIAS y DECLARACIONES para el artículo "${headerData.titulo}" (${isOriginal ? 'Artículo Original' : 'Artículo de Revisión'}).

REQUISITOS CRÍTICOS DE REDACCIÓN:
1. CONCLUSIONES:
   - Formato obligatorio: Un ÚNICO párrafo continuo en texto corrido. Está PROHIBIDO usar guiones, números, viñetas o listas para enumerar las conclusiones.
   - Contenido: Breve, preciso, alineado a los objetivos de la investigación, incluyendo recomendaciones para trabajos futuros y los beneficios de los hallazgos.
2. REFERENCIAS:
   - Cuota de validación: Mínimo ${isOriginal ? '30' : '50'} referencias reales o altamente hiperrealistas.
   - Filtro de tipología y actualidad: Mínimo 80% del total de referencias deben ser artículos científicos publicados en los últimos 5 años (2021-2026).
   - Penalización de fuentes: Restringir al mínimo o evitar por completo libros, tesis universitarias o enlaces web genéricos (priorizar artículos de revistas Scopus/WoS de editoriales como IEEE, Springer, Elsevier).
   - Formato: Estilo APA 7ma edición estricto. Cada cita del texto debe mapear 1:1 con esta lista. Es obligatorio incluir el número DOI o URL activa al final de cada entrada.
3. DECLARACIONES OBLIGATORIAS:
   - Agradecimientos: Redacción de mención a asesores o instituciones (UNT) si aplica.
   - Conflicto de intereses:
     * Si el usuario declaró algún conflicto, descríbelo.
     * De lo contrario (Default), escribe exactamente la cadena: "No existe ningún tipo de conflicto de interés relacionado con la materia del trabajo".
   - Fuente de financiamiento:
     * Si el usuario declaró fuente de financiamiento, detállala con la entidad y contrato.
     * De lo contrario (Default), escribe exactamente la cadena: "Los autores no recibieron ningún patrocinio para llevar a cabo este estudio-artículo".
   - Contribución de autoría (Taxonomía CRediT): Asigna los nombres de los autores (${metadata.authorsList ? metadata.authorsList.map((a: any) => a.name).join(', ') : 'los autores'}) a los roles aplicables de los 14 roles CRediT (ej. Conceptualización, Curación de datos, Análisis formal, Metodología, Redacción - borrador original, Redacción - revisión y edición).
   - Disponibilidad de datos:
     * Si aplica, describe los datos, repositorio, URL activa y licencia.
     * De lo contrario (Default), escribe exactamente: "No aplica".

Retorna un objeto JSON con la estructura exacta:
{
  "conclusiones": "Redacción completa de la conclusión en un solo párrafo largo y fluido, sin ninguna viñeta ni lista.",
  "referencias": [
    "Referencia 1 estilo APA 7ma edición con DOI/URL",
    "Referencia 2 estilo APA 7ma edición con DOI/URL",
    "... hasta completar las ${isOriginal ? '30' : '50'} referencias"
  ],
  "declaraciones": {
    "agradecimientos": "Mención de agradecimientos...",
    "conflicto_intereses": "Declaración exacta del conflicto de intereses...",
    "financiamiento": "Declaración exacta de financiamiento...",
    "contribucion_autores": "Asignación de roles CRediT para cada autor...",
    "disponibilidad_datos": "Declaración de disponibilidad de datos..."
  }
}
Responde únicamente con el JSON.
`;

      const endingData = await this.callAI(systemPrompt, p5UserPrompt, true);
      combinedArticle.articulo.discusion = ''; // Discusion is integrated in Resultados y discusion
      combinedArticle.articulo.conclusiones = endingData.conclusiones;
      combinedArticle.articulo.referencias = endingData.referencias;
      combinedArticle.articulo.agradecimientos = endingData.declaraciones?.agradecimientos || '';
      combinedArticle.articulo.declaraciones = endingData.declaraciones;

      session.data = combinedArticle;
      session.status = 'completed';
      session.progress = 100;
      session.stepLabel = '¡Artículo científico generado exitosamente!';
      this.sessions.set(sessionId, { ...session });
    } catch (err: any) {
      console.error(`Error in generateArticleAsync for session ${sessionId}:`, err);
      session.status = 'error';
      session.error = err.message || 'Error desconocido durante la generación.';
      session.stepLabel = 'Error durante la generación del artículo científico.';
      this.sessions.set(sessionId, { ...session });
    }
  }

  async initThesis(tema: string, customMetadata: any = {}) {
    const inst = customMetadata.templateStyles?.structure?.institution || 'Universidad Nacional de Trujillo';
    const fac = customMetadata.templateStyles?.structure?.faculty || 'Facultad de Ingeniería';
    const esc = customMetadata.templateStyles?.structure?.school || 'Escuela Profesional de Ingeniería de Sistemas';

    const systemPrompt = `Eres un asesor de investigación metodológica y experto de la ${inst} (Facultad: ${fac}, Escuela: ${esc}). Tu tarea es analizar el tema propuesto por el usuario y estructurar los metadatos iniciales para su tesis.`;
    const userPrompt = `
Tema propuesto: "${tema}"
Datos personalizados proporcionados: ${JSON.stringify(customMetadata)}

Debes generar un objeto JSON con la siguiente estructura exacta:
{
  "metadata": {
    "titulo_proyecto": "Título formal y optimizado de la tesis basado en el tema",
    "nombre_autor": "Nombre completo del autor (usar el provisto o generar uno realista si falta)",
    "nombre_asesor": "Nombre completo del asesor con Dr. (usar el provisto o generar uno realista si falta)",
    "grado_asesor": "Grado académico del asesor",
    "jurado_presidente_nombre": "Nombre del presidente del jurado",
    "jurado_presidente_grado": "Grado académico del presidente",
    "jurado_secretario_nombre": "Nombre del secretario del jurado",
    "jurado_secretario_grado": "Grado académico del secretario",
    "jurado_vocal_nombre": "Nombre del vocal del jurado",
    "jurado_vocal_grado": "Grado académico del vocal",
    "linea_investigacion": "Línea de investigación adecuada para el tema en la carrera de Ingeniería de Sistemas de la ${inst}",
    "ciudad": "Ciudad de la universidad o procedencia",
    "anio": "Año actual o provisto"
  },
  "metodologia_seleccionada": "Determinar cuál de las 3 metodologías es más apta para el tema: 'KDD', 'CRISP-DM' o 'SEMMA'",
  "lineamientos_clave": {
    "problema_central": "Pregunta formal de investigación científica formulada",
    "hipotesis": "Formulación de la hipótesis principal en base al problema",
    "objetivo_general": "Objetivo general de la tesis",
    "objetivos_especificos": ["Objetivo específico 1", "Objetivo específico 2", "Objetivo específico 3"]
  }
}
Responde únicamente con el JSON.
`;
    const result = await this.callAI(systemPrompt, userPrompt, true);
    return result;
  }

  async generateStep(stepIndex: number, currentData: any) {
    const meta = currentData.metadata || {};
    const metaSel = currentData.metodologia_seleccionada || 'KDD';
    const lines = currentData.lineamientos_clave || {};

    const juradoPresidente = meta.jurado_presidente_nombre 
      ? `${meta.jurado_presidente_grado || 'Dr.'} ${meta.jurado_presidente_nombre}`
      : 'Dr. Roberto Carlos Medina';

    const juradoSecretario = meta.jurado_secretario_nombre 
      ? `${meta.jurado_secretario_grado || 'Dr.'} ${meta.jurado_secretario_nombre}`
      : 'Dr. Julio César Alvarez';

    const juradoVocal = meta.jurado_vocal_nombre 
      ? `${meta.jurado_vocal_grado || 'Dr.'} ${meta.jurado_vocal_nombre}`
      : (meta.nombre_asesor ? `${meta.grado_asesor || 'Dr.'} ${meta.nombre_asesor}` : 'Dr. Roberto Carlos Medina');

    const asesorConGrado = meta.nombre_asesor
      ? `${meta.grado_asesor || 'Dr.'} ${meta.nombre_asesor}`
      : 'Dr. Asesor Académico';

    let templateInstructions = '';
    if (meta.extractedTemplateText) {
      templateInstructions = `
REGLA DE ORO GLOBAL: El contenido temático de la plantilla no debe replicarse en absoluto. La plantilla sirve única y exclusivamente como un molde de estructura, jerarquía y formato.
Fuerza la redacción a adoptar un tono exhaustivo y estructurar el texto según el índice y el esqueleto de la plantilla provista a continuación.

TEXTO EXTRAÍDO DE LA PLANTILLA DEL USUARIO (MOLDE DE ESTRUCTURA Y FORMATO):
---
${meta.extractedTemplateText.substring(0, 3000)}
---`;
    }

    const inst = meta.templateStyles?.structure?.institution || 'Universidad Nacional de Trujillo';
    const systemPrompt = `Eres un asesor de investigación metodológica y redactor académico senior de Ingeniería de Sistemas en la ${inst}. Redactas con el más alto rigor científico, tecnicismo y lenguaje académico formal en español, respetando la normativa APA 7 y tercera persona.
Normas de Redacción:
- Tercera persona impersonal ("se analizó", "se propone").
- Tiempo futuro para actividades propuestas (Capítulo III y cronograma).
- Tiempo presente para conceptos teóricos, marco teórico y bases conceptuales.
- Coherencia metodológica completa, lenguaje formal, sin contenido redundante.${templateInstructions}`;
    
    let userPrompt = '';

    switch(stepIndex) {
      case 1:
        userPrompt = `
Basado en los siguientes datos del Proyecto de Tesis:
Título: "${meta.titulo_proyecto}"
Autor: "${meta.nombre_autor}"
Asesor: "${asesorConGrado}"
Línea de Investigación: "${meta.linea_investigacion}"
Ciudad: "${meta.ciudad}"
Año: "${meta.anio}"

Genera las secciones preliminares obligatorias. Debes retornar un objeto JSON con la estructura exacta:
{
  "preliminares": {
    "dedicatoria": "Redacción de una dedicatoria académica (máx. 100 palabras).",
    "agradecimientos": "Redacción formal de agradecimientos a la UNT, jurado, asesor y familia (máx. 150 palabras).",
    "presentacion": "Un párrafo formal y protocolar dirigido al Jurado Dictaminador de la Escuela de Ingeniería de Sistemas presentando el proyecto de tesis para su revisión.",
    "resumen": "Resumen ejecutivo del proyecto de tesis structured en un solo párrafo largo y formal (250-300 palabras). Debe incluir la realidad problemática, el objetivo general, la metodología elegida (${metaSel}), y el impacto/aporte esperado. Redactado en tiempo presente para el contexto y futuro/impersonal para el plan propuesto.",
    "palabras_clave": "Escribir entre 5 y 6 palabras clave separadas por comas",
    "abstract": "The exact formal translation of the 'resumen' to academic English (250-300 words). Must use correct scientific terminology in English.",
    "keywords": "The English translation of the 'palabras_clave', separated by commas",
    "jurado": {
      "presidente": "${juradoPresidente}",
      "secretario": "${juradoSecretario}",
      "vocal": "${juradoVocal}"
    },
    "indice_general": [
      "DEDICATORIA", "AGRADECIMIENTOS", "PRESENTACIÓN", "RESUMEN", "ABSTRACT",
      "ÍNDICE DE TABLAS", "ÍNDICE DE FIGURAS", "ÍNDICE DE ANEXOS",
      "CAPÍTULO I: INTRODUCCIÓN", "1.1 Realidad problemática", "1.2 Antecedentes de la investigación", "1.3 Marco teórico", "1.4 Metodologías alternativas", "1.5 Justificación de la investigación", "1.6 Formulación del problema", "1.7 Hipótesis", "1.8 Objetivos", "1.9 Limitaciones del estudio",
      "CAPÍTULO II: MÉTODO", "2.1 Tipo de investigación", "2.2 Nivel de investigación", "2.3 Diseño de investigación", "2.4 Población, muestra y muestreo", "2.5 Variables", "2.6 Técnicas e instrumentos", "2.7 Método de análisis de datos", "2.8 Procedimiento", "2.9 Consideraciones éticas",
      "CAPÍTULO III: ASPECTOS ADMINISTRATIVOS", "3.1 Recursos", "3.2 Presupuesto", "3.3 Financiamiento", "3.4 Cronograma de ejecución",
      "REFERENCIAS BIBLIOGRÁFICAS", "ANEXOS OBLIGATORIOS"
    ],
    "indice_tablas": [
      "Tabla 1. Recursos tecnológicos e insumos requeridos",
      "Tabla 2. Presupuesto consolidado del proyecto",
      "Tabla 3. Cronograma de actividades del proyecto"
    ],
    "indice_figuras": [
      "Figura 1. Esquema del diseño de investigación",
      "Figura 2. Esquema del procedimiento metodológico",
      "Figura 3. Diagrama de Ishikawa de causas y efectos",
      "Figura 4. Árbol de problemas",
      "Figura 5. Árbol de objetivos"
    ],
    "indice_anexos": [
      "Anexo 1. Matriz de operacionalización de variables",
      "Anexo 2. Matriz de consistencia",
      "Anexo 3. Diagrama de Ishikawa",
      "Anexo 4. Árbol de problemas",
      "Anexo 5. Árbol de objetivos",
      "Anexo 6. Instrumentos de recolección de datos",
      "Anexo 7. Constancia de aplicación de instrumentos",
      "Anexo 8. Declaración de originalidad y conformidad"
    ]
  }
}
Responde únicamente con el JSON.
`;
        break;

      case 2:
        userPrompt = `
Redacta el Capítulo I: Introducción completo para el proyecto de tesis:
Título: "${meta.titulo_proyecto}"
Metodología elegida: "${metaSel}"
Problema Central: "${lines.problema_central}"
Hipótesis: "${lines.hipotesis}"
Objetivo General: "${lines.objetivo_general}"
Objetivos Específicos: ${JSON.stringify(lines.objetivos_especificos)}
Ciudad: "${meta.ciudad}"

Debes redactar todo en PROSA CONTINUA (sin viñetas ni apartados vacíos) y con alto nivel de profundidad.

REQUISITO ESPECIAL DE ESTRUCTURA (CRÍTICO):
Analiza la estructura y los títulos del índice detectados en la plantilla del usuario: ${JSON.stringify(meta.templateStyles?.headings || [])}.
Debes mapear y organizar el contenido generado de acuerdo a los títulos exactos de la plantilla que corresponden a la Introducción o Capítulo I (por ejemplo, si la plantilla pide "1.1 Planteamiento del problema", "1.2 Objetivos", etc.) y devolverlos en un array llamado "secciones" dentro del objeto "capitulo1".

Retorna un objeto JSON con la siguiente estructura exacta:
{
  "capitulo1": {
    "realidad_problematica": "Redacción formal de la realidad problemática (mín. 600 palabras). Explore de manera continua la problemática en el contexto internacional (mundial), nacional (Perú) y finalmente regional o local en la ciudad de ${meta.ciudad}. Explique la situación actual del problema y el vacío de conocimiento existente.",
    "antecedentes": "Redacción de antecedentes (mín. 800 palabras). Detalle exactamente 10 antecedentes académicos de los últimos 5 años (5 internacionales y 5 nacionales). Para cada uno, en prosa continua fluida, incluya autor, año, título, objetivo, metodología, resultados principales y la relación/aporte directo con esta tesis. Use citas formales estilo (Autor, Año).",
    "marco_teorico": "Redacción del marco teórico (mín. 800 palabras). Desarrolle en prosa continua las bases teóricas, conceptos fundamentales del título de la investigación y tecnologías/modelos conceptuales asociados. Explique con detalle teórico las tecnologías involucradas.",
    "metodologias_alternativas": "Redacción de metodologías alternativas (mín. 400 palabras). Describa al menos tres metodologías aplicables al tema (ej. CRISP-DM, KDD, SEMMA o metodologías ágiles/desarrollo de software según aplique), compárelas técnicamente y justifique científicamente la elección de ${metaSel} para el estudio.",
    "justificacion": "Redacción de la justificación (mín. 300 palabras) abordando: conveniencia, relevancia social, implicancias prácticas, valor teórico y utilidad metodológica de la investigación.",
    "formulacion_problema": {
      "general": "${lines.problema_central}",
      "especificos": [
        "Pregunta específica de investigación 1 relacionada al primer objetivo específico",
        "Pregunta específica de investigación 2 relacionada al segundo objetivo específico",
        "Pregunta específica de investigación 3 relacionada al tercer objetivo específico"
      ]
    },
    "hipotesis": {
      "general": "${lines.hipotesis}",
      "especificas": [
        "Hipótesis específica 1 correspondiente al problema específico 1",
        "Hipótesis específica 2 correspondiente al problema específico 2"
      ]
    },
    "objetivos": {
      "general": "${lines.objetivo_general}",
      "especificos": ${JSON.stringify(lines.objetivos_especificos)}
    },
    "limitaciones": "Redacción formal de las limitaciones de la investigación: Limitaciones Espaciales (referida al ámbito geográfico en ${meta.ciudad}), Temporales (rango de meses o año de ejecución), Técnicas (referidas al acceso a tecnologías o recursos de cómputo) y Operativas.",
    "secciones": [
      {
        "titulo": "1.1 [Título de la sección correspondiente en la plantilla]",
        "contenido": "[Redacción completa y formal de esta sección]"
      }
    ]
  }
}
Responde únicamente con el JSON.
`;
        break;

      case 3:
        userPrompt = `
Redacta el Capítulo II: Método completo para el proyecto de tesis:
Título: "${meta.titulo_proyecto}"
Metodología elegida: "${metaSel}"

REQUISITO ESPECIAL DE ESTRUCTURA (CRÍTICO):
Analiza la estructura y los títulos del índice detectados en la plantilla del usuario: ${JSON.stringify(meta.templateStyles?.headings || [])}.
Debes mapear y organizar el contenido generado de acuerdo a los títulos exactos de la plantilla que corresponden al Capítulo II: Método (por ejemplo, "2.1 Tipo de investigación", "2.2 Población y muestra", etc.) y devolverlos en un array llamado "secciones" dentro del objeto "capitulo2".

Retorna un objeto JSON con la siguiente estructura exacta:
{
  "capitulo2": {
    "tipo_investigacion": "Clasifique y justifique teóricamente el tipo de investigación: Según su finalidad (ej. Aplicada Tecnológica) y según su técnica de contrastación (ej. Cuantitativa experimental o correlacional).",
    "nivel_investigacion": "Determine y justifique el nivel de investigación (ej. Explicativo, Descriptivo-Correlacional o Aplicado) apropiado para el tema.",
    "diseno_investigacion": "Describa detalladamente el diseño de la investigación (ej. Preexperimental, cuasiexperimental o no experimental/diseño tecnológico) y represente el diseño mediante un esquema textual (ej. G1 X O1).",
    "poblacion_muestra": {
      "poblacion": "Defina y justifique la población de estudio (ej. Registros de datos, usuarios, transacciones) en coherencia con el tema.",
      "muestra": "Defina y justifique el tamaño de la muestra representativa y los criterios de inclusión/exclusión.",
      "muestreo": "Describa el método de muestreo aplicado (probabilístico, no probabilístico intencionado o por conveniencia)."
    },
    "variables": {
      "tipo": "Identifique las variables de la investigación: Variable Independiente (causa o método propuesto), Variable Dependiente (efecto o métricas de mejora) e Intervinientes si corresponde.",
      "operacionalizacion_tabla": [
        {
          "variable": "Variable Independiente: [Nombre de la Variable]",
          "definicion_conceptual": "Definición teórica y científica citando autores.",
          "definicion_operacional": "Cómo se medirá, manipulará o implementará esta variable en el estudio.",
          "dimensiones": "Dimensiones o fases principales en las que se descompone la variable.",
          "indicadores": "Métricas u observaciones empíricas que representan la variable.",
          "escala_medicion": "Escala de medición (Nominal, Ordinal, de Intervalo o de Razón)."
        },
        {
          "variable": "Variable Dependiente: [Nombre de la Variable]",
          "definicion_conceptual": "Definición teórica y científica de las métricas/efectos.",
          "definicion_operacional": "Cómo se medirá en el entorno experimental.",
          "dimensiones": "Dimensiones de rendimiento o impacto.",
          "indicadores": "Indicadores de rendimiento, exactitud, tiempos, costos, etc.",
          "escala_medicion": "Escala de medición correspondientes."
        }
      ]
    },
    "tecnicas_instrumentos": {
      "descripcion": "Describa las técnicas de recolección de datos (observación técnica, encuestas, minería de datos) y los instrumentos utilizados (fichas de registro, cuestionarios, APIs de extracción). Indique las fuentes de información.",
      "validacion_confiabilidad": "Explique detalladamente el proceso de validación por Juicio de Expertos (cálculo de coeficiente V de Aiken) y los métodos estadísticos de Confiabilidad aplicados a los instrumentos (ej. Alfa de Cronbach, KR-20 o estabilidad temporal)."
    },
    "metodo_analisis": "Desarrolle las técnicas de análisis de datos que se aplicarán. Describa la estadística descriptiva (medias, desviación, tablas de frecuencia) y la estadística inferencial (pruebas de hipótesis como t-Student, Chi-Cuadrado, ANOVA o Wilcoxon) que validarán las hipótesis del proyecto.",
    "procedimiento": "Describa minuciosamente las fases metodológicas basadas en la metodología ${metaSel} elegida para el desarrollo del proyecto de investigación. Incluya un esquema metodológico textual.",
    "consideraciones_eticas": "Desarrolle de forma ética la investigación: Consentimiento informado, confidencialidad y anonimato de datos, protección de datos sensibles, integridad científica y originalidad (evitando el plagio y respetando derechos de autor).",
    "secciones": [
      {
        "titulo": "2.1 [Título de la sección correspondiente en la plantilla]",
        "contenido": "[Redacción completa de esta sección]"
      }
    ]
  }
}
Responde únicamente con el JSON.
`;
        break;

      case 4:
        userPrompt = `
Redacta el Capítulo III: Aspectos Administrativos para el proyecto de tesis:
Título: "${meta.titulo_proyecto}"

REQUISITO ESPECIAL DE ESTRUCTURA (CRÍTICO):
Analiza la estructura y los títulos del índice detectados en la plantilla del usuario: ${JSON.stringify(meta.templateStyles?.headings || [])}.
Debes mapear y organizar el contenido generado de acuerdo a los títulos exactos de la plantilla que corresponden al Capítulo III: Aspectos Administrativos (por ejemplo, "3.1 Recursos", "3.2 Presupuesto", etc.) y devolverlos en un array llamado "secciones" dentro del objeto "capitulo3".

Retorna un objeto JSON con la siguiente estructura exacta:
{
  "capitulo3": {
    "recursos": {
      "personal": "Especificar el rol de los investigadores, asesores y expertos de validación involucrados en el desarrollo del proyecto.",
      "bienes": "Descripción de los bienes físicos requeridos (útiles de escritorio, consumibles, libros).",
      "servicios": "Servicios de internet, licencias de software, impresión, traducción, etc.",
      "viajes": "Viajes o viáticos necesarios para la recopilación de datos en campo o visitas a las organizaciones bajo estudio.",
      "tecnologicos": "Detalle de recursos computacionales, hardware, hosting, almacenamiento cloud y software especializados."
    },
    "presupuesto_tabla": [
      { "categoria": "Personal", "recurso": "Investigador principal", "unidad": "Mes", "costo_unitario": 0, "cantidad": 6, "costo_total": 0 },
      { "categoria": "Bienes", "recurso": "Papelería y consumibles", "unidad": "Global", "costo_unitario": 120, "cantidad": 1, "costo_total": 120 },
      { "categoria": "Servicios", "recurso": "Acceso a APIs / Suscripciones cloud", "unidad": "Mes", "costo_unitario": 80, "cantidad": 6, "costo_total": 480 },
      { "categoria": "Tecnológicos", "recurso": "Computadora de procesamiento Core i7/GPU", "unidad": "Unidad", "costo_unitario": 3500, "cantidad": 1, "costo_total": 3500 },
      { "categoria": "Servicios", "recurso": "Servicios de impresión y encuadernado", "unidad": "Global", "costo_unitario": 200, "cantidad": 1, "costo_total": 200 }
    ],
    "financiamiento": "Redacción detallada de la fuente de financiamiento de la investigación. Especifique si el proyecto es autofinanciado por los investigadores o cuenta con patrocinio o subvenciones de entidades externas (UNT, CONCYTEC, empresa privada).",
    "cronograma": {
      "periodo": "Periodo estimado de desarrollo del proyecto (ej. 6 meses).",
      "cronograma_tabla": [
        { "actividad": "Fase 1: Revisión bibliográfica y planteamiento", "mes_1": "X", "mes_2": "X", "mes_3": "", "mes_4": "", "mes_5": "", "mes_6": "" },
        { "actividad": "Fase 2: Diseño arquitectónico y recopilación", "mes_1": "", "mes_2": "X", "mes_3": "X", "mes_4": "", "mes_5": "", "mes_6": "" },
        { "actividad": "Fase 3: Desarrollo experimental y validación por expertos", "mes_1": "", "mes_2": "", "mes_3": "X", "mes_4": "X", "mes_5": "", "mes_6": "" },
        { "actividad": "Fase 4: Análisis estadístico de resultados y contrastación", "mes_1": "", "mes_2": "", "mes_3": "", "mes_4": "X", "mes_5": "X", "mes_6": "" },
        { "actividad": "Fase 5: Redacción final del informe y presentación", "mes_1": "", "mes_2": "", "mes_3": "", "mes_4": "", "mes_5": "X", "mes_6": "X" }
      ]
    },
    "secciones": [
      {
        "titulo": "3.1 [Título de la sección correspondiente en la plantilla]",
        "contenido": "[Redacción completa de esta sección]"
      }
    ]
  }
}
`;
        break;

      case 5:
        userPrompt = `
Genera las Referencias Bibliográficas finales del Proyecto de Tesis:
Título: "${meta.titulo_proyecto}"

Retorna un objeto JSON con la siguiente estructura exacta:
{
  "referencias": [
    "Referencia 1 estilo APA 7ma edición completa",
    "Referencia 2 estilo APA 7ma edición completa",
    "... hasta completar las 30 referencias"
  ]
}

REQUISITOS ESTRICTOS DE LAS REFERENCIAS (CRÍTICO):
1. Exactamente 30 referencias reales o altamente hiperrealistas.
2. Formato APA 7ª Edición estricto, ordenadas alfabéticamente.
3. Mínimo 80% (24 referencias) deben ser artículos de revistas científicas indexadas de los últimos 5 años (2021-2026).
4. Mínimo 80% (24 referencias) deben estar escritas en inglés (artículos científicos indexados en bases como Scopus, WoS, IEEE, ScienceDirect).
5. Incluye el identificador DOI en formato URL (https://doi.org/10.xxxx/xxxx) en el 80% de las referencias donde corresponda.
6. Solo incluye referencias que guarden relación directa con el título y las variables de este proyecto de tesis.
Responde únicamente con el JSON.
`;
        break;

      case 6:
        userPrompt = `
Genera los Anexos Obligatorios del Proyecto de Tesis:
Título: "${meta.titulo_proyecto}"
Metodología elegida: "${metaSel}"
Problema Central: "${lines.problema_central}"
Hipótesis: "${lines.hipotesis}"
Objetivo General: "${lines.objetivo_general}"
Objetivos Específicos: ${JSON.stringify(lines.objetivos_especificos)}

Debes retornar un objeto JSON con la siguiente estructura exacta (plana, sin envolver en "anexos"):
{
  "anexo_1": "MATRIZ DE OPERACIONALIZACIÓN DE VARIABLES. Una tabla estructurada en markdown que relacione: Variable (Independiente/Dependiente), Definición Conceptual, Definición Operacional, Dimensiones, Indicadores y Escalas de Medición. Debe ser altamente técnica.",
  "anexo_2": "MATRIZ DE CONSISTENCIA. Una tabla estructurada en markdown con 5 columnas: Problema (General y Específicos), Objetivos (General y Específicos), Hipótesis (General y Específicas), Variables y Dimensiones, y Metodología (Tipo, Nivel, Diseño, Población, Muestra, Técnicas). Demuestre coherencia y consistencia completa.",
  "anexo_3": "DIAGRAMA DE ISHIKAWA TEXTUAL. Representación detallada del Diagrama de Causa-Efecto estructurado por las 6M (Mano de obra, Maquinaria, Métodos, Materiales, Medidas, Medio ambiente) apuntando al problema central '${lines.problema_central}'.",
  "anexo_4": "ÁRBOL DE PROBLEMAS TEXTUAL. Estructura que defina de manera jerárquica: Efectos principales (al menos 3), Problema central ('${lines.problema_central}'), y Causas directas/indirectas (al menos 3).",
  "anexo_5": "ÁRBOL DE OBJETIVOS TEXTUAL. Estructura correspondiente al Árbol de Problemas, que defina: Fines principales (al menos 3), Objetivo general ('${lines.objetivo_general}'), y Medios para el logro (al menos 3).",
  "anexo_6": "INSTRUMENTOS DE RECOLECCIÓN DE DATOS. Descripción detallada y diseño formal en texto del instrumento utilizado (ej. Cuestionario de encuesta con 10-15 ítems y escala de Likert de 5 puntos, o Ficha de recolección de métricas experimentales con sus campos).",
  "anexo_7": "CONSTANCIA DE APLICACIÓN DE INSTRUMENTOS. Formato de carta formal institucional simulada que certifique que la organización ha permitido recopilar los datos o que los instrumentos han sido validados con fecha y firma simulada del jurado.",
  "anexo_8": "DECLARACIÓN JURADA DE ORIGINALIDAD. Formato formal de declaración jurada del autor, asumiendo la originalidad del proyecto de tesis, eximiendo de plagio, con firma y DNI simulados."
}
Responde únicamente con el JSON.
`;
        break;

      default:
        throw new Error('Paso no válido en la secuencia');
    }

    const result = await this.callAI(systemPrompt, userPrompt, true);
    return this.normalizeStepResult(stepIndex, result);
  }

  /**
   * Genera el Artículo Científico / Producto Académico completo bajo la estructura IMRyD y el formato requerido (mantenido por compatibilidad).
   */
  async generateAcademicProduct(tema: string, metadata: any = {}) {
    const domain = metadata.domain || 'Ingeniería';
    const techStack = metadata.techStack || { frontend: 'React', backend: 'Django', database: 'PostgreSQL', aiModel: 'Scikit-learn' };

    const systemPrompt = `Eres un investigador científico senior y revisor experto indexado en Scopus. Redactas artículos científicos con el más alto rigor de redacción bajo la estructura IMRyD y las normas más estrictas de escritura académica.
Reglas generales:
1. Precisión, Claridad y Brevedad en todo momento.
2. Extensión de párrafos: Máximo 125 palabras.
3. Oraciones cortas: Menos de 20 palabras con una sola idea principal.
4. Tiempos verbales:
   - Introducción y Discusión: Tiempo PRESENTE (por referirse a evidencia científica).
   - Resumen, Materiales y Métodos, y Resultados: Tiempo PRETÉRITO (pasado). Puedes usar la voz pasiva/impersonal ("se analizó") o activa ("analizamos").
5. El documento final simula una extensión de 15 a 20 páginas, por lo que cada sección debe ser profunda y detallada (con min. 400-500 palabras por bloque principal).`;

    const p1UserPrompt = `
Genera la cabecera y el resumen bilingüe de un artículo científico avanzado para el tema: "${tema}".
Ecosistema tecnológico: ${JSON.stringify(techStack)}
Dominio: ${domain}

Retorna un objeto JSON con la estructura exacta:
{
  "titulo": "Título técnico y preciso del artículo en español (Máx 15 palabras)",
  "autores": "Nombre de los autores con su filiación institucional (Universidad Nacional de Trujillo)",
  "resumen": "Resumen estructurado (200-250 palabras) en un solo párrafo y en tiempo pasado (pretérito) que describa sintéticamente el contexto, el objetivo, los materiales y métodos empleados, los resultados cuantitativos clave y la conclusión general del artículo.",
  "palabras_clave": "Entre 4 y 6 palabras clave precisas separadas por comas",
  "abstract": "The translation of the 'resumen' to English. A formal and technical academic abstract (200-250 words) using correct scientific grammar in English.",
  "keywords": "The translation of the 'palabras_clave' to English, separated by commas"
}
Responde únicamente con el JSON válido.
`;
    const headerData = await this.callAI(systemPrompt, p1UserPrompt, true);

    const p2UserPrompt = `
Redacta la sección de INTRODUCCIÓN de nivel de revista Scopus para el artículo "${headerData.titulo}".
La Introducción debe de detallar:
- Contexto y estado del arte.
- Brecha de conocimiento identificada en la literatura.
- Hipótesis de investigación y objetivos específicos.

Reglas específicas:
- Redactado en tiempo PRESENTE.
- Mínimo 800 palabras estructuradas en párrafos con un máximo de 125 palabras cada uno.
- Oraciones cortas e ideas concisas.

Retorna un objeto JSON con la estructura exacta:
{
  "introduccion": "Tu redacción completa aquí. Usa subtítulos de nivel 2 y nivel 3 en texto si es necesario (ej: 1.1 Antecedentes, 1.2 Objetivos)."
}
Responde únicamente con el JSON.
`;
    const introData = await this.callAI(systemPrompt, p2UserPrompt, true);

    const p3UserPrompt = `
Redacta la sección de MÉTODOS (Materiales y Métodos) para el artículo "${headerData.titulo}".
La sección debe detallar:
- Diseño metodológico, población y muestra de datos.
- Preprocesamiento de la información y técnicas experimentales.
- Arquitectura detallada de los modelos y marcos computacionales.
- Optimización y métricas estadísticas utilizadas para la evaluación.
Ecosistema tecnológico utilizado: ${JSON.stringify(techStack)}

Reglas específicas:
- Redactado en tiempo PRETÉRITO (pasado) (Ej: "se diseñó", "entrenamos", "se evaluó").
- Mínimo 800 palabras estructuradas en párrafos con un máximo de 125 palabras cada uno.
- Oraciones cortas.

Retorna un objeto JSON con la estructura exacta:
{
  "metodos": "Tu redacción completa aquí. Estructura el texto con subtítulos como 2.1 Diseño de Investigación, 2.2 Preprocesamiento de Datos, 2.3 Arquitectura del Modelo."
}
Responde únicamente con el JSON.
`;
    const methodsData = await this.callAI(systemPrompt, p3UserPrompt, true);

    const p4UserPrompt = `
Redacta la sección de RESULTADOS para el artículo "${headerData.titulo}".
La sección debe detallar:
- Exposición rigurosa de los hallazgos técnicos.
- Simulaciones numéricas explícitas y análisis estadístico.
- Referencias explícitas en el texto a la Tabla 1 y Figura 1.

Reglas específicas:
- Redactado en tiempo PRETÉRITO (pasado).
- Mínimo 800 palabras estructuradas en párrafos con un máximo de 125 palabras.
- Tablas y figuras descritas rigurosamente.

Retorna un objeto JSON con la estructura exacta:
{
  "resultados": "Tu redacción completa aquí de la sección Resultados.",
  "resultados_tablas": [
    {
      "titulo": "Tabla 1. Métricas comparativas del rendimiento de los modelos en el entorno experimental",
      "columnas": ["Modelo/Algoritmo", "Exactitud (Accuracy)", "Precisión (Precision)", "Sensibilidad (Recall)", "F1-Score"],
      "filas": [
        { "Modelo/Algoritmo": "Red Neuronal propuesta", "Exactitud (Accuracy)": "0.945", "Precisión (Precision)": "0.938", "Sensibilidad (Recall)": "0.946", "F1-Score": "0.942" },
        { "Modelo/Algoritmo": "Random Forest", "Exactitud (Accuracy)": "0.892", "Precisión (Precision)": "0.884", "Sensibilidad (Recall)": "0.895", "F1-Score": "0.889" },
        { "Modelo/Algoritmo": "Máquina de Vector de Soporte (SVM)", "Exactitud (Accuracy)": "0.864", "Precisión (Precision)": "0.871", "Sensibilidad (Recall)": "0.858", "F1-Score": "0.864" }
      ]
    }
  ],
  "resultados_figuras": [
    {
      "titulo": "Figura 1. Representación del flujo del algoritmo propuesto y validación cruzada",
      "descripcion": "Diagrama de flujo del entrenamiento de modelos y del proceso de optimización de hiperparámetros mediante validación cruzada de 10 pliegues."
    }
  ]
}
Responde únicamente con el JSON.
`;
    const resultsData = await this.callAI(systemPrompt, p4UserPrompt, true);

    const p5UserPrompt = `
Redacta las secciones de DISCUSIÓN, CONCLUSIONES y REFERENCIAS para el artículo "${headerData.titulo}".
- Discusión: Contextualización de hallazgos, contraste crítico con la literatura internacional (antecedentes), análisis de limitaciones técnicas y proyecciones de trabajo futuro.
- Conclusiones: Párrafo de conclusiones principales y secundarias.
- Referencias: Mínimo 15 referencias bibliográficas reales o altamente realistas en formato APA 7 con DOI, indexadas en revistas de primer nivel (IEEE, Springer, Elsevier) de los últimos 5 años (2021-2026).
- Agradecimientos: Breve párrafo formal de agradecimiento a la UNT y colaboradores.

Reglas específicas:
- Discusión en tiempo verbal PRESENTE.
- Conclusiones y referencias con formato riguroso.
- Párrafos max 125 palabras.

Retorna un objeto JSON con la estructura exacta:
{
  "discusion": "Tu redacción completa de la Discusión (mín. 600 palabras).",
  "conclusiones": [
    "Conclusión principal sobre el logro del objetivo y validación de la hipótesis.",
    "Conclusión secundaria vinculada a la eficiencia del método/algoritmo propuesto frente a los tradicionales.",
    "Conclusión general sobre la contribución al dominio de la ingeniería de sistemas y trabajo futuro."
  ],
  "referencias": [
    "Referencia 1 en formato APA 7 con DOI",
    "Referencia 2 en formato APA 7 con DOI",
    "... hasta completar al menos 15 referencias"
  ],
  "agradecimientos": "Redacción formal de agradecimientos."
}
Responde únicamente con el JSON.
`;
    const endingData = await this.callAI(systemPrompt, p5UserPrompt, true);

    const combinedArticle = {
      articulo: {
        titulo: headerData.titulo,
        autores: headerData.autores,
        resumen: headerData.resumen,
        palabras_clave: headerData.palabras_clave,
        abstract: headerData.abstract,
        keywords: headerData.keywords,
        introduccion: introData.introduccion,
        metodos: methodsData.metodos,
        resultados: resultsData.resultados,
        resultados_tablas: resultsData.resultados_tablas,
        resultados_figuras: resultsData.resultados_figuras,
        discusion: endingData.discusion,
        conclusiones: endingData.conclusiones,
        referencias: endingData.referencias,
        agradecimientos: endingData.agradecimientos
      }
    };

    return combinedArticle;
  }

  async exportThesis(thesisData: any, format: string): Promise<Buffer> {
    const tempId = uuidv4();
    const tempDir = path.join(process.cwd(), 'temp_exports');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const jsonPath = path.join(tempDir, `${tempId}.json`);
    const outputPath = path.join(tempDir, `${tempId}.${format}`);
    
    fs.writeFileSync(jsonPath, JSON.stringify(thesisData, null, 2), 'utf-8');

    let scriptPath = path.join(__dirname, 'scripts', 'generate_docs.py');
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.join(process.cwd(), 'src', 'modules', 'generator', 'scripts', 'generate_docs.py');
    }
    if (!fs.existsSync(scriptPath)) {
      scriptPath = path.join(process.cwd(), 'packages', 'api', 'src', 'modules', 'generator', 'scripts', 'generate_docs.py');
    }

    try {
      const command = `python "${scriptPath}" "${jsonPath}" "${outputPath}" "${format}"`;
      await execPromise(command);

      if (!fs.existsSync(outputPath)) {
        throw new Error(`El script de Python no generó el archivo de salida en: ${outputPath}`);
      }

      const buffer = fs.readFileSync(outputPath);

      try {
        fs.unlinkSync(jsonPath);
        fs.unlinkSync(outputPath);
      } catch (e) {
        console.error('Error al limpiar archivos temporales:', e);
      }

      return buffer;
    } catch (error: any) {
      console.error('Error durante la ejecución de exportThesis:', error.message);
      try {
        if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch {}
      throw new InternalServerErrorException(`Error al generar el documento exportable: ${error.message}`);
    }
  }

  // --- CRUD de Plantillas Académicas ---

  async getTemplates(type?: string) {
    const where = type ? { documentType: type } : {};
    return this.prisma.documentTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        documentType: true,
        fileName: true,
        requiredFields: true,
        createdAt: true,
      }
    });
  }

  async getTemplateById(id: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException('Plantilla no encontrada');
    }
    return {
      ...template,
      templateStyles: template.templateStyles ? JSON.parse(template.templateStyles) : null,
      requiredFields: template.requiredFields ? JSON.parse(template.requiredFields) : [],
    };
  }

  async uploadAndSaveTemplate(file: Express.Multer.File, name: string, documentType: string) {
    const parsed = await this.parseTemplate(file);
    return this.prisma.documentTemplate.create({
      data: {
        name,
        documentType,
        templateText: parsed.fullText || parsed.text || '',
        templateStyles: parsed.styles ? JSON.stringify(parsed.styles) : null,
        requiredFields: parsed.requiredFields ? JSON.stringify(parsed.requiredFields) : null,
        fileName: file.originalname,
      }
    });
  }

  async deleteTemplate(id: string) {
    await this.getTemplateById(id);
    return this.prisma.documentTemplate.delete({
      where: { id },
    });
  }

  async reviewDocument(
    draftFile: Express.Multer.File,
    templateFile?: Express.Multer.File,
    templateId?: string,
    customPrompt?: string
  ): Promise<any> {
    // 1. Parse draft document
    const parsedDraft = await this.parseTemplate(draftFile);
    const draftText = parsedDraft.fullText || parsedDraft.text || '';
    const draftStyles = parsedDraft.styles || null;

    // 2. Parse or load template
    let templateText = '';
    let templateStyles: any = null;

    if (templateFile) {
      const parsedTemplate = await this.parseTemplate(templateFile);
      templateText = parsedTemplate.fullText || parsedTemplate.text || '';
      templateStyles = parsedTemplate.styles || null;
    } else if (templateId && templateId !== '') {
      const template = await this.getTemplateById(templateId);
      templateText = template.templateText || '';
      templateStyles = template.templateStyles || null;
    }

    // 3. Construct prompts
    const systemPrompt = `Eres un revisor experto de documentos académicos de nivel de posgrado.
Tu tarea es analizar y evaluar un documento académico borrador en base a una plantilla institucional, las reglas de estilo de la plantilla y un conjunto de pautas adicionales proporcionadas por el usuario.

Debes devolver obligatoriamente un objeto JSON con la estructura detallada a continuación. No incluyas ningún texto fuera del JSON.

Estructura del JSON a retornar:
{
  "compliancePercentage": 0, // número del 0 al 100
  "summary": "Resumen ejecutivo del análisis (2-3 párrafos)",
  "structureEvaluation": [
    {
      "sectionName": "Nombre de la sección",
      "status": "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT" | "NOT_FOUND",
      "observations": "Observación detallada sobre si cumple con la estructura de la plantilla y qué falta o sobra."
    }
  ],
  "styleEvaluation": {
    "fontFamily": { "expected": "...", "actual": "...", "status": "COMPLIANT" | "NON_COMPLIANT", "details": "..." },
    "lineSpacing": { "expected": "...", "actual": "...", "status": "COMPLIANT" | "NON_COMPLIANT", "details": "..." },
    "margins": { "expected": "...", "actual": "...", "status": "COMPLIANT" | "NON_COMPLIANT", "details": "..." }
  },
  "customRulesEvaluation": [
    {
      "rule": "Descripción de la regla",
      "status": "COMPLIANT" | "NON_COMPLIANT" | "NOT_APPLICABLE",
      "details": "Detalles del cumplimiento o incumplimiento."
    }
  ],
  "recommendations": [
    "Recomendación 1 para mejorar el documento...",
    "Recomendación 2 para mejorar el documento..."
  ]
}`;

    const draftFont = draftStyles?.fontFamily || 'Times New Roman';
    const draftSpacing = draftStyles?.lineSpacing || 1.5;
    const draftMargins = draftStyles?.margins ? `${draftStyles.margins.top}cm superior, ${draftStyles.margins.left}cm izquierdo` : 'No detectado';

    const tempFont = templateStyles?.fontFamily || 'Arial / Times New Roman';
    const tempSpacing = templateStyles?.lineSpacing || '1.5 / 2.0';
    const tempMargins = templateStyles?.margins ? `${templateStyles.margins.top}cm superior, ${templateStyles.margins.left}cm izquierdo` : 'No especificado';

    const userPrompt = `DOCUMENTO BORRADOR A EVALUAR:
---
${draftText.substring(0, 15000)}
---

ESTILOS DETECTADOS EN EL BORRADOR:
Tipografía: ${draftFont}
Interlineado: ${draftSpacing}
Márgenes: ${draftMargins}

${templateText ? `TEXTO DE LA PLANTILLA REFERENCIAL:
---
${templateText.substring(0, 8000)}
---` : 'PLANTILLA: No se especificó una plantilla referencial. Utilizar formato académico estándar.'}

${templateStyles ? `ESTILOS DE LA PLANTILLA REQUERIDOS:
Tipografía: ${tempFont}
Interlineado: ${tempSpacing}
Márgenes: ${tempMargins}
` : ''}

${customPrompt ? `INDICACIONES ADICIONALES PARA LA REVISIÓN (PROMPT DEL USUARIO):
${customPrompt}
` : ''}
`;

    const result = await this.callAI(systemPrompt, userPrompt, true);
    return result;
  }
}