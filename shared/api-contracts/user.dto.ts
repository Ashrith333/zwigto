import { UserRole } from './enums';

export interface UserProfile {
  id: string;
  phone: string;
  role: UserRole;
  default_pin?: string; // 4-digit PIN for order pickup verification (only shown to customer)
  created_at: string;
}

