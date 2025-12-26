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
  name?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  payment_account?: string;
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
  created_at: string;
  updated_at: string;
}

export interface ChangeRequest {
  id: string;
  restaurant_id: string;
  requested_fields: Record<string, any>;
  status: ChangeRequestStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PendingRestaurantWithChanges {
  restaurant: RestaurantProfile;
  change_request?: ChangeRequest | null;
  is_new: boolean;
  changed_fields: string[];
  current_values: Record<string, any>;
  requested_values: Record<string, any>;
}

