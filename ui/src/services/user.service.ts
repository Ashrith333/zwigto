import { apiClient } from './api-client';
import { UserProfile } from '../../shared/api-contracts';

class UserService {
  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/users/me');
  }
}

export const userService = new UserService();

