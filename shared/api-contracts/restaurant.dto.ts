import { RestaurantStatus, ChangeRequestStatus } from './enums';

export interface CreateRestaurantRequest {
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  payment_account?: string;
}

export interface UpdateRestaurantRequest {
  description?: string;
  phone?: string;
  email?: string;
}

export interface SubmitChangeRequestRequest {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  payment_account?: string;
}

export interface RestaurantProfile {
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
  created_at: string;
  updated_at: string;
  rating?: number;
  avg_prep_time_minutes?: number;
}

export interface ChangeRequest {
  id: string;
  restaurant_id: string;
  requested_fields: Record<string, any>;
  status: ChangeRequestStatus;
  created_at: string;
  updated_at: string;
}

