import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, RefreshControl, TextInput, Modal } from 'react-native';
import { restaurantService, adminService } from '../../services';
import { RestaurantProfile } from '../../../shared/api-contracts';

export const RestaurantApprovalsScreen: React.FC = () => {
  const [restaurants, setRestaurants] = useState<RestaurantProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingRestaurantId, setRejectingRestaurantId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadPendingRestaurants();
  }, []);

  const loadPendingRestaurants = async () => {
    try {
      const pending = await adminService.getPendingRestaurants();
      setRestaurants(pending);
    } catch (error) {
      console.error('Failed to load pending restaurants:', error);
      Alert.alert('Error', 'Failed to load pending restaurants');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (restaurantId: string) => {
    try {
      await adminService.approveRestaurant(restaurantId);
      Alert.alert('Success', 'Restaurant approved');
      loadPendingRestaurants();
    } catch (error) {
      Alert.alert('Error', 'Failed to approve restaurant');
    }
  };

  const handleReject = (restaurantId: string) => {
    setRejectingRestaurantId(restaurantId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectingRestaurantId) return;
    
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      await adminService.rejectRestaurant(rejectingRestaurantId, rejectionReason.trim());
      Alert.alert('Success', 'Restaurant rejected');
      setShowRejectModal(false);
      setRejectingRestaurantId(null);
      setRejectionReason('');
      loadPendingRestaurants();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to reject restaurant');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPendingRestaurants();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.restaurantCard}>
            <Text style={styles.restaurantName}>{item.name}</Text>
            <Text style={styles.restaurantAddress}>{item.address}</Text>
            {item.latitude != null && item.longitude != null && (
              <Text style={styles.restaurantDetails}>
                📍 {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
              </Text>
            )}
            {item.phone && <Text style={styles.restaurantDetails}>📞 {item.phone}</Text>}
            {item.email && <Text style={styles.restaurantDetails}>✉️ {item.email}</Text>}
            {item.description && (
              <Text style={styles.description}>{item.description}</Text>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.button, styles.rejectButton]}
                onPress={() => handleReject(item.id)}
              >
                <Text style={styles.buttonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.approveButton]}
                onPress={() => handleApprove(item.id)}
              >
                <Text style={styles.buttonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pending restaurant approvals</Text>
            </View>
          )
        }
      />
      
      <Modal
        visible={showRejectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Restaurant</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for rejection:</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason..."
              multiline
              numberOfLines={4}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholderTextColor="#999"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectingRestaurantId(null);
                  setRejectionReason('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmRejectButton]}
                onPress={confirmReject}
              >
                <Text style={styles.modalButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
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
  restaurantCard: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  restaurantAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  restaurantDetails: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  confirmRejectButton: {
    backgroundColor: '#FF3B30',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

