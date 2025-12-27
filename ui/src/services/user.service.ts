import { apiClient } from './api-client';
import { UserProfile, UserRole } from '../../shared/api-contracts';

class UserService {
  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/users/me');
  }

  async setDefaultRole(defaultRole: UserRole): Promise<void> {
    await apiClient.put('/users/me/default-role', { default_role: defaultRole });
  }

  async updateProfile(name?: string, defaultAddresses?: any[]): Promise<void> {
    await apiClient.put('/users/me/profile', {
      name,
      default_addresses: defaultAddresses,
    });
  }

  async regeneratePin(): Promise<{ message: string; pin: string }> {
    return apiClient.put<{ message: string; pin: string }>('/users/me/regenerate-pin', {});
  }
}

export const userService = new UserService();

