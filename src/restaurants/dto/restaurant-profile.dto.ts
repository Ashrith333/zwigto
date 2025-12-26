export class RestaurantProfileDto {
  id: string;
  name: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  email: string | null;
  payment_account: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'PENDING' | 'REJECTED';
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
  rating?: number;
  avg_prep_time_minutes?: number;
}

