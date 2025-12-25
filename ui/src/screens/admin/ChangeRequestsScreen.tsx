import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { adminService } from '../../services';
import { ChangeRequest } from '../../../shared/api-contracts';

export const ChangeRequestsScreen: React.FC = () => {
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadChangeRequests();
  }, []);

  const loadChangeRequests = async () => {
    try {
      const requests = await adminService.getChangeRequests();
      const pending = requests.filter((r) => r.status === 'PENDING');
      setChangeRequests(pending);
    } catch (error) {
      Alert.alert('Error', 'Failed to load change requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      await adminService.approveChangeRequest(requestId);
      Alert.alert('Success', 'Change request approved');
      loadChangeRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to approve change request');
    }
  };

  const handleReject = async (requestId: string) => {
    Alert.alert(
      'Reject Change Request',
      'Are you sure you want to reject this change request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.rejectChangeRequest(requestId);
              Alert.alert('Success', 'Change request rejected');
              loadChangeRequests();
            } catch (error) {
              Alert.alert('Error', 'Failed to reject change request');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadChangeRequests();
  };

  const renderRequestedFields = (fields: Record<string, any>) => {
    return Object.entries(fields).map(([key, value]) => (
      <View key={key} style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{key.replace('_', ' ').toUpperCase()}:</Text>
        <Text style={styles.fieldValue}>{String(value)}</Text>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={changeRequests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.requestCard}>
            <Text style={styles.requestId}>Request #{item.id.slice(0, 8)}</Text>
            <Text style={styles.restaurantId}>Restaurant: {item.restaurant_id.slice(0, 8)}</Text>
            
            <View style={styles.fieldsContainer}>
              <Text style={styles.fieldsTitle}>Requested Changes:</Text>
              {renderRequestedFields(item.requested_fields)}
            </View>

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
              <Text style={styles.emptyText}>No pending change requests</Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  requestCard: {
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
  requestId: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  restaurantId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  fieldsContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  fieldsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    width: 120,
  },
  fieldValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
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
});

