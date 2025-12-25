export interface Review {
  id: string;
  order_id: string;
  user_id: string;
  restaurant_id: string;
  rating: number;
  comment: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface RestaurantRating {
  restaurant_id: string;
  average_rating: number;
  total_reviews: number;
}

