import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OtpProvider } from '../interfaces/otp-provider.interface';

@Injectable()
export class SupabaseOtpProvider implements OtpProvider {
  private client: SupabaseClient | null = null;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      this.client = createClient(supabaseUrl, supabaseAnonKey);
    }
  }

  private ensureClient(): SupabaseClient {
    if (!this.client) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration is missing for OTP. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
      }

      this.client = createClient(supabaseUrl, supabaseAnonKey);
    }

    return this.client;
  }

  async sendOtp(phone: string): Promise<string> {
    const client = this.ensureClient();
    const { data, error } = await client.auth.signInWithOtp({
      phone: phone,
    });

    if (error) {
      throw new Error(`Failed to send OTP: ${error.message}`);
    }

    return 'OTP sent successfully';
  }

  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const client = this.ensureClient();
    const { data, error } = await client.auth.verifyOtp({
      phone: phone,
      token: otp,
      type: 'sms',
    });

    if (error || !data.user) {
      return false;
    }

    return true;
  }
}

