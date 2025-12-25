import { ChangeRequest } from './restaurant.dto';
import { RestaurantProfile } from './restaurant.dto';
import { Order } from './order.dto';
import { RefundResponse } from './payment.dto';

export interface ApproveChangeRequestResponse extends ChangeRequest {}
export interface RejectChangeRequestResponse extends ChangeRequest {}
export interface PauseRestaurantResponse extends RestaurantProfile {}
export interface CancelOrderResponse extends Order {}
export interface RefundPaymentResponse extends RefundResponse {}

