export enum FoodType {
  VEG = 'VEG',
  NON_VEG = 'NON_VEG',
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
  created_at: Date;
  updated_at: Date;
}

