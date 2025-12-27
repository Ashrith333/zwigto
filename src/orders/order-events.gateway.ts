import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { JwtConfig } from '../auth/config/jwt.config';
import { UserPayload } from '../auth/interfaces/user.interface';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/orders',
})
export class OrderEventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, { userId: string; role: string }>();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        client.disconnect();
        return;
      }

      // Verify JWT token
      const secret = JwtConfig.getSecret();
      const payload = this.jwtService.verify(token, { secret }) as any;
      
      const userId = payload.sub || payload.id;
      const role = payload.role;

      if (!userId || !role) {
        client.disconnect();
        return;
      }

      // Store client info
      this.connectedClients.set(client.id, { userId, role });

      // Join room for user-specific updates
      client.join(`user:${userId}`);
      
      // If restaurant owner, join restaurant room
      if (role === 'RESTAURANT' || role === 'ADMIN') {
        // We'll need to get restaurant_id from the user's profile
        // For now, we'll handle this when they subscribe to restaurant orders
      }

      console.log(`WebSocket client connected: ${client.id} (User: ${userId}, Role: ${role})`);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    console.log(`WebSocket client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:order')
  handleSubscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) {
      return { error: 'Not authenticated' };
    }

    // Join room for this specific order
    client.join(`order:${data.orderId}`);
    return { success: true, orderId: data.orderId };
  }

  @SubscribeMessage('subscribe:restaurant')
  handleSubscribeRestaurant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { restaurantId: string },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) {
      return { error: 'Not authenticated' };
    }

    // Join room for restaurant orders
    client.join(`restaurant:${data.restaurantId}`);
    return { success: true, restaurantId: data.restaurantId };
  }

  @SubscribeMessage('unsubscribe:order')
  handleUnsubscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    client.leave(`order:${data.orderId}`);
    return { success: true, orderId: data.orderId };
  }

  @SubscribeMessage('unsubscribe:restaurant')
  handleUnsubscribeRestaurant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { restaurantId: string },
  ) {
    client.leave(`restaurant:${data.restaurantId}`);
    return { success: true, restaurantId: data.restaurantId };
  }

  // Method to emit order update to specific order room
  emitOrderUpdate(orderId: string, orderData: any) {
    this.server.to(`order:${orderId}`).emit('order:updated', orderData);
  }

  // Method to emit order update to user's room
  emitUserOrderUpdate(userId: string, orderData: any) {
    this.server.to(`user:${userId}`).emit('order:updated', orderData);
  }

  // Method to emit new order to restaurant room
  emitRestaurantOrderUpdate(restaurantId: string, orderData: any) {
    this.server.to(`restaurant:${restaurantId}`).emit('order:updated', orderData);
  }

  // Method to emit new order to restaurant room
  emitNewOrderToRestaurant(restaurantId: string, orderData: any) {
    this.server.to(`restaurant:${restaurantId}`).emit('order:new', orderData);
  }
}

