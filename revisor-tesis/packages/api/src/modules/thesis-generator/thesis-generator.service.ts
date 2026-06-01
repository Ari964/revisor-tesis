import { Injectable } from '@nestjs/common';

@Injectable()
export class ThesisGeneratorService {
  constructor() {}

  async generateProjectDraft(options: {
    title?: string;
    sections?: string[];
    length?: 'short' | 'medium' | 'long';
  }): Promise<string> {
    const title = options.title || 'Proyecto de Tesis';
    const sections = options.sections && options.sections.length > 0
      ? options.sections
      : ['Resumen', 'Introducción', 'Marco Teórico', 'Metodología', 'Resultados Esperados', 'Plan de Trabajo', 'Referencias'];

    const lengthWords = options.length === 'long' ? 1200 : options.length === 'short' ? 300 : 700;

    // Generar un prompt simple para la API generativa o generar localmente si no hay clave
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

    const prompt = `Genera un borrador técnico y académico para un proyecto de tesis titulado "${title}". ` +
      `Incluye las secciones: ${sections.join(', ')}. Escribe aproximadamente ${lengthWords} palabras en español, con un tono académico, claro y conciso. ` +
      `Para cada sección incluye uno o dos párrafos que expliquen el objetivo de la sección y los puntos clave a desarrollar.`;

    if (!apiKey) {
      // Generador local sencillo (fallback)
      return this.simpleLocalGenerator(title, sections, lengthWords);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.25 }
        }),
      });
      if (!response.ok) {
        throw new Error(`Generative API responded with ${response.status}`);
      }
      const data: any = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('No content returned from generative API');
      return text;
    } catch (err:any) {
      console.error('ThesisGeneratorService error:', err);
      return this.simpleLocalGenerator(title, sections, lengthWords);
    }
  }

  private simpleLocalGenerator(title: string, sections: string[], approxWords: number) {
    const perSection = Math.max(1, Math.floor(approxWords / sections.length / 80));
    let out = `# ${title}\n\n`;
    for (const s of sections) {
      out += `## ${s}\n\n`;
      for (let i = 0; i < perSection; i++) {
        out += `Párrafo de ejemplo para la sección ${s}, describiendo objetivos, importancia y posibles enfoques metodológicos. ` +
          `Este texto es un borrador generado localmente como fallback cuando no está disponible la API generativa. `;
      }
      out += `\n`;
    }
    return out;
  }
}
