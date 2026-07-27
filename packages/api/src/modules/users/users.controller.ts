import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { IsEmail, IsString, IsEnum, IsOptional } from 'class-validator';

// ─── DTOs con validación ────────────────────────────────────

class CreateUserDto {
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEnum(UserRole, { message: 'Rol inválido' })
  role!: UserRole;

  @IsOptional()
  @IsString()
  academicDegree?: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsString()
  orcid?: string;
}

class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Rol inválido' })
  role?: UserRole;

  @IsOptional()
  @IsString()
  academicDegree?: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsString()
  orcid?: string;
}

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'COORDINATOR')
  async findAll(
    @Query('role') role?: UserRole,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.usersService.findAll(role, page || 1, limit || 20);
    return { success: true, ...result };
  }

  @Get('academic')
  async getAcademicUsers(
    @Query('role') role?: UserRole,
  ) {
    const result = await this.usersService.findAll(role, 1, 200);
    return { success: true, data: result.data };
  }

  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    const profile = await this.usersService.findById(user.id);
    return { success: true, data: profile };
  }

  @Get('me/orcid')
  async getOrcidProfile(@CurrentUser() user: any) {
    const profile = await this.usersService.getOrcidProfile(user.id);
    return { success: true, data: profile };
  }

  @Post('me/orcid')
  async syncOrcidProfile(
    @CurrentUser() user: any,
    @Body('orcidId') orcidId: string,
  ) {
    const profile = await this.usersService.syncOrcidProfile(user.id, orcidId);
    return { success: true, data: profile };
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return { success: true, data: user };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.update(id, dto);
    return { success: true, data: user };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.usersService.delete(id);
    return { success: true, message: 'Usuario eliminado exitosamente' };
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'COORDINATOR')
  async findById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return { success: true, data: user };
  }

  @Patch('me/push-token')
  async updatePushToken(
    @CurrentUser('id') userId: string,
    @Body('expoPushToken') token: string,
  ) {
    await this.usersService.updateExpoPushToken(userId, token);
    return { success: true, message: 'Push token actualizado' };
  }

  @Patch(':id/toggle-active')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async toggleActive(@Param('id') id: string) {
    const user = await this.usersService.toggleActive(id);
    return { success: true, data: user };
  }
}
