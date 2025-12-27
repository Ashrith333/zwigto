import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseProvider } from './providers/database.provider';
import { UserProfileDto } from './dto/user-profile.dto';
import { User } from './interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(private readonly databaseProvider: DatabaseProvider) {}

  async getProfile(userId: string): Promise<UserProfileDto> {
    try {
      const user = await this.databaseProvider.findUserById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        id: user.id,
        phone: user.phone,
        role: user.role,
        default_pin: user.default_pin || undefined, // Include PIN for customer to see (undefined if not set)
        default_role: user.default_role || undefined,
        name: user.name || undefined,
        default_addresses: user.default_addresses || undefined,
        created_at: user.created_at,
      };
    } catch (error: any) {
      console.error('Error in getProfile:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.databaseProvider.findUserById(userId);
  }

  async setDefaultRole(userId: string, defaultRole: 'USER' | 'RESTAURANT' | 'ADMIN'): Promise<void> {
    await this.databaseProvider.updateUserDefaultRole(userId, defaultRole);
  }

  async updateProfile(userId: string, name?: string, defaultAddresses?: any[]): Promise<void> {
    await this.databaseProvider.updateUserProfile(userId, name, defaultAddresses);
  }
}

