import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { restaurantService, menuService } from '../../services';
import { RestaurantProfile } from '../../../shared/api-contracts';

export const RestaurantSetupScreen: React.FC = () => {
  const navigation = useNavigation();
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [description, setDescription] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [menuItemCount, setMenuItemCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRestaurantData();
  }, []);

  const loadRestaurantData = async () => {
    try {
      // Get restaurant for current user
      const rest = await restaurantService.getMyRestaurant();
      
      // If restaurant doesn't exist, show empty form for creation
      if (!rest) {
        setLoading(false);
        return;
      }
      
      setRestaurant(rest);
      setDescription(rest.description || '');
      setPaymentAccount(rest.payment_account || '');
      
      // Count menu items
      try {
        // Restaurant owner view: show all items including disabled
        const menuItems = await menuService.getMenuItems(rest.id, true, true);
        setMenuItemCount(menuItems.length);
      } catch (menuError) {
        console.warn('Failed to load menu items:', menuError);
        setMenuItemCount(0);
      }
    } catch (error: any) {
      console.error('Failed to load restaurant data:', error);
      const errorMessage = error?.message || 'Failed to load restaurant data';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!restaurant) return;

    setSaving(true);
    try {
      await restaurantService.updateRestaurant(restaurant.id, {
        description,
      });

      if (paymentAccount) {
        // Submit change request for payment account
        await restaurantService.submitChangeRequest(restaurant.id, {
          payment_account: paymentAccount,
        });
      }

      Alert.alert('Success', 'Restaurant details saved. Restaurant will go live after admin approval.');
      (navigation as any).navigate('RestaurantHome');
    } catch (error) {
      Alert.alert('Error', 'Failed to save restaurant details');
    } finally {
      setSaving(false);
    }
  };

  const isSetupComplete = () => {
    if (!restaurant) {
      // For new restaurant, need description and at least one menu item
      return description.length > 0 && menuItemCount > 0;
    }
    return description.length > 0 && menuItemCount > 0;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // If no restaurant exists, show message to contact admin or create one
  if (!restaurant) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Restaurant</Text>
          <Text style={styles.subtitle}>Set up your restaurant profile</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            To create a restaurant, please contact admin or use the admin panel to create your restaurant profile.
            Once created, you can edit all details here.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Restaurant Setup</Text>
        <Text style={styles.subtitle}>Complete your restaurant profile to go live</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Restaurant Name</Text>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyText}>{restaurant.name}</Text>
          {restaurant.status === 'PENDING' && (
            <Text style={styles.pendingText}>Pending admin approval</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe your restaurant..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Details</Text>
        <Text style={styles.hint}>UPI ID, QR code, or Bank account details</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter payment details"
          value={paymentAccount}
          onChangeText={setPaymentAccount}
        />
        <Text style={styles.warningText}>
          Payment details require admin approval. Until approved, payments settle to platform account.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Menu Items</Text>
        <View style={styles.checklistItem}>
          <Text style={styles.checklistText}>
            {menuItemCount > 0 ? '✅' : '⭕'} Add at least one menu item
          </Text>
          <Text style={styles.checklistCount}>({menuItemCount} items)</Text>
        </View>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => (navigation as any).navigate('MenuManagement')}
        >
          <Text style={styles.linkButtonText}>Go to Menu Management</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Restaurant will go live after admin approval.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, (!isSetupComplete() || saving) && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!isSetupComplete() || saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save & Continue'}
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
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
  },
  readOnlyText: {
    fontSize: 16,
    color: '#333',
  },
  pendingText: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#fff',
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
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 8,
    fontStyle: 'italic',
  },
  checklistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
  },
  checklistText: {
    fontSize: 16,
    color: '#333',
  },
  checklistCount: {
    fontSize: 14,
    color: '#666',
  },
  linkButton: {
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#fff',
    fontWeight: '600',
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
});

