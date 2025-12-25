import { apiClient } from './api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SendOtpRequest,
  SendOtpResponse,
  VerifyOtpRequest,
  LoginRequest,
  SetPasswordRequest,
  AuthResponse,
  SetPasswordResponse,
} from '../../shared/api-contracts';

class AuthService {
  async sendOtp(request: SendOtpRequest): Promise<SendOtpResponse> {
    return apiClient.post<SendOtpResponse>('/auth/send-otp', request, false);
  }

  async verifyOtp(request: VerifyOtpRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/verify-otp', request, false);
    await this.storeAuthToken(response.accessToken);
    return response;
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', request, false);
    await this.storeAuthToken(response.accessToken);
    return response;
  }

  async setPassword(request: SetPasswordRequest): Promise<SetPasswordResponse> {
    return apiClient.post<SetPasswordResponse>('/auth/set-password', request);
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('auth_token');
  }

  async getStoredToken(): Promise<string | null> {
    return AsyncStorage.getItem('auth_token');
  }

  private async storeAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem('auth_token', token);
  }
}

export const authService = new AuthService();

