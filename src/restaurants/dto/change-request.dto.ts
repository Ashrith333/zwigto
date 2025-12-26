export class ChangeRequestDto {
  id: string;
  restaurant_id: string;
  requested_fields: Record<string, any>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

