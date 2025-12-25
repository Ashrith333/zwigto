export enum UserRole {
  USER = 'USER',
  RESTAURANT = 'RESTAURANT',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  phone: string;
  password_hash: string | null;
  role: UserRole;
  default_pin: string | null; // 4-digit PIN for order pickup verification
}

export interface UserPayload {
  id: string;
  phone: string;
  role: UserRole;
}

