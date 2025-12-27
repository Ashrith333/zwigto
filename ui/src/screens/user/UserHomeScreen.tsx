import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, RefreshControl, Linking, Modal, TextInput, Switch } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import { restaurantService } from '../../services';
import { RestaurantProfile } from '../../../shared/api-contracts';
import { theme } from '../../theme/theme';
import { BottomNavBar } from '../../components/BottomNavBar';

type SortOption = 'distance' | 'name' | 'rating';

export const UserHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [allRestaurants, setAllRestaurants] = useState<RestaurantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState<string>('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [gettingAddress, setGettingAddress] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [descriptionModalVisible, setDescriptionModalVisible] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pickOnRouteFilter, setPickOnRouteFilter] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('distance');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [sortButtonLayout, setSortButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const sortButtonRef = useRef<View>(null);

  useEffect(() => {
    loadNearbyRestaurants();
  }, []);

  // Handle location updates from MapPicker
  useEffect(() => {
    const params = (route.params as any) || {};
    if (params.selectedLatitude && params.selectedLongitude) {
      const newLocation = {
        latitude: params.selectedLatitude,
        longitude: params.selectedLongitude,
      };
      setLocation(newLocation);
      setLocationAddress(params.selectedAddress || '');
      setLocationError(null);
      // Clear params to avoid re-triggering
      (navigation as any).setParams({ selectedLatitude: undefined, selectedLongitude: undefined, selectedAddress: undefined });
    }
  }, [route.params]);

  // Get address for current location
  useEffect(() => {
    if (location && !locationAddress) {
      getLocationAddress();
    }
  }, [location]);

  const requestLocationPermission = async () => {
    setLocationRequested(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Please enable location access in settings.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const loc = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      setLocation(loc);
      setLocationError(null);
      await getLocationAddress(loc);
    } catch (error) {
      setLocationError('Failed to get location. Please try again.');
    }
  };

  const getLocationAddress = async (loc?: { latitude: number; longitude: number }) => {
    const targetLocation = loc || location;
    if (!targetLocation) return;

    setGettingAddress(true);
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude: targetLocation.latitude,
        longitude: targetLocation.longitude,
      });
      if (addresses.length > 0) {
        const addr = addresses[0];
        const addressParts = [
          addr.street,
          addr.name,
          addr.district,
          addr.city,
          addr.region,
        ].filter(Boolean);
        setLocationAddress(addressParts.length > 0 ? addressParts.join(', ') : 'Current Location');
      } else {
        setLocationAddress('Current Location');
      }
    } catch (error) {
      console.warn('Failed to reverse geocode:', error);
      setLocationAddress('Current Location');
    } finally {
      setGettingAddress(false);
    }
  };

  const handleChangeLocation = () => {
    (navigation as any).navigate('MapPicker', {
      initialLat: location?.latitude,
      initialLon: location?.longitude,
      initialAddress: locationAddress,
      useCurrentLocation: false,
    });
  };

  const loadNearbyRestaurants = async () => {
    try {
      const restaurants = await restaurantService.listRestaurants();
      setAllRestaurants(restaurants);
    } catch (error) {
      Alert.alert('Error', 'Failed to load restaurants');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Filter and sort restaurants
  const filteredAndSortedRestaurants = useMemo(() => {
    let filtered = [...allRestaurants];

    // Filter by search query (name)
    if (searchQuery.trim()) {
      filtered = filtered.filter((restaurant) =>
        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by "Pick on Route" - if enabled, navigate to RouteSearch
    // For now, we'll just show all restaurants when filter is off
    // When filter is on, we could show restaurants that are on a route (requires route selection)

    // Add distance to each restaurant if location is available
    if (location) {
      filtered = filtered.map((restaurant) => ({
        ...restaurant,
        distance: calculateDistance(
          location.latitude,
          location.longitude,
          restaurant.latitude,
          restaurant.longitude
        ),
      }));
    }

    // Sort restaurants
    filtered.sort((a, b) => {
      if (sortOption === 'distance') {
        if (location) {
          const distA = (a as any).distance || Infinity;
          const distB = (b as any).distance || Infinity;
          return distA - distB;
        }
        // If no location, sort by name
        return a.name.localeCompare(b.name);
      } else if (sortOption === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortOption === 'rating') {
        const ratingA = a.rating || 0;
        const ratingB = b.rating || 0;
        return ratingB - ratingA; // Descending order
      }
      return 0;
    });

    return filtered;
  }, [allRestaurants, searchQuery, pickOnRouteFilter, sortOption, location]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNearbyRestaurants();
  };

  const handleSelectRestaurant = (restaurantId: string) => {
    (navigation as any).navigate('RestaurantMenu', { restaurantId });
  };

  const handlePickOnRouteToggle = () => {
    if (!pickOnRouteFilter) {
      // When enabling, navigate to RouteSearch to set up route
      (navigation as any).navigate('RouteSearch');
      setPickOnRouteFilter(true);
    } else {
      // When disabling, just turn off the filter
      setPickOnRouteFilter(false);
    }
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

  const getSortLabel = (): string => {
    switch (sortOption) {
      case 'distance':
        return location ? '📍 Nearest First' : '📍 Sort by Distance';
      case 'name':
        return '🔤 Name (A-Z)';
      case 'rating':
        return '⭐ Highest Rated';
      default:
        return 'Sort...';
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          {/* Location Display */}
          {location ? (
            <TouchableOpacity
              style={styles.locationDisplay}
              onPress={handleChangeLocation}
            >
              <View style={styles.locationDisplayContent}>
                <Ionicons name="location" size={20} color="#007AFF" />
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationLabel}>Your Location</Text>
                  <Text style={styles.locationAddress} numberOfLines={1}>
                    {gettingAddress ? 'Getting address...' : locationAddress || 'Current Location'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </TouchableOpacity>
          ) : (
            <>
              {!locationRequested && (
                <TouchableOpacity
                  style={styles.locationBanner}
                  onPress={requestLocationPermission}
                >
                  <Ionicons name="location-outline" size={20} color="#007AFF" />
                  <Text style={styles.locationBannerText}>
                    Enable location to find nearby restaurants
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#007AFF" />
                </TouchableOpacity>
              )}

              {locationError && locationRequested && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{locationError}</Text>
                  <TouchableOpacity onPress={requestLocationPermission}>
                    <Text style={styles.retryLocationText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search restaurants by name..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filters and Sort */}
          <View style={styles.filtersContainer}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Pick on Route</Text>
              <Switch
                value={pickOnRouteFilter}
                onValueChange={handlePickOnRouteToggle}
                trackColor={{ false: '#ddd', true: '#007AFF' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.sortContainer}>
              <View
                ref={sortButtonRef}
                collapsable={false}
                onLayout={() => {
                  if (sortButtonRef.current) {
                    sortButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
                      setSortButtonLayout({ x: pageX, y: pageY, width, height });
                    });
                  }
                }}
              >
                <TouchableOpacity
                  style={styles.sortButton}
                  onPress={() => {
                    if (sortButtonRef.current) {
                      sortButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
                        setSortButtonLayout({ x: pageX, y: pageY, width, height });
                      });
                    }
                    setShowSortDropdown(!showSortDropdown);
                  }}
                >
                  <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
                  <Ionicons
                    name={showSortDropdown ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>

      <FlatList
        style={styles.scrollContent}
        data={filteredAndSortedRestaurants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 + Math.max(insets.bottom, 8) }]}
        onScrollBeginDrag={() => setShowSortDropdown(false)}
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
                  {location && (item as any).distance !== undefined && (
                    <Text style={styles.distanceText}>
                      📍 {((item as any).distance).toFixed(1)} km
                    </Text>
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
              <Text style={styles.emptyText}>
                {searchQuery
                  ? `No restaurants found matching "${searchQuery}"`
                  : 'No restaurants available'}
              </Text>
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

      {/* Sort Dropdown Modal */}
      <Modal
        visible={showSortDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortDropdown(false)}
      >
        <TouchableOpacity
          style={styles.sortDropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowSortDropdown(false)}
        >
          <View
            style={[
              styles.sortDropdown,
              {
                top: sortButtonLayout.y + sortButtonLayout.height + 4,
                right: sortButtonLayout.width ? undefined : 16,
                left: sortButtonLayout.width ? sortButtonLayout.x + sortButtonLayout.width - 180 : undefined,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <TouchableOpacity
              style={[
                styles.sortOption,
                sortOption === 'distance' && styles.sortOptionActive,
              ]}
              onPress={() => {
                setSortOption('distance');
                setShowSortDropdown(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortOption === 'distance' && styles.sortOptionTextActive,
                ]}
              >
                {location ? '📍 Nearest First' : '📍 Sort by Distance'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortOption,
                sortOption === 'name' && styles.sortOptionActive,
              ]}
              onPress={() => {
                setSortOption('name');
                setShowSortDropdown(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortOption === 'name' && styles.sortOptionTextActive,
                ]}
              >
                🔤 Name (A-Z)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortOption,
                styles.sortOptionLast,
                sortOption === 'rating' && styles.sortOptionActive,
              ]}
              onPress={() => {
                setSortOption('rating');
                setShowSortDropdown(false);
              }}
            >
              <Text
                style={[
                  styles.sortOptionText,
                  sortOption === 'rating' && styles.sortOptionTextActive,
                ]}
              >
                ⭐ Highest Rated
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    zIndex: 100,
    elevation: 5,
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
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  locationBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  retryLocationText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
    zIndex: 200,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sortContainer: {
    position: 'relative',
    flex: 1,
    alignItems: 'flex-end',
    zIndex: 10000,
    elevation: 20,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  sortButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  sortDropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sortDropdown: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 25,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortOptionLast: {
    borderBottomWidth: 0,
  },
  sortOptionActive: {
    backgroundColor: '#E3F2FD',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#333',
  },
  sortOptionTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  locationDisplay: {
    marginBottom: 12,
  },
  locationDisplayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
});

