import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { restaurantService } from '../../services';
import { RestaurantProfile } from '../../../shared/api-contracts';

export const RestaurantProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    try {
      const rest = await restaurantService.getMyRestaurant();
      setRestaurant(rest);
      setDescription(rest.description || '');
      setAddress(rest.address || '');
      setLatitude(rest.latitude?.toString() || '');
      setLongitude(rest.longitude?.toString() || '');
      setPhone(rest.phone || '');
      setEmail(rest.email || '');
    } catch (error) {
      Alert.alert('Error', 'Failed to load restaurant profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle navigation params when returning from MapPicker
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('focus', () => {
      // Check for params from MapPicker first, before loading restaurant
      const state = (navigation as any).getState();
      const currentRoute = state?.routes?.[state.index];
      
      if (currentRoute?.params?.selectedLatitude && currentRoute?.params?.selectedLongitude) {
        // Update address and location from map picker
        setLatitude(currentRoute.params.selectedLatitude.toString());
        setLongitude(currentRoute.params.selectedLongitude.toString());
        if (currentRoute.params.selectedAddress) {
          setAddress(currentRoute.params.selectedAddress);
        }
        // Clear params after using them
        (navigation as any).setParams({
          selectedLatitude: undefined,
          selectedLongitude: undefined,
          selectedAddress: undefined,
        });
      } else {
        // Only reload restaurant if no new params (to avoid overwriting map selection)
        loadRestaurant();
      }
    });
    
    return unsubscribe;
  }, [navigation]);

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to auto-fill your restaurant location. You can enter it manually.',
        );
        setGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLatitude(location.coords.latitude.toFixed(6));
      setLongitude(location.coords.longitude.toFixed(6));

      // Try to reverse geocode to get address if address is empty
      if (!address) {
        try {
          const addresses = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
          if (addresses.length > 0) {
            const addr = addresses[0];
            const addressParts = [
              addr.street,
              addr.name,
              addr.district,
              addr.city,
              addr.region,
              addr.postalCode,
            ].filter(Boolean);
            if (addressParts.length > 0) {
              setAddress(addressParts.join(', '));
            }
          }
        } catch (geocodeError) {
          console.warn('Failed to reverse geocode:', geocodeError);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to get current location');
    } finally {
      setGettingLocation(false);
    }
  };

  const handlePickOnMap = () => {
    const currentLat = latitude ? parseFloat(latitude) : undefined;
    const currentLon = longitude ? parseFloat(longitude) : undefined;
    (navigation as any).navigate('MapPicker', {
      initialLat: currentLat,
      initialLon: currentLon,
    });
  };

  const handleSave = async () => {
    if (!restaurant) return;

    if (!address || !latitude || !longitude) {
      Alert.alert('Error', 'Please fill all required fields (address, location)');
      return;
    }

    setSaving(true);
    try {
      await restaurantService.updateRestaurant(restaurant.id, {
        description: description || undefined,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        phone: phone || undefined,
        email: email || undefined,
      });
      Alert.alert('Success', 'Profile updated successfully. Changes require admin approval.');
      loadRestaurant();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestNameChange = () => {
    Alert.alert(
      'Name Change',
      'Restaurant name changes require admin approval. Submit a change request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Request',
          onPress: async () => {
            Alert.prompt(
              'New Restaurant Name',
              'Enter the new name for your restaurant',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Submit',
                  onPress: async (newName) => {
                    if (newName && restaurant) {
                      try {
                        await restaurantService.submitChangeRequest(restaurant.id, {
                          name: newName,
                        });
                        Alert.alert('Success', 'Change request submitted. Pending admin approval.');
                      } catch (error) {
                        Alert.alert('Error', 'Failed to submit change request');
                      }
                    }
                  },
                },
              ],
              'plain-text'
            );
          },
        },
      ]
    );
  };

  const handleRequestLocationChange = () => {
    Alert.alert(
      'Location Change',
      'Location changes require admin approval. This feature will be available soon.',
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.container}>
        <Text>Restaurant not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Restaurant Profile</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Restaurant Name</Text>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyText}>{restaurant.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.changeRequestButton}
          onPress={handleRequestNameChange}
        >
          <Text style={styles.changeRequestText}>Request Name Change</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Name changes require admin approval</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address & Location *</Text>
        {address && address.trim() ? (
          <View style={styles.selectedAddressContainer}>
            <Text style={styles.selectedAddressLabel}>Selected Address:</Text>
            <Text style={styles.selectedAddressText}>{address}</Text>
            <Text style={styles.locationInfoText}>
              Lat: {latitude || 'Not set'} | Lon: {longitude || 'Not set'}
            </Text>
          </View>
        ) : (
          <Text style={styles.hint}>No address selected. Please pick a location using the buttons below.</Text>
        )}
        <View style={styles.locationButtonsRow}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => {
              const currentLat = latitude ? parseFloat(latitude) : undefined;
              const currentLon = longitude ? parseFloat(longitude) : undefined;
              (navigation as any).navigate('MapPicker', {
                initialLat: currentLat,
                initialLon: currentLon,
                initialAddress: address,
                useCurrentLocation: true,
              });
            }}
          >
            <Text style={styles.locationButtonText}>📍 Pick Current Location</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handlePickOnMap}
          >
            <Text style={styles.locationButtonText}>🗺️ Pick on Map</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          Click either button to open the map and select your restaurant location. Address will be confirmed from the map.
        </Text>
        <Text style={styles.hint}>Address and location changes require admin approval</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe your restaurant..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
        <Text style={styles.hint}>You can edit this directly</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Text style={styles.hint}>You can edit this directly</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.hint}>You can edit this directly</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={[styles.statusBadge, restaurant.status === 'ACTIVE' ? styles.activeBadge : styles.pendingBadge]}>
          <Text style={styles.statusText}>{restaurant.status}</Text>
        </View>
        {restaurant.status === 'PENDING' && (
          <Text style={styles.pendingText}>Pending admin approval</Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  readOnlyField: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  readOnlyText: {
    fontSize: 16,
    color: '#333',
  },
  changeRequestButton: {
    backgroundColor: '#FF9500',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  changeRequestText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  addressInput: {
    marginBottom: 12,
  },
  locationInfo: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  locationInfoText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  pendingBadge: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  pendingText: {
    fontSize: 12,
    color: '#FF9500',
  },
  saveButton: {
    backgroundColor: '#34C759',
    padding: 16,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  locationButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  locationButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  selectedAddressContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedAddressLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  selectedAddressText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  locationInfoText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});

