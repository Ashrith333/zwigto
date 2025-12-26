import { RestaurantProfileDto } from '../../restaurants/dto/restaurant-profile.dto';
import { ChangeRequestDto } from '../../restaurants/dto/change-request.dto';

export class PendingRestaurantWithChangesDto {
  restaurant: RestaurantProfileDto;
  change_request?: ChangeRequestDto;
  is_new: boolean; // true if new restaurant, false if existing with changes
  changed_fields: string[]; // List of field names that were changed
  current_values: Record<string, any>; // Current values for changed fields
  requested_values: Record<string, any>; // Requested values for changed fields
}

