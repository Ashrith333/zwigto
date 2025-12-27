export class UserProfileDto {
  id: string;
  phone: string;
  role: 'USER' | 'RESTAURANT' | 'ADMIN';
  default_pin?: string; // 4-digit PIN for order pickup verification (only shown to customer)
  default_role?: 'USER' | 'RESTAURANT' | 'ADMIN'; // Default selected role for navigation
  name?: string; // User's name
  default_addresses?: any[]; // Array of default addresses
  created_at: Date;
}

