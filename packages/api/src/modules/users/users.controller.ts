import {
  Controller,
  Get,
  Post,
  Param,
  Patch,
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
