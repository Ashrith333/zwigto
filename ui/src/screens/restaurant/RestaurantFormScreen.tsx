import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { restaurantService } from '../../services';
import { RestaurantProfile } from '../../../shared/api-contracts';

export const RestaurantFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRestaurant();
  }, []);

  // Handle navigation params when returning from MapPicker
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('focus', () => {
      // Check for params from MapPicker first, before loading restaurant
      const state = (navigation as any).getState();
      const currentRoute = state?.routes?.[state.index];
      
      if (currentRoute?.params?.selectedLatitude && currentRoute?.params?.selectedLongitude) {
        // Update address and location from map picker
        console.log('Updating from MapPicker params:', {
          latitude: currentRoute.params.selectedLatitude,
          longitude: currentRoute.params.selectedLongitude,
          address: currentRoute.params.selectedAddress,
        });
        setLatitude(currentRoute.params.selectedLatitude.toString());
        setLongitude(currentRoute.params.selectedLongitude.toString());
        if (currentRoute.params.selectedAddress) {
          setAddress(currentRoute.params.selectedAddress);
          console.log('Address set to:', currentRoute.params.selectedAddress);
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

  // Removed auto-populate - user must explicitly pick location from map
  // Removed getCurrentLocation - now handled by MapPickerScreen

  const handlePickOnMap = () => {
    const currentLat = latitude ? parseFloat(latitude) : undefined;
    const currentLon = longitude ? parseFloat(longitude) : undefined;
    (navigation as any).navigate('MapPicker', {
      initialLat: currentLat,
      initialLon: currentLon,
    });
  };

  const loadRestaurant = async () => {
    try {
      const rest = await restaurantService.getMyRestaurant();
      if (rest) {
        console.log('Loaded restaurant:', {
          id: rest.id,
          name: rest.name,
          status: rest.status,
        });
        setRestaurant(rest);
        setName(rest.name);
        setDescription(rest.description || '');
        setAddress(rest.address || '');
        setLatitude(rest.latitude?.toString() || '');
        setLongitude(rest.longitude?.toString() || '');
        setPhone(rest.phone || '');
        setEmail(rest.email || '');
        setPaymentAccount(rest.payment_account || '');
      } else {
        console.log('No restaurant found - showing empty form for creation');
      }
    } catch (error: any) {
      console.error('Failed to load restaurant:', error);
      // If no restaurant exists, that's fine - show empty form
      // Don't show error alert - just log it
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name || !address || !latitude || !longitude) {
      Alert.alert('Error', 'Please fill all required fields (name, address, location)');
      return;
    }

    setSaving(true);
    try {
      if (restaurant) {
        // Check for any changes - all fields are now editable
        const hasChanges = 
          name !== restaurant.name ||
          description !== (restaurant.description || '') ||
          address !== restaurant.address ||
          latitude !== restaurant.latitude.toString() ||
          longitude !== restaurant.longitude.toString() ||
          phone !== (restaurant.phone || '') ||
          email !== (restaurant.email || '') ||
          paymentAccount !== (restaurant.payment_account || '');

        if (hasChanges) {
          // Update all fields directly - status will be set to PENDING automatically
          await restaurantService.updateRestaurant(restaurant.id, {
            name,
            description: description || undefined,
            address,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            phone: phone || undefined,
            email: email || undefined,
            payment_account: paymentAccount || undefined,
          });

          Alert.alert('Success', 'Restaurant updated. Changes require admin approval.');
          // Reload restaurant data to reflect changes
          await loadRestaurant();
          // Navigate back to form to show updated address
          (navigation as any).goBack();
        } else {
          Alert.alert('Info', 'No changes detected');
        }
      } else {
        // Create new restaurant
        console.log('Creating restaurant with data:', {
          name,
          address,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        });
        const newRestaurant = await restaurantService.createRestaurant({
          name,
          description: description || undefined,
          address,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          phone: phone || undefined,
          email: email || undefined,
          payment_account: paymentAccount || undefined,
        });

        console.log('✅ Restaurant created:', {
          id: newRestaurant.id,
          status: newRestaurant.status,
        });

        // Reload restaurant data to get the full profile
        await loadRestaurant();
        
        Alert.alert(
          'Success', 
          'Restaurant created successfully! It will go live after admin approval. You can now add menu items.',
          [
            {
              text: 'OK',
              onPress: () => {
                (navigation as any).navigate('RestaurantHome');
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save restaurant');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {restaurant ? 'Edit Restaurant' : 'Create Restaurant'}
        </Text>
        {restaurant && restaurant.status === 'PENDING' && (
          <Text style={styles.pendingText}>Pending admin approval</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Restaurant Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter restaurant name"
          value={name}
          onChangeText={setName}
          returnKeyType="next"
          blurOnSubmit={true}
        />
        {restaurant && restaurant.status === 'ACTIVE' && (
          <Text style={styles.hint}>Name changes require admin approval</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          placeholder="Describe your restaurant..."
          value={description}
          onChangeText={setDescription}
          returnKeyType="next"
          blurOnSubmit={true}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Address & Location *</Text>
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
        {restaurant && restaurant.status === 'ACTIVE' && (
          <Text style={styles.hint}>Address and location changes require admin approval</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          placeholder="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          returnKeyType="next"
          blurOnSubmit={true}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
          blurOnSubmit={true}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Payment Details</Text>
        <TextInput
          style={styles.input}
          placeholder="UPI ID, QR code, or Bank account details"
          value={paymentAccount}
          onChangeText={setPaymentAccount}
          returnKeyType="done"
          blurOnSubmit={true}
        />
        {restaurant && restaurant.status === 'ACTIVE' && (
          <Text style={styles.hint}>Payment details changes require admin approval</Text>
        )}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {restaurant
            ? 'Restaurant will go offline until admin approves your changes.'
            : 'Restaurant will go live after admin approval.'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : restaurant ? 'Update Restaurant' : 'Create Restaurant'}
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
  pendingText: {
    fontSize: 14,
    color: '#FF9500',
    marginTop: 8,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#fff',
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  halfInput: {
    flex: 1,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
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

