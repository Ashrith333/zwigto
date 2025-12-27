import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert, Switch, Modal, Image, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { menuService, restaurantService } from '../../services';
import { MenuItem, CreateMenuItemRequest, UpdateMenuItemRequest, FoodType } from '../../../shared/api-contracts';
import { theme } from '../../theme/theme';

// Define FoodType values as constants to avoid enum import issues
const FOOD_TYPE_VEG = 'VEG';
const FOOD_TYPE_NON_VEG = 'NON_VEG';

export const MenuManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [foodType, setFoodType] = useState<FoodType | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Reload menu when screen comes into focus
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      const restaurant = await restaurantService.getMyRestaurant();
      if (!restaurant) {
        Alert.alert(
          'No Restaurant',
          'You need to create a restaurant first before managing menu items.',
        );
        setLoading(false);
        return;
      }
      
      setRestaurantId(restaurant.id);
      // Restaurant owners should see all items including disabled ones
      // Pass includeAuth=true so backend recognizes owner and returns all items
      const items = await menuService.getMenuItems(restaurant.id, true, true);
      setMenuItems(items || []);
    } catch (error: any) {
      console.error('Failed to load menu items:', error);
      const errorMessage = error?.message || 'Failed to load menu items';
      
      if (errorMessage.includes('not linked') || errorMessage.includes('Forbidden') || errorMessage.includes('null')) {
        Alert.alert(
          'No Restaurant',
          'You need to create a restaurant first before managing menu items.',
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrice('');
    setPrepTime('');
    setFoodType(undefined);
    setImageUrl('');
    setIsAvailable(true);
    setEditingItem(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setName(item.name);
    setDescription(item.description || '');
    setPrice(item.price.toString());
    setPrepTime(item.prep_time_minutes.toString());
    setFoodType(item.food_type || undefined);
    setImageUrl(item.image_url || '');
    setIsAvailable(item.is_available);
    setEditingItem(item);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!restaurantId) return;

    if (!name || !price || !prepTime) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      if (editingItem) {
        const updateRequest: UpdateMenuItemRequest = {
          name,
          description: description || undefined,
          price: parseFloat(price),
          prep_time_minutes: parseInt(prepTime, 10),
          food_type: foodType,
          image_url: imageUrl || undefined,
          is_available: isAvailable,
        };
        await menuService.updateMenuItem(restaurantId, editingItem.id, updateRequest);
        Alert.alert('Success', 'Menu item updated');
      } else {
        if (!foodType) {
          Alert.alert('Error', 'Please select whether the item is Veg or Non-Veg');
          return;
        }
        const createRequest: CreateMenuItemRequest = {
          name,
          description: description || undefined,
          price: parseFloat(price),
          prep_time_minutes: parseInt(prepTime, 10),
          food_type: foodType,
          image_url: imageUrl || undefined,
        };
        console.log('Creating menu item:', {
          restaurantId,
          request: createRequest,
        });
        await menuService.createMenuItem(restaurantId, createRequest);
        Alert.alert('Success', 'Menu item added');
      }
      setShowAddModal(false);
      resetForm();
      await loadData(); // Reload menu items
    } catch (error: any) {
      console.error('Failed to save menu item:', error);
      Alert.alert('Error', error?.message || 'Failed to save menu item');
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await menuService.updateMenuItem(restaurantId!, item.id, {
        is_available: !item.is_available,
      });
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  const handleDelete = async (itemId: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this menu item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await menuService.deleteMenuItem(restaurantId!, itemId);
              Alert.alert('Success', 'Menu item deleted');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete menu item');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Menu Management</Text>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Text style={styles.addButtonText}>+ Add Item</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.menuItemCard, !item.is_available && styles.disabledCard]}>
            {item.image_url && (
              <Image source={{ uri: item.image_url }} style={styles.menuItemImage} />
            )}
            <View style={styles.menuItemHeader}>
              <View style={styles.menuItemInfo}>
                <View style={styles.menuItemTitleRow}>
                  <Text style={styles.menuItemName}>{item.name}</Text>
                  {item.food_type && (
                    <View style={[
                      styles.foodTypeBadge,
                      item.food_type === FOOD_TYPE_VEG ? styles.vegBadge : styles.nonVegBadge
                    ]}>
                      <Text style={styles.foodTypeText}>
                        {item.food_type === FOOD_TYPE_VEG ? '🟢 VEG' : '🔴 NON-VEG'}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.menuItemPrice}>₹{item.price}</Text>
                {!item.is_available && (
                  <Text style={styles.disabledLabel}>⚠️ Disabled (not visible to users)</Text>
                )}
              </View>
              <Switch
                value={item.is_available}
                onValueChange={() => handleToggleAvailability(item)}
              />
            </View>
            {item.description && (
              <Text style={styles.menuItemDescription}>{item.description}</Text>
            )}
            <View style={styles.menuItemFooter}>
              <Text style={styles.prepTime}>⏱ Avg prep time: {item.prep_time_minutes} min</Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(item)}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No menu items. Add your first item!</Text>
            </View>
          )
        }
      />

      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => {
        setShowAddModal(false);
        resetForm();
        Keyboard.dismiss();
      }}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.safeAreaModal} edges={['top', 'bottom']}>
            <KeyboardAvoidingView
              style={styles.keyboardAvoidingView}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalContainer}>
                  <TouchableWithoutFeedback>
                    <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>
                      {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                    </Text>

                    <ScrollView
                      style={styles.modalScrollView}
                      contentContainerStyle={styles.modalScrollContent}
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={true}
                    >
                      <Text style={styles.label}>Item Name *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g., Margherita Pizza"
                        value={name}
                        onChangeText={setName}
                        returnKeyType="next"
                        blurOnSubmit={true}
                      />

                      <Text style={styles.label}>Description</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Item description..."
                        value={description}
                        onChangeText={setDescription}
                        returnKeyType="next"
                        blurOnSubmit={true}
                      />

                      <View style={styles.row}>
                        <View style={styles.halfInput}>
                          <Text style={styles.label}>Price (₹) *</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="0"
                            value={price}
                            onChangeText={setPrice}
                            keyboardType="numeric"
                            returnKeyType="next"
                            blurOnSubmit={true}
                          />
                        </View>
                        <View style={styles.halfInput}>
                          <Text style={styles.label}>Avg Prep Time (min) *</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="15"
                            value={prepTime}
                            onChangeText={setPrepTime}
                            keyboardType="numeric"
                            returnKeyType="next"
                            blurOnSubmit={true}
                          />
                        </View>
                      </View>

                      <Text style={styles.label}>Food Type *</Text>
                      <View style={styles.foodTypeRow}>
                        <TouchableOpacity
                          style={[
                            styles.foodTypeButton,
                            foodType === FOOD_TYPE_VEG && styles.foodTypeButtonActive,
                          ]}
                          onPress={() => setFoodType(FOOD_TYPE_VEG as FoodType)}
                        >
                          <Text style={[
                            styles.foodTypeButtonText,
                            foodType === FOOD_TYPE_VEG && styles.foodTypeButtonTextActive,
                          ]}>
                            🟢 Veg
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.foodTypeButton,
                            foodType === FOOD_TYPE_NON_VEG && styles.foodTypeButtonActive,
                          ]}
                          onPress={() => setFoodType(FOOD_TYPE_NON_VEG as FoodType)}
                        >
                          <Text style={[
                            styles.foodTypeButtonText,
                            foodType === FOOD_TYPE_NON_VEG && styles.foodTypeButtonTextActive,
                          ]}>
                            🔴 Non-Veg
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.label}>Photo URL (Optional)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="https://example.com/image.jpg"
                        value={imageUrl}
                        onChangeText={setImageUrl}
                        keyboardType="url"
                        autoCapitalize="none"
                        returnKeyType="done"
                        blurOnSubmit={true}
                      />
                      {imageUrl && (
                        <Image source={{ uri: imageUrl }} style={styles.previewImage} />
                      )}

                      <View style={styles.switchRow}>
                        <Text style={styles.label}>Available</Text>
                        <Switch value={isAvailable} onValueChange={setIsAvailable} />
                      </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={() => {
                          setShowAddModal(false);
                          resetForm();
                          Keyboard.dismiss();
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.saveButton]}
                        onPress={handleSave}
                      >
                        <Text style={styles.saveButtonText}>
                          {editingItem ? 'Update' : 'Add'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    </View>
                  </TouchableWithoutFeedback>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  addButton: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginLeft: theme.spacing.md,
    ...theme.shadows.sm,
  },
  addButtonText: {
    color: theme.colors.textInverse,
    ...theme.typography.captionBold,
  },
  menuItemCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  disabledCard: {
    opacity: 0.7,
    backgroundColor: '#f9f9f9',
  },
  menuItemImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
  },
  menuItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  foodTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  vegBadge: {
    backgroundColor: '#E8F5E9',
  },
  nonVegBadge: {
    backgroundColor: '#FFEBEE',
  },
  foodTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  disabledLabel: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 4,
    fontStyle: 'italic',
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  menuItemPrice: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  menuItemDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  menuItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  prepTime: {
    fontSize: 12,
    color: '#666',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  editButtonText: {
    color: theme.colors.textInverse,
    ...theme.typography.smallBold,
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  deleteButtonText: {
    color: theme.colors.textInverse,
    ...theme.typography.smallBold,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeAreaModal: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 500,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    width: '100%',
    maxHeight: '85%',
    ...theme.shadows.lg,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalScrollContent: {
    paddingBottom: theme.spacing.md,
    flexGrow: 1,
  },
  foodTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  foodTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  foodTypeButtonActive: {
    borderColor: '#34C759',
    backgroundColor: '#E8F5E9',
  },
  foodTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  foodTypeButtonTextActive: {
    color: '#2E7D32',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  modalTitle: {
    ...theme.typography.h2,
    marginBottom: theme.spacing.lg,
    color: theme.colors.textPrimary,
  },
  label: {
    ...theme.typography.captionBold,
    marginBottom: theme.spacing.sm,
    color: theme.colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    ...theme.typography.body,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: theme.colors.success,
  },
  saveButtonText: {
    color: theme.colors.textInverse,
    ...theme.typography.captionBold,
  },
});

