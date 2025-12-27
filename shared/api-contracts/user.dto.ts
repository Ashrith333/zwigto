import { UserRole } from './enums';

export interface UserProfile {
  id: string;
  phone: string;
  role: UserRole;
  default_pin?: string; // 4-digit PIN for order pickup verification (only shown to customer)
  default_role?: UserRole; // Default selected role for navigation
  name?: string; // User's name
  default_addresses?: any[]; // Array of default addresses
  created_at: string;
}

