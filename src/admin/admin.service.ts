import { Injectable } from '@nestjs/common';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { ChangeRequestDto } from '../restaurants/dto/change-request.dto';
import { RestaurantProfileDto } from '../restaurants/dto/restaurant-profile.dto';
import { OrderDto } from '../orders/dto/order.dto';
import { UpdateOrderStatusDto } from '../orders/dto/update-order-status.dto';
import { OrderStatus } from '../orders/interfaces/order.interface';

@Injectable()
export class AdminService {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async approveChangeRequest(changeRequestId: string): Promise<ChangeRequestDto> {
    return this.restaurantsService.approveChangeRequest(changeRequestId);
  }

  async rejectChangeRequest(changeRequestId: string, rejectionReason?: string): Promise<ChangeRequestDto> {
    return this.restaurantsService.rejectChangeRequest(changeRequestId, rejectionReason);
  }

  async pauseRestaurant(restaurantId: string): Promise<RestaurantProfileDto> {
    return this.restaurantsService.pauseRestaurant(restaurantId);
  }

  async approveRestaurant(restaurantId: string): Promise<RestaurantProfileDto> {
    return this.restaurantsService.approveRestaurant(restaurantId);
  }

  async rejectRestaurant(restaurantId: string, rejectionReason: string): Promise<RestaurantProfileDto> {
    return this.restaurantsService.rejectRestaurant(restaurantId, rejectionReason);
  }

  async cancelOrder(orderId: string): Promise<OrderDto> {
    const updateDto: UpdateOrderStatusDto = {
      status: OrderStatus.CANCELLED,
    };
    return this.ordersService.updateOrderStatus(orderId, updateDto);
  }

  async refundPayment(
    paymentId: string,
    amount?: number,
  ): Promise<{ refund_id: string; status: string }> {
    return this.paymentsService.refundPayment(paymentId, amount);
  }

  async getPendingRestaurants(): Promise<RestaurantProfileDto[]> {
    return this.restaurantsService.listPendingRestaurants();
  }

  async getPendingRestaurantsWithChanges(): Promise<any[]> {
    const pendingRestaurants = await this.restaurantsService.listPendingRestaurants();
    const allChangeRequests = await this.restaurantsService.getAllChangeRequests();
    
    // Create a map of restaurant_id -> change request
    const changeRequestMap = new Map<string, ChangeRequestDto>();
    allChangeRequests
      .filter(cr => cr.status === 'PENDING')
      .forEach(cr => {
        changeRequestMap.set(cr.restaurant_id, cr);
      });

    const result = await Promise.all(
      pendingRestaurants.map(async (restaurant) => {
        const changeRequest = changeRequestMap.get(restaurant.id);
        
        // Determine if it's a new restaurant or an edit
        // Logic:
        // - A restaurant is NEW only if it was NEVER approved/listed (never had status ACTIVE)
        // - A restaurant is EDIT if:
        //   1. It has a change request (requesting changes to existing restaurant)
        //   2. It was ever ACTIVE before (check by looking for APPROVED change requests or checking if restaurant was ever ACTIVE)
        // 
        // To check if restaurant was ever ACTIVE:
        // - Check if there are any APPROVED change requests (means restaurant was active and edited)
        // - Or check restaurant's current status history (but we don't have that)
        // - Actually, if restaurant has a change request (even PENDING), it means it exists and is requesting changes = EDIT
        // - If no change request, we need to check if restaurant was ever approved
        //   We can check by looking for APPROVED change requests for this restaurant
        
        // Check if restaurant was ever ACTIVE by checking for APPROVED change requests
        const approvedChangeRequests = allChangeRequests.filter(
          cr => cr.restaurant_id === restaurant.id && cr.status === 'APPROVED'
        );
        const hasApprovedChangeRequest = approvedChangeRequests.length > 0;
        
        // If there's a PENDING change request, it's definitely an EDIT (existing restaurant requesting changes)
        // If there are APPROVED change requests, restaurant was edited before, so it's an existing restaurant
        // If no change requests at all AND no approved change requests, it's a NEW restaurant
        const isNew = !changeRequest && !hasApprovedChangeRequest;
        
        let changedFields: string[] = [];
        let currentValues: Record<string, any> = {};
        let requestedValues: Record<string, any> = {};
        
        if (changeRequest) {
          // Get current restaurant data to compare
          // For restaurants with change requests, we need to get the original restaurant data
          // before the change request was submitted
          try {
            // Get the restaurant profile - this will have current values
            const currentRestaurant = await this.restaurantsService.getProfile(restaurant.id);
            
            // Compare current values with requested values
            const requestedFields = changeRequest.requested_fields;
            
            Object.keys(requestedFields).forEach((field) => {
              const currentValue = (currentRestaurant as any)[field];
              const requestedValue = requestedFields[field];
              
              // Check if value actually changed
              // Handle null/undefined comparisons and number comparisons
              let changed = false;
              
              if (currentValue === null || currentValue === undefined) {
                changed = requestedValue !== null && requestedValue !== undefined;
              } else if (requestedValue === null || requestedValue === undefined) {
                changed = true;
              } else {
                // For numbers, compare as numbers
                if (typeof currentValue === 'number' || typeof requestedValue === 'number') {
                  changed = Number(currentValue) !== Number(requestedValue);
                } else {
                  changed = String(currentValue) !== String(requestedValue);
                }
              }
              
              if (changed) {
                changedFields.push(field);
                currentValues[field] = currentValue;
                requestedValues[field] = requestedValue;
              }
            });
          } catch (error) {
            // If we can't get current restaurant, all requested fields are changes
            const requestedFields = changeRequest.requested_fields;
            changedFields = Object.keys(requestedFields);
            requestedValues = requestedFields;
          }
        }
        
        return {
          restaurant,
          change_request: changeRequest || null,
          is_new: isNew,
          changed_fields: changedFields,
          current_values: currentValues,
          requested_values: requestedValues,
        };
      })
    );
    
    return result;
  }

  async getAllChangeRequests(): Promise<ChangeRequestDto[]> {
    return this.restaurantsService.getAllChangeRequests();
  }

  async getAllOrders(): Promise<OrderDto[]> {
    return this.ordersService.getAllOrders();
  }

  async getAllPayments(): Promise<any[]> {
    return this.paymentsService.getAllPayments();
  }
}

