import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, RefreshControl, Linking, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import { restaurantService } from '../../services';
import { RestaurantProfile } from '../../../shared/api-contracts';
import { theme } from '../../theme/theme';
import { BottomNavBar } from '../../components/BottomNavBar';

export const UserHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [restaurants, setRestaurants] = useState<RestaurantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [descriptionModalVisible, setDescriptionModalVisible] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantProfile | null>(null);

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

  const handleOpenDirections = (restaurant: RestaurantProfile) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`;
    Linking.openURL(url).catch(err => {
      Alert.alert('Error', 'Could not open Google Maps');
    });
  };

  const handleShowAddress = (restaurant: RestaurantProfile, event?: any) => {
    if (event) {
      event.stopPropagation();
    }
    setSelectedRestaurant(restaurant);
    setAddressModalVisible(true);
  };

  const handleShowDescription = (restaurant: RestaurantProfile, event?: any) => {
    if (event) {
      event.stopPropagation();
    }
    setSelectedRestaurant(restaurant);
    setDescriptionModalVisible(true);
  };

  const handleCopyAddress = async () => {
    if (selectedRestaurant) {
      await Clipboard.setStringAsync(selectedRestaurant.address);
      Alert.alert('Success', 'Address copied to clipboard');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Restaurants</Text>
          <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.routeButton}
            onPress={handlePickOnRoute}
          >
            <Text style={styles.routeButtonText}>Pick on Route</Text>
          </TouchableOpacity>
        </View>
        </View>
      </SafeAreaView>

      {locationError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}

      <FlatList
        style={styles.scrollContent}
        data={restaurants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.restaurantCard}>
            <TouchableOpacity
              onPress={() => handleSelectRestaurant(item.id)}
              style={styles.restaurantCardContent}
              activeOpacity={0.7}
            >
              <View style={styles.restaurantHeader}>
                <Text style={styles.restaurantName} numberOfLines={1}>{item.name}</Text>
                <View style={[styles.statusBadge, item.status === 'ACTIVE' ? styles.openBadge : styles.closedBadge]}>
                  <Text style={styles.statusText}>{item.status === 'ACTIVE' ? 'Open' : 'Closed'}</Text>
                </View>
              </View>
              <View style={styles.descriptionRow}>
                <Text style={styles.restaurantDescription} numberOfLines={1}>
                  {item.description || item.address || 'No description available'}
                </Text>
                {(item.description || item.address) && (
                  <TouchableOpacity
                    onPress={(e) => handleShowDescription(item, e)}
                    style={styles.infoIconButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="information-circle" size={16} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.footerRow}>
                <View style={styles.ratingRow}>
                  {item.rating !== undefined && item.rating > 0 ? (
                    <Text style={styles.ratingText}>⭐ {item.rating.toFixed(1)}</Text>
                  ) : (
                    <Text style={styles.ratingText}>⭐ --</Text>
                  )}
                  {item.avg_prep_time_minutes !== undefined && item.avg_prep_time_minutes > 0 ? (
                    <Text style={styles.prepTimeText}>⏱ {item.avg_prep_time_minutes} min</Text>
                  ) : (
                    <Text style={styles.prepTimeText}>⏱ -- min</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={(e) => handleShowAddress(item, e)}
                  style={styles.addressIconButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="location" size={16} color="#007AFF" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
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

      <Modal
        visible={addressModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Restaurant Address</Text>
            {selectedRestaurant && (
              <>
                <Text style={styles.modalRestaurantName}>{selectedRestaurant.name}</Text>
                <Text style={styles.modalAddress}>{selectedRestaurant.address}</Text>
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.copyButton]}
                    onPress={handleCopyAddress}
                  >
                    <Text style={styles.modalButtonText}>📋 Copy Address</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.directionsButton]}
                    onPress={() => {
                      if (selectedRestaurant) {
                        handleOpenDirections(selectedRestaurant);
                        setAddressModalVisible(false);
                      }
                    }}
                  >
                    <Text style={styles.modalButtonText}>🧭 Open in Maps</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setAddressModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={descriptionModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDescriptionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Restaurant Description</Text>
            {selectedRestaurant && (
              <>
                <Text style={styles.modalRestaurantName}>{selectedRestaurant.name}</Text>
                <Text style={styles.modalDescription}>
                  {selectedRestaurant.description || selectedRestaurant.address || 'No description available'}
                </Text>
              </>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDescriptionModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <BottomNavBar currentScreen="Home" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: theme.colors.surface,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  historyButton: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  historyButtonText: {
    color: theme.colors.textInverse,
    ...theme.typography.captionBold,
  },
  routeButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  routeButtonText: {
    color: theme.colors.textInverse,
    ...theme.typography.captionBold,
  },
  switchRoleButton: {
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  switchRoleButtonText: {
    color: theme.colors.textInverse,
    ...theme.typography.captionBold,
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
  listContent: {
    paddingBottom: 20,
  },
  restaurantCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  restaurantCardContent: {
    padding: 14,
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    letterSpacing: -0.3,
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
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  restaurantDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    flex: 1,
    marginRight: 6,
  },
  infoIconButton: {
    padding: 2,
    marginLeft: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  modalRestaurantName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  modalAddress: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  copyButton: {
    backgroundColor: '#34C759',
  },
  directionsButton: {
    backgroundColor: '#007AFF',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },
  addressIconButton: {
    padding: 2,
    marginLeft: 8,
  },
  ratingText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  prepTimeText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
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

