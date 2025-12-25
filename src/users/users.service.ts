import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from './providers/database.provider';
import { UserProfileDto } from './dto/user-profile.dto';
import { User } from './interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(private readonly databaseProvider: DatabaseProvider) {}

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.databaseProvider.findUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at,
    };
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.databaseProvider.findUserById(userId);
  }
}

