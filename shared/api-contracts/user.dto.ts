import { UserRole } from './enums';

export interface UserProfile {
  id: string;
  phone: string;
  role: UserRole;
  created_at: string;
}

