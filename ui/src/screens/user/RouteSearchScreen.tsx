import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { geoService, restaurantService } from '../../services';
import { FindRestaurantsRequest, RestaurantProfile } from '../../../shared/api-contracts';

export const RouteSearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const [startLocation, setStartLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [endLocation, setEndLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [startAddress, setStartAddress] = useState('Getting current location...');
  const [endAddress, setEndAddress] = useState('Tap to select destination');
  const [bufferMinutes, setBufferMinutes] = useState('15');
  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<RestaurantProfile[]>([]);
  const [locationLoading, setLocationLoading] = useState(true);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for route search');
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const loc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setStartLocation(loc);

      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync(loc);
      if (addresses.length > 0) {
        const addr = addresses[0];
        setStartAddress(`${addr.street || ''} ${addr.name || ''}`.trim() || 'Current Location');
      } else {
        setStartAddress('Current Location');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleSelectStartLocation = async () => {
    // For now, just use current location
    // In future, can add map picker
    await getCurrentLocation();
  };

  const handleSelectEndLocation = async () => {
    // For now, show alert to enter manually
    // In future, can add map picker or address search
    Alert.prompt(
      'Enter Destination',
      'Enter destination address or coordinates',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: async (address) => {
            if (address) {
              try {
                // Try to geocode the address
                const results = await Location.geocodeAsync(address);
                if (results.length > 0) {
                  const loc = {
                    latitude: results[0].latitude,
                    longitude: results[0].longitude,
                  };
                  setEndLocation(loc);
                  setEndAddress(address);
                } else {
                  Alert.alert('Error', 'Could not find location for that address');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to geocode address');
              }
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleSearch = async () => {
    if (!startLocation || !endLocation) {
      Alert.alert('Error', 'Please select both start and end locations');
      return;
    }

    if (!bufferMinutes || parseInt(bufferMinutes, 10) <= 0) {
      Alert.alert('Error', 'Please enter a valid buffer time');
      return;
    }

    setLoading(true);
    try {
      const request: FindRestaurantsRequest = {
        route: [
          { latitude: startLocation.latitude, longitude: startLocation.longitude },
          { latitude: endLocation.latitude, longitude: endLocation.longitude },
        ],
        buffer_time_minutes: parseInt(bufferMinutes, 10),
      };

      const eligibleRestaurants = await geoService.findEligibleRestaurants(request);
      
      const restaurantProfiles = await Promise.all(
        eligibleRestaurants.map((eligible) =>
          restaurantService.getProfile(eligible.restaurant_id)
        )
      );

      setRestaurants(restaurantProfiles);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to search restaurants');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pick on Route</Text>
      
      <View style={styles.locationCard}>
        <Text style={styles.label}>Start Location</Text>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={handleSelectStartLocation}
          disabled={locationLoading}
        >
          <Text style={styles.locationText}>{startAddress}</Text>
          {startLocation && (
            <Text style={styles.coordsText}>
              {startLocation.latitude.toFixed(4)}, {startLocation.longitude.toFixed(4)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.locationCard}>
        <Text style={styles.label}>Destination</Text>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={handleSelectEndLocation}
        >
          <Text style={styles.locationText}>{endAddress}</Text>
          {endLocation && (
            <Text style={styles.coordsText}>
              {endLocation.latitude.toFixed(4)}, {endLocation.longitude.toFixed(4)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputCard}>
        <Text style={styles.label}>Max Additional Travel Time (minutes)</Text>
        <TextInput
          style={styles.input}
          placeholder="15"
          value={bufferMinutes}
          onChangeText={setBufferMinutes}
          keyboardType="numeric"
        />
        <Text style={styles.hint}>How much extra time can you spend?</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, (loading || !startLocation || !endLocation) && styles.buttonDisabled]}
        onPress={handleSearch}
        disabled={loading || !startLocation || !endLocation}
      >
        <Text style={styles.buttonText}>{loading ? 'Searching...' : 'Find Restaurants'}</Text>
      </TouchableOpacity>

      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.restaurantCard}
            onPress={() => (navigation as any).navigate('RestaurantMenu', { restaurantId: item.id })}
          >
            <Text style={styles.restaurantName}>{item.name}</Text>
            <Text style={styles.restaurantAddress}>{item.address}</Text>
            <View style={styles.restaurantFooter}>
              <Text style={styles.restaurantStatus}>Status: {item.status}</Text>
              {item.avg_prep_time_minutes && (
                <Text style={styles.prepTime}>⏱ {item.avg_prep_time_minutes} min</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading && restaurants.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No restaurants found on this route</Text>
              <Text style={styles.emptySubtext}>Try adjusting your buffer time</Text>
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
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  locationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  locationButton: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  coordsText: {
    fontSize: 12,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restaurantCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  restaurantFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantStatus: {
    fontSize: 12,
    color: '#999',
  },
  prepTime: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
  },
});
