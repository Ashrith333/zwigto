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
    if (response.user) {
      await AsyncStorage.setItem('auth_user_data', JSON.stringify({
        phone: response.user.phone,
        role: response.user.role,
      }));
    }
    return response;
  }

  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', request, false);
    await this.storeAuthToken(response.accessToken);
    if (response.user) {
      await AsyncStorage.setItem('auth_user_data', JSON.stringify({
        phone: response.user.phone,
        role: response.user.role,
      }));
    }
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

  async unifiedAuth(request: { phone: string; password: string; otp?: string }): Promise<any> {
    const response = await apiClient.post<any>('/auth/unified-auth', request, false);
    
    // If OTP is required, return the response as-is
    if (response.requiresOtp) {
      return response;
    }
    
    // If login successful, store token and user data
    if (response.accessToken) {
      console.log('Storing auth token:', response.accessToken.substring(0, 20) + '...');
      await this.storeAuthToken(response.accessToken);
      
      // Store user data for admin check
      if (response.user) {
        await AsyncStorage.setItem('auth_user_data', JSON.stringify({
          phone: response.user.phone,
          role: response.user.role,
        }));
      }
      
      // Verify token was stored
      const storedToken = await this.getStoredToken();
      if (storedToken) {
        console.log('Token successfully stored and verified');
      } else {
        console.error('Token storage failed - token not found after storing');
      }
    }
    
    return response;
  }

  private async storeAuthToken(token: string): Promise<void> {
    await AsyncStorage.setItem('auth_token', token);
  }
}

export const authService = new AuthService();

