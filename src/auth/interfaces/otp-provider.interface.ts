export interface OtpProvider {
  sendOtp(phone: string): Promise<string>;
  verifyOtp(phone: string, otp: string): Promise<boolean>;
}

