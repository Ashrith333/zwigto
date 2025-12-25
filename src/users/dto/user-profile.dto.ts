export class UserProfileDto {
  id: string;
  phone: string;
  role: 'USER' | 'RESTAURANT' | 'ADMIN';
  default_pin?: string; // 4-digit PIN for order pickup verification (only shown to customer)
  created_at: Date;
}

