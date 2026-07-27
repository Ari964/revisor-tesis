import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  SchemaType,
  FunctionCallingMode,
  type Content,
  type FunctionDeclaration,
  type GenerateContentResult,
  type Part,
} from '@google/generative-ai';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MinioService } from '../storage/minio.service';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

@Injectable()
export class ChatService {
  private genAI: GoogleGenerativeAI;
  private apiKey: string;
  private apiModel: string;

  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
    private configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.apiModel = this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
    this.genAI = new GoogleGenerativeAI(this.apiKey);
  }

  async getConversations(userId: string) {
    return this.prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createConversation(userId: string, title: string) {
    return this.prisma.chatConversation.create({
      data: {
        userId,
        title,
      },
    });
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conv = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conv) throw new NotFoundException('Conversación no encontrada');

    return this.prisma.chatConversation.delete({
      where: { id: conversationId },
    });
  }

  async getMessages(userId: string, conversationId: string) {
    const conv = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conv) throw new NotFoundException('Conversación no encontrada');

    return this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(
    userId: string,
    conversationId: string,
    content: string,
    file?: Express.Multer.File,
  ) {
    if (!this.apiKey || this.apiKey === 'MI_API_KEY_AQUI') {
      throw new BadRequestException(
        'La clave GEMINI_API_KEY no está configurada. Agrégala en el archivo .env del proyecto.',
      );
    }

    const conv = await this.prisma.chatConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conv) throw new NotFoundException('Conversación no encontrada');

    const trimmedContent = (content || '').trim();
    if (!trimmedContent && !file) {
      throw new BadRequestException('Debes escribir un mensaje o adjuntar un archivo.');
    }

    let fileUrl: string | undefined;
    let fileName: string | undefined;
    let fileTextContext = '';

    if (file) {
      fileName = file.originalname;
      try {
        fileTextContext = await this.extractText(file.buffer, file.mimetype, file.originalname);
      } catch (err: any) {
        console.error('Error al extraer texto del archivo en chat:', err);
        throw new InternalServerErrorException(`Error al leer el archivo adjunto: ${err.message}`);
      }

      try {
        const key = await this.minio.uploadDocument(file.originalname, file.buffer, file.mimetype);
        fileUrl = await this.minio.getPresignedUrl(key);
      } catch (err) {
        console.warn('No se pudo subir el archivo a MinIO; el chat continuará sin URL de descarga:', err);
      }
    }

    const userMessageContent = file
      ? `${trimmedContent || 'Analiza este archivo:'}\n\n[Archivo adjunto: ${fileName}]`
      : trimmedContent;

    await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: userMessageContent,
        fileUrl,
        fileName,
      },
    });

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    const assistantReply = await this.generateAssistantReply(messages, fileTextContext, fileName);

    const aiMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: assistantReply,
      },
    });

    const totalMessages = await this.prisma.chatMessage.count({ where: { conversationId } });
    if (totalMessages <= 3) {
      const shortTitle = trimmedContent.slice(0, 50) + (trimmedContent.length > 50 ? '...' : '');
      if (shortTitle) {
        await this.prisma.chatConversation.update({
          where: { id: conversationId },
          data: { title: shortTitle },
        });
      }
    }

    return aiMessage;
  }

  private async extractText(buffer: Buffer, mimeType: string, originalName: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      const parsed = await pdfParse(buffer);
      return parsed.text;
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      const parsed = await mammoth.extractRawText({ buffer });
      return parsed.value;
    }

    if (mimeType.startsWith('text/') || originalName.endsWith('.txt')) {
      return buffer.toString('utf-8');
    }

    throw new Error('Formato de archivo no compatible. Use PDF, DOCX o TXT.');
  }

  private buildChatHistory(messages: Array<{ role: string; content: string; fileName?: string | null }>): Content[] {
    const history: Content[] = [];

    for (const msg of messages) {
      const role = msg.role === 'user' ? 'user' : 'model';
      const lastEntry = history[history.length - 1];

      if (lastEntry && lastEntry.role === role) {
        const existingText = lastEntry.parts[0] && 'text' in lastEntry.parts[0] ? lastEntry.parts[0].text : '';
        lastEntry.parts = [{ text: `${existingText}\n\n${msg.content}` }];
        continue;
      }

      history.push({
        role,
        parts: [{ text: msg.content }],
      });
    }

    return history;
  }

  private getSystemPrompt(): string {
    return `Eres un Asistente IA de propósito general e Investigador Metodológico experto del sistema Revisor de Tesis de la Universidad Nacional de Trujillo.
Tu objetivo es responder de forma profesional, clara y amigable a cualquier consulta del usuario, funcionando tal cual un asistente de inteligencia artificial (como ChatGPT o Gemini). Esto incluye:
1. Responder cualquier pregunta de interés general, académica, científica, de programación, matemática, de redacción de textos o ayuda en general.
2. Ayudar y guiar sobre el funcionamiento del sistema Revisor de Tesis.
3. Analizar, resumir y responder preguntas basadas en documentos (PDF, DOCX, TXT) que el usuario suba al chat.
4. Consultar en tiempo real los datos en la base de datos (tesis, usuarios, entregas y estadísticas) a través de las herramientas (tools) provistas si el usuario te lo solicita explícitamente o hace preguntas relacionadas a los datos del sistema.

Reglas importantes:
- Responde SIEMPRE con texto útil, estructurado y completo en español.
- Si el usuario pregunta por estadísticas, listas de tesis, de usuarios o entregas del sistema, DEBES usar la herramienta adecuada y luego explicar los resultados.
- Para preguntas generales (conversacionales, académicas, de programación, etc.), responde directamente usando tu conocimiento sin forzar ni intentar llamar a las herramientas del sistema.
- Muestra los resultados de la base de datos o listas estructuradas en tablas de Markdown claras.
- Usa un tono empático, respetuoso e intelectual, característico de un asesor académico.
- Nunca reveles contraseñas ni hashes de seguridad.`;
  }

  private extractResponseText(result: GenerateContentResult): string {
    try {
      const text = result.response.text();
      if (text?.trim()) return text.trim();
    } catch {
      // Si el SDK bloquea por safety, intentamos leer el mensaje del error más abajo.
    }

    const candidate = result.response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const joined = parts
      .map((part) => ('text' in part && part.text ? part.text : ''))
      .join('')
      .trim();

    return joined;
  }

  private describeBlockedResponse(result: GenerateContentResult): string | null {
    const feedback = result.response.promptFeedback;
    if (feedback?.blockReason) {
      return `La consulta fue bloqueada por el filtro de seguridad (${feedback.blockReason}). Reformula tu pregunta.`;
    }

    const finishReason = result.response.candidates?.[0]?.finishReason;
    if (finishReason && ['SAFETY', 'RECITATION', 'LANGUAGE'].includes(finishReason)) {
      return `La IA no pudo responder (${finishReason}). Intenta reformular tu consulta.`;
    }

    if (!result.response.candidates?.length) {
      return 'La IA no generó candidatos de respuesta. Verifica tu GEMINI_API_KEY y el modelo configurado.';
    }

    return null;
  }

  private async runChatWithTools(
    history: Content[],
    userText: string,
  ): Promise<string | null> {
    const model = this.genAI.getGenerativeModel({
      model: this.apiModel,
      systemInstruction: this.getSystemPrompt(),
      tools: [{ functionDeclarations: this.getFunctionDeclarations() }],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingMode.AUTO,
        },
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    });

    const chat = model.startChat({ history });
    let result = await chat.sendMessage(userText);
    let usedTools = false;

    for (let loop = 0; loop < 8; loop++) {
      const blocked = this.describeBlockedResponse(result);
      if (blocked) throw new BadRequestException(blocked);

      const text = this.extractResponseText(result);
      if (text) return text;

      const functionCalls = result.response.functionCalls();
      if (!functionCalls?.length) break;

      usedTools = true;
      const functionResponses: Part[] = [];

      for (const call of functionCalls) {
        let functionResult: Record<string, unknown>;
        try {
          functionResult = await this.executeLocalFunction(call.name, call.args);
        } catch (err: any) {
          console.error(`Error ejecutando la función local ${call.name}:`, err);
          functionResult = { error: err.message };
        }

        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: functionResult,
          },
        });
      }

      result = await chat.sendMessage(functionResponses);
    }

    let text = this.extractResponseText(result);
    if (text) return text;

    if (usedTools) {
      result = await chat.sendMessage(
        'Con los datos obtenidos de las herramientas, redacta ahora la respuesta final para el usuario en español. Incluye tablas markdown si corresponde.',
      );
      text = this.extractResponseText(result);
      if (text) return text;
    }

    return null;
  }

  private async runChatWithoutTools(history: Content[], userText: string): Promise<string | null> {
    const model = this.genAI.getGenerativeModel({
      model: this.apiModel,
      systemInstruction: this.getSystemPrompt(),
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(userText);

    const blocked = this.describeBlockedResponse(result);
    if (blocked) throw new BadRequestException(blocked);

    return this.extractResponseText(result) || null;
  }

  private getFunctionDeclarations(): FunctionDeclaration[] {
    return [
      {
        name: 'getSystemStats',
        description:
          'Obtiene estadísticas numéricas generales del sistema (total de usuarios, total de tesis, tesis aprobadas, rechazadas, promedio de calificaciones de entregas, etc.).',
      },
      {
        name: 'getUsersList',
        description:
          'Obtiene la lista de los usuarios del sistema con su nombre, correo, rol y estado de actividad.',
      },
      {
        name: 'getThesisProjects',
        description:
          'Obtiene los proyectos de tesis registrados, con título, línea de investigación, estudiante y asesor asignado. Permite buscar por término.',
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            search: {
              type: SchemaType.STRING,
              description: 'Término de búsqueda opcional para filtrar tesis por título, autor, asesor o línea.',
            },
          },
        },
      },
      {
        name: 'getRecentSubmissions',
        description:
          'Obtiene el listado de las entregas de documentos más recientes en el sistema, mostrando su estado y calificación general obtenida.',
      },
    ];
  }

  private prepareUserMessage(
    messages: Array<{ role: string; content: string; fileName?: string | null }>,
    fileTextContext: string,
    fileName?: string,
  ): { history: Content[]; userText: string } {
    const allHistory = this.buildChatHistory(messages);
    const lastUserMessage = allHistory.pop();
    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      throw new InternalServerErrorException('No se pudo preparar el mensaje del usuario para la IA.');
    }

    let userText: string =
      lastUserMessage.parts[0] && 'text' in lastUserMessage.parts[0]
        ? lastUserMessage.parts[0].text || ''
        : '';

    if (!userText.trim() && !fileTextContext) {
      throw new InternalServerErrorException('El mensaje del usuario está vacío.');
    }

    if (fileTextContext) {
      const maxChars = 28000;
      const truncatedText =
        fileTextContext.length > maxChars
          ? `${fileTextContext.slice(0, maxChars)}\n\n[... documento truncado por límite de tokens ...]`
          : fileTextContext;

      userText = `[CONTENIDO DEL ARCHIVO ADJUNTO "${fileName || 'documento'}":]\n"""\n${truncatedText}\n"""\n\n${userText}`;
    }

    return { history: allHistory, userText };
  }

  private async generateAssistantReply(
    messages: Array<{ role: string; content: string; fileName?: string | null }>,
    fileTextContext: string,
    fileName?: string,
  ): Promise<string> {
    const { history, userText } = this.prepareUserMessage(messages, fileTextContext, fileName);

    let retryCount = 0;
    const maxRetries = 5;

    while (true) {
      try {
        let text = await this.runChatWithTools(history, userText);

        if (!text) {
          text = await this.runChatWithoutTools(history, userText);
        }

        if (text) return text;

        throw new Error('La IA devolvió una respuesta vacía.');
      } catch (err: any) {
        const message = err?.message || String(err);

        if (message.includes('429') || message.toLowerCase().includes('quota') || message.toLowerCase().includes('rate')) {
          retryCount++;
          if (retryCount <= maxRetries) {
            const waitTime = Math.pow(2, retryCount) * 3000;
            console.log(`⏳ Rate limit alcanzado. Reintentando en ${waitTime / 1000}s... (${retryCount}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
          }
          throw new HttpException(
            'Se alcanzó el límite de peticiones a la IA. Espera unos minutos e inténtalo de nuevo.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }

        if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) {
          throw new BadRequestException(
            'La clave GEMINI_API_KEY no es válida. Verifica tu API key en https://aistudio.google.com/apikey',
          );
        }

        if (message.includes('not found') || message.includes('is not supported')) {
          throw new BadRequestException(
            `El modelo "${this.apiModel}" no está disponible. Configura GEMINI_MODEL=gemini-2.5-flash en tu archivo .env.`,
          );
        }

        if (message.includes('bloqueada') || message.includes('bloqueado') || message.includes('SAFETY')) {
          throw new BadRequestException(message);
        }

        console.error('Error en chat con Gemini:', err);
        throw new InternalServerErrorException(`Error en la IA: ${message}`);
      }
    }
  }

  private async executeLocalFunction(name: string, args: any): Promise<any> {
    switch (name) {
      case 'getSystemStats': {
        const [totalUsers, totalTesis, approvedTesis, rejectedTesis, totalSubmissions, usersByRole, submissionsScore] =
          await Promise.all([
            this.prisma.user.count(),
            this.prisma.thesisProject.count(),
            this.prisma.documentSubmission.count({ where: { advisorApproved: true } }),
            this.prisma.documentSubmission.count({ where: { advisorApproved: false } }),
            this.prisma.documentSubmission.count(),
            this.prisma.user.groupBy({
              by: ['role'],
              _count: { id: true },
            }),
            this.prisma.documentSubmission.aggregate({
              _avg: { overallScore: true },
            }),
          ]);

        return {
          totalUsers,
          totalTesis,
          approvedSubmissions: approvedTesis,
          rejectedSubmissions: rejectedTesis,
          totalSubmissions,
          usersByRole: usersByRole.reduce(
            (acc, curr) => {
              acc[curr.role] = curr._count.id;
              return acc;
            },
            {} as Record<string, number>,
          ),
          averageScore: submissionsScore._avg.overallScore
            ? parseFloat(submissionsScore._avg.overallScore.toFixed(2))
            : null,
        };
      }

      case 'getUsersList': {
        const users = await this.prisma.user.findMany({
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            isActive: true,
          },
          take: 50,
        });
        return users.map((u) => ({
          nombre: `${u.firstName} ${u.lastName}`,
          correo: u.email,
          rol: u.role,
          activo: u.isActive ? 'Sí' : 'No',
        }));
      }

      case 'getThesisProjects': {
        const search = typeof args?.search === 'string' ? args.search.trim() : '';
        const tesis = await this.prisma.thesisProject.findMany({
          where: search
            ? {
                OR: [
                  { title: { contains: search } },
                  { researchLine: { contains: search } },
                  { student: { firstName: { contains: search } } },
                  { student: { lastName: { contains: search } } },
                  { advisor: { firstName: { contains: search } } },
                  { advisor: { lastName: { contains: search } } },
                ],
              }
            : undefined,
          select: {
            id: true,
            title: true,
            researchLine: true,
            student: { select: { firstName: true, lastName: true } },
            advisor: { select: { firstName: true, lastName: true } },
            isActive: true,
            createdAt: true,
          },
          take: 20,
        });

        return tesis.map((t) => ({
          titulo: t.title,
          linea_investigacion: t.researchLine || 'No asignada',
          estudiante: `${t.student.firstName} ${t.student.lastName}`,
          asesor: t.advisor ? `${t.advisor.firstName} ${t.advisor.lastName}` : 'Sin asesor',
          activo: t.isActive ? 'Sí' : 'No',
        }));
      }

      case 'getRecentSubmissions': {
        const submissions = await this.prisma.documentSubmission.findMany({
          orderBy: { submittedAt: 'desc' },
          take: 10,
          select: {
            fileName: true,
            project: { select: { title: true } },
            status: true,
            overallScore: true,
            submittedAt: true,
            advisorApproved: true,
          },
        });

        return submissions.map((s) => ({
          documento: s.fileName,
          proyecto: s.project.title,
          estado: s.status,
          calificacion: s.overallScore !== null ? s.overallScore : 'No calificado',
          aprobado_asesor: s.advisorApproved === true ? 'Sí' : s.advisorApproved === false ? 'No' : 'Pendiente',
          fecha_entrega: s.submittedAt.toISOString().split('T')[0],
        }));
      }

      default:
        throw new Error(`Función desconocida: ${name}`);
    }
  }
}
