export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface FindRestaurantsRequest {
  route: RoutePoint[];
  buffer_time_minutes: number;
}

export interface EligibleRestaurant {
  restaurant_id: string;
  detour_time_minutes: number;
}

