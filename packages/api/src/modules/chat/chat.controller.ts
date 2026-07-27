import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatService } from './chat.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('chat')
@UseGuards(AuthGuard('jwt'))
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('conversations')
  async getConversations(@CurrentUser('id') userId: string) {
    const list = await this.chatService.getConversations(userId);
    return { success: true, data: list };
  }

  @Post('conversations')
  async createConversation(
    @CurrentUser('id') userId: string,
    @Body('title') title?: string,
  ) {
    const defaultTitle = title || 'Nueva conversación';
    const conv = await this.chatService.createConversation(userId, defaultTitle);
    return { success: true, data: conv };
  }

  @Delete('conversations/:id')
  async deleteConversation(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    await this.chatService.deleteConversation(userId, id);
    return { success: true, message: 'Conversación eliminada con éxito.' };
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const messages = await this.chatService.getMessages(userId, id);
    return { success: true, data: messages };
  }

  @Post('conversations/:id/messages')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } })) // Límite de 10MB para el chat
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id') conversationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('content') content: string,
  ) {
    const msg = await this.chatService.sendMessage(userId, conversationId, content, file);
    return { success: true, data: msg };
  }
}
