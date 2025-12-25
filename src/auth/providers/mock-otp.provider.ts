import { Injectable } from '@nestjs/common';
import { OtpProvider } from '../interfaces/otp-provider.interface';

@Injectable()
export class MockOtpProvider implements OtpProvider {
  private otpStore: Map<string, { otp: string; expiresAt: number }> = new Map();
  private readonly OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

  async sendOtp(phone: string): Promise<string> {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + this.OTP_EXPIRY_MS;

    this.otpStore.set(phone, { otp, expiresAt });

    console.log(`[MOCK OTP] Sending OTP ${otp} to ${phone}`);

    return otp;
  }

  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const stored = this.otpStore.get(phone);

    if (!stored) {
      return false;
    }

    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(phone);
      return false;
    }

    if (stored.otp !== otp) {
      return false;
    }

    this.otpStore.delete(phone);
    return true;
  }
}

