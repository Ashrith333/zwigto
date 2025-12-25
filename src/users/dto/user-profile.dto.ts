export class UserProfileDto {
  id: string;
  phone: string;
  role: 'USER' | 'RESTAURANT' | 'ADMIN';
  created_at: Date;
}

