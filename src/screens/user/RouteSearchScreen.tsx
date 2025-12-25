import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, FlatList } from 'react-native';
import { geoService, restaurantService } from '../../services';
import { FindRestaurantsRequest, EligibleRestaurant, RestaurantProfile } from '../../../shared/api-contracts';

interface RouteSearchScreenProps {
  onSelectRestaurant: (restaurantId: string) => void;
}

export const RouteSearchScreen: React.FC<RouteSearchScreenProps> = ({
  onSelectRestaurant,
}) => {
  const [startLat, setStartLat] = useState('');
  const [startLng, setStartLng] = useState('');
  const [endLat, setEndLat] = useState('');
  const [endLng, setEndLng] = useState('');
  const [bufferMinutes, setBufferMinutes] = useState('15');
  const [loading, setLoading] = useState(false);
  const [restaurants, setRestaurants] = useState<RestaurantProfile[]>([]);

  const handleSearch = async () => {
    if (!startLat || !startLng || !endLat || !endLng) {
      Alert.alert('Error', 'Please enter route coordinates');
      return;
    }

    setLoading(true);
    try {
      const request: FindRestaurantsRequest = {
        route: [
          { latitude: parseFloat(startLat), longitude: parseFloat(startLng) },
          { latitude: parseFloat(endLat), longitude: parseFloat(endLng) },
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
      <Text style={styles.title}>Find Restaurants on Route</Text>
      
      <Text style={styles.label}>Start Point</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Latitude"
          value={startLat}
          onChangeText={setStartLat}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Longitude"
          value={startLng}
          onChangeText={setStartLng}
          keyboardType="numeric"
        />
      </View>

      <Text style={styles.label}>End Point</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Latitude"
          value={endLat}
          onChangeText={setEndLat}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Longitude"
          value={endLng}
          onChangeText={setEndLng}
          keyboardType="numeric"
        />
      </View>

      <Text style={styles.label}>Max Additional Time (minutes)</Text>
      <TextInput
        style={styles.input}
        placeholder="15"
        value={bufferMinutes}
        onChangeText={setBufferMinutes}
        keyboardType="numeric"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSearch}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'Searching...' : 'Search'}</Text>
      </TouchableOpacity>

      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.restaurantCard}
            onPress={() => onSelectRestaurant(item.id)}
          >
            <Text style={styles.restaurantName}>{item.name}</Text>
            <Text style={styles.restaurantAddress}>{item.address}</Text>
            <Text style={styles.restaurantStatus}>Status: {item.status}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading && <Text style={styles.emptyText}>No restaurants found</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  },
  halfInput: {
    width: '48%',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
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
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  restaurantStatus: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
  },
});

