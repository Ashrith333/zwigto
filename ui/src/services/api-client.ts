import AsyncStorage from '@react-native-async-storage/async-storage';

// Get API URL from environment or use default
// For physical device: Use your computer's IP (e.g., http://192.168.29.201:3000)
// For simulator: Use localhost (http://localhost:3000)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.201:3000';

// Log API URL for debugging
console.log('API Base URL:', API_BASE_URL);

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        console.log('Token retrieved from storage:', token.substring(0, 20) + '...');
      } else {
        console.warn('No token found in storage');
      }
      return token;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  private async getHeaders(includeAuth: boolean = true): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Authorization header set');
      } else {
        console.warn('No token available for Authorization header');
      }
    }

    return headers;
  }

  async get<T>(endpoint: string, includeAuth: boolean = true): Promise<T> {
    try {
      const headers = await this.getHeaders(includeAuth);
      console.log(`GET ${endpoint}`, { hasAuth: !!headers['Authorization'] });
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers,
      });

      console.log(`Response status: ${response.status} for ${endpoint}`);

      if (!response.ok) {
        // Handle 404 or empty responses gracefully
        if (response.status === 404) {
          const text = await response.text();
          if (!text) {
            console.log(`404 with empty body for ${endpoint}, returning null`);
            return null as T;
          }
        }
        
        // Handle 401 Unauthorized separately
        if (response.status === 401) {
          const error = await response.json().catch(() => ({ message: 'Unauthorized' }));
          console.error(`401 Unauthorized for ${endpoint}:`, error);
          throw new Error(error.message || 'Unauthorized - Invalid or expired token');
        }
        
        // Handle 403 Forbidden - for some endpoints (like /restaurants/me), this might mean no access
        // Let the service layer decide how to handle it
        if (response.status === 403) {
          const error = await response.json().catch(() => ({ message: 'Forbidden' }));
          console.warn(`403 Forbidden for ${endpoint}:`, error);
          throw new Error(error.message || 'Forbidden resource');
        }
        
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        console.error(`API Error for ${endpoint}:`, error);
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const text = await response.text();
      if (!text || text.trim() === '' || text === 'null') {
        console.log(`Empty or null response for ${endpoint}, returning null`);
        return null as T;
      }
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error(`Failed to parse JSON for ${endpoint}:`, parseError);
        // If it's a null string, return null
        if (text === 'null') {
          return null as T;
        }
        throw parseError;
      }
    } catch (error: any) {
      console.error(`Request failed for ${endpoint}:`, error);
      if (error.message === 'Network request failed' || error.message?.includes('Failed to connect')) {
        throw new Error(`Cannot connect to backend at ${this.baseUrl}. Make sure the backend is running and check your API URL in .env file.`);
      }
      throw error;
    }
  }

  async post<T>(endpoint: string, data: any, includeAuth: boolean = true): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: await this.getHeaders(includeAuth),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      if (error.message === 'Network request failed' || error.message?.includes('Failed to connect')) {
        throw new Error(`Cannot connect to backend at ${this.baseUrl}. Make sure the backend is running and check your API URL in .env file.`);
      }
      throw error;
    }
  }

  async patch<T>(endpoint: string, data: any, includeAuth: boolean = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: await this.getHeaders(includeAuth),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async delete<T>(endpoint: string, includeAuth: boolean = true): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: await this.getHeaders(includeAuth),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

