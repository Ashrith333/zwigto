/**
 * Centralized JWT Configuration
 * Ensures the same secret is used for signing and verification
 */
export class JwtConfig {
  private static readonly JWT_SECRET_KEY = 'JWT_SECRET';
  private static readonly JWT_EXPIRES_IN_KEY = 'JWT_EXPIRES_IN';
  
  private static secret: string | null = null;
  private static expiresIn: string | null = null;
  private static initialized: boolean = false;

  /**
   * Initialize JWT configuration from environment
   * Must be called before any JWT operations
   */
  static initialize(): void {
    if (this.initialized) {
      return;
    }

    // Load environment variables explicitly
    require('dotenv').config();

    this.secret = process.env[this.JWT_SECRET_KEY] || null;
    this.expiresIn = process.env[this.JWT_EXPIRES_IN_KEY] || '24h';

    if (!this.secret) {
      const defaultSecret = 'default-secret-change-in-production-' + Date.now();
      console.error('⚠️  CRITICAL: JWT_SECRET not found in environment!');
      console.error('⚠️  Using temporary default secret. Tokens will be invalid after restart!');
      console.error('⚠️  Set JWT_SECRET in .env file immediately!');
      this.secret = defaultSecret;
    } else {
      const preview = this.secret.substring(0, 10) + '...';
      console.log('✅ JWT Config initialized with secret:', preview);
      console.log('✅ JWT expires in:', this.expiresIn);
    }

    this.initialized = true;
  }

  /**
   * Get JWT secret - throws if not initialized
   */
  static getSecret(): string {
    if (!this.initialized) {
      this.initialize();
    }
    if (!this.secret) {
      throw new Error('JWT_SECRET not configured. Set JWT_SECRET in .env file.');
    }
    return this.secret;
  }

  /**
   * Get JWT expiration time
   */
  static getExpiresIn(): string {
    if (!this.initialized) {
      this.initialize();
    }
    return this.expiresIn || '24h';
  }

  /**
   * Verify secret is configured correctly
   */
  static verify(): { valid: boolean; secretPreview: string; expiresIn: string } {
    if (!this.initialized) {
      this.initialize();
    }
    return {
      valid: !!this.secret && this.secret !== 'default-secret-change-in-production',
      secretPreview: this.secret ? this.secret.substring(0, 10) + '...' : 'NOT SET',
      expiresIn: this.expiresIn || '24h',
    };
  }
}

// Initialize immediately when module loads
JwtConfig.initialize();

