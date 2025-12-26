export enum RestaurantStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
}

export enum ChangeRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  email: string | null;
  payment_account: string | null;
  status: RestaurantStatus;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
  average_rating?: number;
  avg_prep_time_minutes?: number;
}

export interface RestaurantUser {
  id: string;
  restaurant_id: string;
  user_id: string;
  created_at: Date;
}

export interface RestaurantChangeRequest {
  id: string;
  restaurant_id: string;
  requested_fields: Record<string, any>;
  status: ChangeRequestStatus;
  created_at: Date;
  updated_at: Date;
}

