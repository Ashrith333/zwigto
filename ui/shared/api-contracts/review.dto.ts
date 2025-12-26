export interface CreateReviewRequest {
  order_id: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewRequest {
  rating: number;
  comment?: string;
}

export interface ReplyReviewRequest {
  reply: string;
}

export interface Review {
  id: string;
  order_id: string;
  user_id: string;
  restaurant_id: string;
  rating: number;
  comment: string | null;
  restaurant_reply: string | null;
  created_at: string;
  updated_at: string;
}

export interface RestaurantRating {
  restaurant_id: string;
  average_rating: number;
  total_reviews: number;
}

