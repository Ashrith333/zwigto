import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { restaurantService } from '../../services';
import { RestaurantProfile } from '../../../shared/api-contracts';

export const RestaurantProfileScreen: React.FC = () => {
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [description, setDescription] = useState('');
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
      setPhone(rest.phone || '');
      setEmail(rest.email || '');
    } catch (error) {
      Alert.alert('Error', 'Failed to load restaurant profile');
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
        phone: phone || undefined,
        email: email || undefined,
      });
      Alert.alert('Success', 'Profile updated successfully');
      loadRestaurant();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
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
        <Text style={styles.sectionTitle}>Address</Text>
        <View style={styles.readOnlyField}>
          <Text style={styles.readOnlyText}>{restaurant.address}</Text>
        </View>
        <TouchableOpacity
          style={styles.changeRequestButton}
          onPress={handleRequestLocationChange}
        >
          <Text style={styles.changeRequestText}>Request Location Change</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Location changes require admin approval</Text>
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
});

