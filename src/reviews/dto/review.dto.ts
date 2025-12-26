export class ReviewDto {
  id: string;
  order_id: string;
  user_id: string;
  restaurant_id: string;
  rating: number;
  comment: string | null;
  restaurant_reply: string | null;
  created_at: Date;
  updated_at: Date;
}

