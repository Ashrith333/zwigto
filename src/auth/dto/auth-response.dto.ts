export class AuthResponseDto {
  accessToken: string;
  user: {
    id: string;
    phone: string;
    role: 'USER' | 'RESTAURANT' | 'ADMIN';
    default_role?: 'USER' | 'RESTAURANT' | 'ADMIN'; // Default selected role for navigation
  };
}

