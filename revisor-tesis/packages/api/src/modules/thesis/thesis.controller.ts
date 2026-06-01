import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ThesisService } from './thesis.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('thesis')
@UseGuards(AuthGuard('jwt'))
export class ThesisController {
  constructor(private thesisService: ThesisService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('STUDENT', 'ADMIN', 'COORDINATOR')
  async create(@CurrentUser() user: any, @Body() body: any) {
    const project = await this.thesisService.create(user.id, body);
    return { success: true, data: project };
  }

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.thesisService.findAll(user.id, user.role, page, limit);
    return { success: true, ...result };
  }

  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() user: any) {
    const project = await this.thesisService.findById(id, user.id, user.role);
    return { success: true, data: project };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() body: any,
  ) {
    const project = await this.thesisService.update(id, user.id, user.role, body);
    return { success: true, data: project };
  }
}
