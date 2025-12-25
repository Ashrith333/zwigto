export class AuthResponseDto {
  accessToken: string;
  user: {
    id: string;
    phone: string;
    role: 'USER' | 'RESTAURANT' | 'ADMIN';
  };
}

