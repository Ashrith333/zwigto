import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { adminService } from '../../services';
import { PendingRestaurantWithChanges } from '../../../shared/api-contracts';

export const RestaurantApprovalDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { approval } = route.params as { approval: PendingRestaurantWithChanges };
  
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      name: 'Restaurant Name',
      address: 'Address',
      latitude: 'Latitude',
      longitude: 'Longitude',
      payment_account: 'Payment Account',
    };
    return labels[field] || field;
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'Not set';
    if (typeof value === 'number') return value.toString();
    return String(value);
  };

  const handleApprove = async () => {
    Alert.alert(
      'Approve Restaurant',
      `Are you sure you want to approve ${approval.restaurant.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              if (approval.change_request) {
                // Approve change request
                await adminService.approveChangeRequest(approval.change_request.id);
              } else {
                // Approve new restaurant
                await adminService.approveRestaurant(approval.restaurant.id);
              }
              Alert.alert('Success', 'Restaurant approved successfully');
              (navigation as any).goBack();
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.message || 'Failed to approve restaurant');
            }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    setSubmitting(true);
    try {
      if (approval.change_request) {
        // Reject change request
        await adminService.rejectChangeRequest(approval.change_request.id, rejectionReason.trim());
      } else {
        // Reject new restaurant
        await adminService.rejectRestaurant(approval.restaurant.id, rejectionReason.trim());
      }
      Alert.alert('Success', 'Restaurant rejected');
      setRejectModalVisible(false);
      (navigation as any).goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to reject restaurant');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View
            style={[
              styles.statusBadge,
              approval.is_new ? styles.newBadge : styles.editBadge,
            ]}
          >
            <Text style={styles.statusText}>
              {approval.is_new ? 'NEW RESTAURANT' : 'RESTAURANT EDIT'}
            </Text>
          </View>
        </View>

        {/* Restaurant Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restaurant Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Restaurant Name:</Text>
            <Text style={[styles.infoValue, approval.changed_fields.includes('name') && styles.changedValue]}>
              {approval.restaurant.name}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={[styles.infoValue, approval.changed_fields.includes('address') && styles.changedValue]}>
              {approval.restaurant.address}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>
              {approval.restaurant.latitude != null ? Number(approval.restaurant.latitude).toFixed(6) : 'N/A'}, {approval.restaurant.longitude != null ? Number(approval.restaurant.longitude).toFixed(6) : 'N/A'}
            </Text>
          </View>

          {approval.restaurant.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Description:</Text>
              <Text style={styles.infoValue}>{approval.restaurant.description}</Text>
            </View>
          )}

          {approval.restaurant.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{approval.restaurant.phone}</Text>
            </View>
          )}

          {approval.restaurant.email && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{approval.restaurant.email}</Text>
            </View>
          )}

          {approval.restaurant.payment_account && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Account:</Text>
              <Text style={[styles.infoValue, approval.changed_fields.includes('payment_account') && styles.changedValue]}>
                {approval.restaurant.payment_account}
              </Text>
            </View>
          )}
        </View>

        {/* Changes Section (for edits) */}
        {!approval.is_new && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {approval.changed_fields.length > 0 ? 'Requested Changes' : 'Restaurant Details (Existing Restaurant)'}
            </Text>
            {approval.changed_fields.length > 0 ? (
              approval.changed_fields.map((field) => (
                <View key={field} style={styles.changeCard}>
                  <Text style={styles.changeFieldLabel}>{getFieldLabel(field)}</Text>
                  <View style={styles.changeComparison}>
                    <View style={styles.changeRow}>
                      <Text style={styles.changeLabel}>Current:</Text>
                      <Text style={styles.changeValue}>
                        {formatValue(approval.current_values[field])}
                      </Text>
                    </View>
                    <View style={styles.changeRow}>
                      <Text style={styles.changeLabel}>Requested:</Text>
                      <Text style={[styles.changeValue, styles.requestedValue]}>
                        {formatValue(approval.requested_values[field])}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.infoText}>
                This is an existing restaurant. All current details are shown above.
              </Text>
            )}
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timestamps</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{formatDateTime(approval.restaurant.created_at)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated:</Text>
            <Text style={styles.infoValue}>{formatDateTime(approval.restaurant.updated_at)}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={handleReject}
          >
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={handleApprove}
          >
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          Keyboard.dismiss();
          setRejectModalVisible(false);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Reject {approval.is_new ? 'Restaurant' : 'Changes'}</Text>
                <Text style={styles.modalSubtitle}>
                  Please provide a reason for rejection:
                </Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Enter rejection reason..."
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  placeholderTextColor="#999"
                  returnKeyType="done"
                  blurOnSubmit={true}
                  returnKeyType="done"
                  blurOnSubmit={true}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setRejectModalVisible(false);
                      setRejectionReason('');
                    }}
                    disabled={submitting}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.confirmRejectButton, !rejectionReason.trim() && styles.disabledButton]}
                    onPress={confirmReject}
                    disabled={submitting || !rejectionReason.trim()}
                  >
                    <Text style={styles.modalButtonText}>
                      {submitting ? 'Rejecting...' : 'Reject'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  statusSection: {
    backgroundColor: '#fff',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newBadge: {
    backgroundColor: '#2196F3',
  },
  editBadge: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 140,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  changedValue: {
    backgroundColor: '#FFF3E0',
    padding: 4,
    borderRadius: 4,
    fontWeight: '600',
    color: '#E65100',
  },
  changeCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  changeFieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  changeComparison: {
    gap: 8,
  },
  changeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  changeLabel: {
    fontSize: 13,
    color: '#666',
    width: 100,
  },
  changeValue: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  requestedValue: {
    color: '#E65100',
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
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
    padding: 24,
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
  disabledButton: {
    backgroundColor: '#ccc',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

