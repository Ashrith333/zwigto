import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { restaurantService } from '../../services';
import { RestaurantProfile } from '../../../shared/api-contracts';

export const UserHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [restaurants, setRestaurants] = useState<RestaurantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Please enable location access.');
        // Still load restaurants without location
        loadNearbyRestaurants();
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const loc = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      setLocation(loc);
      loadNearbyRestaurants();
    } catch (error) {
      setLocationError('Failed to get location');
      loadNearbyRestaurants();
    }
  };

  const loadNearbyRestaurants = async () => {
    try {
      // For now, fetch all restaurants. Later we can add location-based filtering
      const allRestaurants = await restaurantService.listRestaurants();
      setRestaurants(allRestaurants);
    } catch (error) {
      Alert.alert('Error', 'Failed to load restaurants');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNearbyRestaurants();
  };

  const handleSelectRestaurant = (restaurantId: string) => {
    (navigation as any).navigate('RestaurantMenu', { restaurantId });
  };

  const handlePickOnRoute = () => {
    (navigation as any).navigate('RouteSearch');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Restaurants</Text>
        <TouchableOpacity
          style={styles.routeButton}
          onPress={handlePickOnRoute}
        >
          <Text style={styles.routeButtonText}>Pick on Route</Text>
        </TouchableOpacity>
      </View>

      {locationError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}

      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.restaurantCard}
            onPress={() => handleSelectRestaurant(item.id)}
          >
            <View style={styles.restaurantHeader}>
              <Text style={styles.restaurantName}>{item.name}</Text>
              <View style={[styles.statusBadge, item.status === 'OPEN' ? styles.openBadge : styles.closedBadge]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.restaurantAddress}>{item.address}</Text>
            {item.rating && (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingText}>⭐ {item.rating.toFixed(1)}</Text>
                {item.avg_prep_time_minutes && (
                  <Text style={styles.prepTimeText}>⏱ {item.avg_prep_time_minutes} min</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No restaurants available</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  routeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  routeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  errorBanner: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
  },
  restaurantCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  openBadge: {
    backgroundColor: '#E8F5E9',
  },
  closedBadge: {
    backgroundColor: '#FFE5E5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 16,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  prepTimeText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

