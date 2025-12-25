import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { restaurantService } from '../../services';
import { RestaurantProfile } from '../../../shared/api-contracts';

export const PaymentDetailsScreen: React.FC = () => {
  const [restaurant, setRestaurant] = useState<RestaurantProfile | null>(null);
  const [paymentAccount, setPaymentAccount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    try {
      const rest = await restaurantService.getMyRestaurant();
      setRestaurant(rest);
      setPaymentAccount(rest.payment_account || '');
    } catch (error) {
      Alert.alert('Error', 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!restaurant) return;

    setSaving(true);
    try {
      // Payment account changes require admin approval
      await restaurantService.submitChangeRequest(restaurant.id, {
        payment_account: paymentAccount,
      });
      Alert.alert(
        'Success',
        'Payment details change request submitted. Pending admin approval. Until approved, payments settle to platform account.'
      );
      loadRestaurant();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit payment details change request');
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
        <Text style={styles.title}>Payment Details</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Current Payment Account</Text>
        {restaurant.payment_account ? (
          <Text style={styles.currentPayment}>{restaurant.payment_account}</Text>
        ) : (
          <Text style={styles.noPayment}>No payment account set</Text>
        )}
        <Text style={styles.infoText}>
          Payments will be settled to platform account by default until your payment details are approved.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Update Payment Details</Text>
        <Text style={styles.hint}>
          Enter UPI ID, QR code details, or Bank account information
        </Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g., upi@paytm or Bank: HDFC, Account: 1234567890, IFSC: HDFC0001234"
          value={paymentAccount}
          onChangeText={setPaymentAccount}
          multiline
          numberOfLines={4}
        />
        <Text style={styles.warningText}>
          ⚠️ Payment detail updates require admin approval. Changes will take effect after approval.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Submitting...' : 'Submit Change Request'}
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
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1976D2',
  },
  currentPayment: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  noPayment: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 18,
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
    marginBottom: 8,
    color: '#333',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    color: '#FF9500',
    fontStyle: 'italic',
    lineHeight: 18,
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

