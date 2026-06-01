import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PatternsService } from './patterns.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('patterns')
@UseGuards(AuthGuard('jwt'))
export class PatternsController {
  constructor(private patternsService: PatternsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'COORDINATOR')
  async create(@Body() body: any) {
    const pattern = await this.patternsService.create(body);
    return { success: true, data: pattern };
  }

  @Get()
  async findAll() {
    const patterns = await this.patternsService.findAll();
    return { success: true, data: patterns };
  }

  @Get('default')
  async getDefault() {
    const pattern = await this.patternsService.getDefault();
    return { success: true, data: pattern };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const pattern = await this.patternsService.findById(id);
    return { success: true, data: pattern };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'COORDINATOR')
  async update(@Param('id') id: string, @Body() body: any) {
    const pattern = await this.patternsService.update(id, body);
    return { success: true, data: pattern };
  }
}
