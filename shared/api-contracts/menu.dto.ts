export enum FoodType {
  VEG = 'VEG',
  NON_VEG = 'NON_VEG',
}

export interface CreateMenuItemRequest {
  name: string;
  description?: string;
  price: number;
  prep_time_minutes: number;
  food_type?: FoodType;
  image_url?: string;
}

export interface UpdateMenuItemRequest {
  name?: string;
  description?: string;
  price?: number;
  prep_time_minutes?: number;
  food_type?: FoodType;
  image_url?: string;
  is_available?: boolean;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  prep_time_minutes: number;
  food_type: FoodType | null;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

