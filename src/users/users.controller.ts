import { Controller, Get, Put, Request, UseGuards, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserProfileDto } from './dto/user-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SetDefaultRoleDto } from './dto/set-default-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Request() req: any): Promise<UserProfileDto> {
    return this.usersService.getProfile(req.user.id);
  }

  @Put('me/default-role')
  async setDefaultRole(
    @Request() req: any,
    @Body() dto: SetDefaultRoleDto,
  ): Promise<{ message: string }> {
    await this.usersService.setDefaultRole(req.user.id, dto.default_role);
    return { message: 'Default role updated successfully' };
  }

  @Put('me/profile')
  async updateProfile(
    @Request() req: any,
    @Body() dto: UpdateProfileDto,
  ): Promise<{ message: string }> {
    await this.usersService.updateProfile(
      req.user.id,
      dto.name,
      dto.default_addresses,
    );
    return { message: 'Profile updated successfully' };
  }

  @Put('me/regenerate-pin')
  async regeneratePin(@Request() req: any): Promise<{ message: string; pin: string }> {
    const newPin = await this.usersService.regeneratePin(req.user.id);
    return { 
      message: 'PIN regenerated successfully. Old PIN is no longer valid for active orders.',
      pin: newPin 
    };
  }
}

