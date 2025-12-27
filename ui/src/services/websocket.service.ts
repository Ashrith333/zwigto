import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get API URL from environment or use default
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.201:3000';
// Convert HTTP URL to WebSocket URL
const WS_URL = API_BASE_URL.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://');

class WebSocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect(): Promise<Socket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.socket?.connected) {
            clearInterval(checkInterval);
            resolve(this.socket!);
          }
        }, 100);
      });
    }

    this.isConnecting = true;

    try {
      const token = await AsyncStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('No auth token found');
      }

      this.socket = io(`${WS_URL}/orders`, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.isConnecting = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.isConnecting = false;
        this.reconnectAttempts++;
      });

      return this.socket;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  async subscribeToOrder(orderId: string, callback: (order: any) => void): Promise<void> {
    const socket = await this.connect();
    
    socket.emit('subscribe:order', { orderId });
    
    socket.on('order:updated', (orderData: any) => {
      if (orderData.id === orderId) {
        callback(orderData);
      }
    });
  }

  async subscribeToRestaurantOrders(restaurantId: string, callback: (order: any) => void): Promise<void> {
    const socket = await this.connect();
    
    socket.emit('subscribe:restaurant', { restaurantId });
    
    socket.on('order:updated', callback);
    socket.on('order:new', callback);
  }

  async unsubscribeFromOrder(orderId: string): Promise<void> {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:order', { orderId });
    }
  }

  async unsubscribeFromRestaurant(restaurantId: string): Promise<void> {
    if (this.socket?.connected) {
      this.socket.emit('unsubscribe:restaurant', { restaurantId });
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const websocketService = new WebSocketService();

