import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Linking, Modal } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { menuService, restaurantService } from '../../services';
import { MenuItem, RestaurantProfile } from '../../../shared/api-contracts';

export const RestaurantMenuScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { restaurantId } = route.params as { restaurantId: string };
  
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);

  useEffect(() => {
    loadRestaurantData();
  }, [restaurantId]);

  const loadRestaurantData = async () => {
    try {
      const [restaurantData, items] = await Promise.all([
        restaurantService.getProfile(restaurantId),
        // Customer view: don't send auth token and filter disabled items
        menuService.getMenuItems(restaurantId, false, false),
      ]);
      setRestaurant(restaurantData);
      // Double-check: filter out any disabled items (safety measure)
      const availableItems = (items || []).filter(item => item.is_available === true);
      setMenuItems(availableItems);
    } catch (error) {
      Alert.alert('Error', 'Failed to load restaurant menu');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (itemId: string) => {
    setCart((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 0) + 1,
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[itemId] > 1) {
        newCart[itemId] -= 1;
      } else {
        delete newCart[itemId];
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    return menuItems.reduce((total, item) => {
      const quantity = cart[item.id] || 0;
      return total + item.price * quantity;
    }, 0);
  };

  const getCartItemCount = () => {
    return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  };

  const handleCheckout = () => {
    if (getCartItemCount() === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart');
      return;
    }
    // Navigate to checkout screen with cart and restaurant info
    navigation.navigate('Checkout', {
      restaurantId: restaurantId,
      restaurant: restaurant,
      cart: cart,
      menuItems: menuItems,
    });
  };

  const handleOpenDirections = () => {
    if (!restaurant) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`;
    Linking.openURL(url).catch(err => {
      Alert.alert('Error', 'Could not open Google Maps');
    });
  };

  const handleCopyAddress = async () => {
    if (restaurant) {
      await Clipboard.setStringAsync(restaurant.address);
      Alert.alert('Success', 'Address copied to clipboard');
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
    <View style={styles.container}>
      {restaurant && (
        <View style={styles.restaurantHeader}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <View style={styles.descriptionRow}>
            <Text 
              style={styles.restaurantDescription} 
              numberOfLines={descriptionExpanded ? undefined : 1}
            >
              {restaurant.description || restaurant.address || 'No description available'}
            </Text>
            {(restaurant.description || restaurant.address) && (
              <TouchableOpacity
                onPress={() => setDescriptionExpanded(!descriptionExpanded)}
                style={styles.expandButton}
              >
                <Text style={styles.expandButtonText}>
                  {descriptionExpanded ? 'Show Less' : 'Show More'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.addressRow}>
            <Text style={styles.restaurantAddress} numberOfLines={1}>
              {restaurant.address}
            </Text>
            <TouchableOpacity
              onPress={() => setAddressModalVisible(true)}
              style={styles.addressIconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="location" size={16} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.menuItem}>
            <View style={styles.menuItemInfo}>
              <Text style={styles.menuItemName}>{item.name}</Text>
              <Text style={styles.menuItemDescription}>{item.description}</Text>
              <View style={styles.menuItemFooter}>
                <Text style={styles.menuItemPrice}>₹{item.price}</Text>
                {item.food_type && (
                  <Text style={styles.menuItemType}>
                    {item.food_type === 'VEG' ? '🟢 Veg' : '🔴 Non-Veg'}
                  </Text>
                )}
                {item.prep_time_minutes && (
                  <Text style={styles.prepTime}>⏱ {item.prep_time_minutes} min</Text>
                )}
              </View>
            </View>
            <View style={styles.cartControls}>
              {cart[item.id] ? (
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => removeFromCart(item.id)}
                  >
                    <Text style={styles.quantityButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantity}>{cart[item.id]}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => addToCart(item.id)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addToCart(item.id)}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No menu items available</Text>
          </View>
        }
      />

      {getCartItemCount() > 0 && (
        <View style={styles.cartFooter}>
          <View style={styles.cartInfo}>
            <Text style={styles.cartCount}>{getCartItemCount()} items</Text>
            <Text style={styles.cartTotal}>₹{getCartTotal().toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
            <Text style={styles.checkoutButtonText}>Checkout</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={addressModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Restaurant Address</Text>
            {restaurant && (
              <>
                <Text style={styles.modalRestaurantName}>{restaurant.name}</Text>
                <Text style={styles.modalAddress}>{restaurant.address}</Text>
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
                      handleOpenDirections();
                      setAddressModalVisible(false);
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  restaurantHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1a1a1a',
    letterSpacing: -0.3,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  restaurantDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    flex: 1,
    marginRight: 6,
  },
  expandButton: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  expandButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantAddress: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    marginRight: 6,
  },
  addressIconButton: {
    padding: 2,
    marginLeft: 8,
  },
  menuItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  menuItemFooter: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  menuItemType: {
    fontSize: 12,
    color: '#666',
  },
  prepTime: {
    fontSize: 12,
    color: '#666',
  },
  cartControls: {
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    backgroundColor: '#f0f0f0',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  cartFooter: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartInfo: {
    flex: 1,
  },
  cartCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cartTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  checkoutButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
});

