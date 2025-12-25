import { UserRole } from './enums';

export interface SendOtpRequest {
  phone: string;
}

export interface SendOtpResponse {
  message: string;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface SetPasswordRequest {
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    phone: string;
    role: UserRole;
  };
}

export interface SetPasswordResponse {
  message: string;
}

