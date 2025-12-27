import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordRequestDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { User, UserPayload, UserRole } from './interfaces/user.interface';
import { SupabaseOtpProvider } from './providers/supabase-otp.provider';
import { SupabaseProvider } from './providers/supabase.provider';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly supabaseProvider: SupabaseProvider,
    private readonly otpProvider: SupabaseOtpProvider,
  ) {}

  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    try {
      await this.otpProvider.sendOtp(dto.phone);
      return { message: 'OTP sent successfully' };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to send OTP',
      );
    }
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponseDto> {
    const isValid = await this.otpProvider.verifyOtp(dto.phone, dto.otp);

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    let user = await this.supabaseProvider.findUserByPhone(dto.phone);

    if (!user) {
      user = await this.supabaseProvider.createUser(dto.phone, UserRole.USER);
    }

    // Use JWT standard 'sub' field for user ID
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role as UserRole,
    };

    console.log('Signing JWT token (verifyOtp) with payload:', payload);
    const accessToken = this.jwtService.sign(payload);
    console.log('JWT token signed successfully (verifyOtp), length:', accessToken.length);

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role as UserRole,
      },
    };
  }

  async setPassword(userId: string, dto: SetPasswordDto): Promise<{ message: string }> {
    const user = await this.supabaseProvider.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.password_hash) {
      throw new ConflictException('Password already set');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    await this.supabaseProvider.updateUserPassword(user.id, passwordHash);

    return { message: 'Password set successfully' };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.supabaseProvider.findUserByPhone(dto.phone);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password_hash) {
      throw new BadRequestException('Password not set. Please verify OTP first.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Use JWT standard 'sub' field for user ID
    const payload = {
      sub: user.id,
      phone: user.phone,
      role: user.role as UserRole,
    };

    console.log('Signing JWT token (login) with payload:', payload);
    const accessToken = this.jwtService.sign(payload);
    console.log('JWT token signed successfully (login), length:', accessToken.length);

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role as UserRole,
      },
    };
  }

  /**
   * Unified authentication flow:
   * - If user exists and has password: verify password and login
   * - If user doesn't exist: send OTP (first call), then verify OTP + create account with password (second call)
   * - If user exists but no password: send OTP (first call), then verify OTP + set password (second call)
   */
  async unifiedAuth(dto: { phone: string; password: string; otp?: string }): Promise<AuthResponseDto | { message: string; requiresOtp: boolean }> {
    const user = await this.supabaseProvider.findUserByPhone(dto.phone);

    // Case 1: User exists and has password - verify password and login
    if (user && user.password_hash) {
      const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if this is the admin phone number and update role if needed
      const adminPhone = '9676936825';
      const normalizedPhone = dto.phone.replace(/[^0-9]/g, '');
      const isAdminPhone = normalizedPhone === adminPhone || 
                           normalizedPhone === `91${adminPhone}` ||
                           normalizedPhone.endsWith(adminPhone);
      
      if (isAdminPhone && user.role !== UserRole.ADMIN) {
        // Update existing user to ADMIN role
        await this.supabaseProvider.updateUserRole(user.id, UserRole.ADMIN);
        user.role = UserRole.ADMIN;
      }

      // Use JWT standard 'sub' field for user ID
      const payload = {
        sub: user.id,
        phone: user.phone,
        role: user.role as UserRole,
      };

      console.log('Signing JWT token (login) with payload:', payload);
      const accessToken = this.jwtService.sign(payload);
      console.log('JWT token signed successfully (login), length:', accessToken.length);
      return {
        accessToken,
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role as UserRole,
          default_role: user.default_role as UserRole | undefined,
        },
      };
    }

    // Case 2: User doesn't exist or exists but no password - need OTP verification
    if (!dto.otp) {
      // First call: Send OTP
      try {
        await this.otpProvider.sendOtp(dto.phone);
        return { message: 'OTP sent successfully. Please verify to complete signup.', requiresOtp: true };
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Failed to send OTP',
        );
      }
    }

    // Second call: Verify OTP and create/update account with password
    const isValid = await this.otpProvider.verifyOtp(dto.phone, dto.otp);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    let finalUser = user;
    if (!finalUser) {
      // Check if this is the admin phone number
      const adminPhone = '9676936825';
      const normalizedPhone = dto.phone.replace(/[^0-9]/g, '');
      const isAdminPhone = normalizedPhone === adminPhone || 
                           normalizedPhone === `91${adminPhone}` ||
                           normalizedPhone.endsWith(adminPhone);
      
      // Create new user with appropriate role
      const initialRole = isAdminPhone ? UserRole.ADMIN : UserRole.USER;
      finalUser = await this.supabaseProvider.createUser(dto.phone, initialRole);
    } else {
      // If user exists, check if they should be admin
      const adminPhone = '9676936825';
      const normalizedPhone = dto.phone.replace(/[^0-9]/g, '');
      const isAdminPhone = normalizedPhone === adminPhone || 
                           normalizedPhone === `91${adminPhone}` ||
                           normalizedPhone.endsWith(adminPhone);
      
      if (isAdminPhone && finalUser.role !== UserRole.ADMIN) {
        // Update existing user to ADMIN role
        await this.supabaseProvider.updateUserRole(finalUser.id, UserRole.ADMIN);
        finalUser.role = UserRole.ADMIN;
      }
    }

    // Set password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);
    await this.supabaseProvider.updateUserPassword(finalUser.id, passwordHash);

    // Login - Use JWT standard 'sub' field for user ID
    const payload = {
      sub: finalUser.id,
      phone: finalUser.phone,
      role: finalUser.role as UserRole,
    };

    console.log('Signing JWT token (unified auth) with payload:', payload);
    const accessToken = this.jwtService.sign(payload);
    console.log('JWT token signed successfully (unified auth), length:', accessToken.length);
    return {
      accessToken,
      user: {
        id: finalUser.id,
        phone: finalUser.phone,
        role: finalUser.role as UserRole,
        default_role: finalUser.default_role as UserRole | undefined,
      },
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.supabaseProvider.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.password_hash) {
      throw new BadRequestException('Password not set. Please set a password first.');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    await this.supabaseProvider.updateUserPassword(user.id, newPasswordHash);

    return { message: 'Password changed successfully' };
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.supabaseProvider.findUserById(userId);
  }

  async requestPasswordReset(dto: ForgotPasswordRequestDto): Promise<{ message: string }> {
    // Check if user exists
    const user = await this.supabaseProvider.findUserByPhone(dto.phone);
    if (!user) {
      throw new BadRequestException('User not found with this phone number');
    }

    // Send OTP for password reset
    try {
      await this.otpProvider.sendOtp(dto.phone);
      return { message: 'OTP sent successfully. Please verify to reset your password.' };
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Failed to send OTP',
      );
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // Verify OTP
    const isValid = await this.otpProvider.verifyOtp(dto.phone, dto.otp);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Check if user exists
    const user = await this.supabaseProvider.findUserByPhone(dto.phone);
    if (!user) {
      throw new BadRequestException('User not found with this phone number');
    }

    // Hash and update password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(dto.new_password, saltRounds);
    await this.supabaseProvider.updateUserPassword(user.id, newPasswordHash);

    return { message: 'Password reset successfully' };
  }
}

