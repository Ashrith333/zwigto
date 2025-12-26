import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { adminService } from '../../services';
import { PendingRestaurantWithChanges } from '../../../shared/api-contracts';

export const RestaurantApprovalsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [approvals, setApprovals] = useState<PendingRestaurantWithChanges[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      const data = await adminService.getPendingRestaurantsWithChanges();
      setApprovals(data);
    } catch (error) {
      console.error('Failed to load approvals:', error);
      Alert.alert('Error', 'Failed to load pending approvals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadApprovals();
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

  return (
    <View style={styles.container}>
      <FlatList
        data={approvals}
        keyExtractor={(item) => item.restaurant.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.approvalCard}
            onPress={() => {
              (navigation as any).navigate('RestaurantApprovalDetail', {
                approval: item,
              });
            }}
          >
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.restaurantName}>{item.restaurant.name}</Text>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      item.is_new ? styles.newBadge : styles.editBadge,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {item.is_new ? 'NEW' : 'EDIT'}
                    </Text>
                  </View>
                  {item.changed_fields.length > 0 && (
                    <Text style={styles.changesText}>
                      {item.changed_fields.length} change{item.changed_fields.length !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailLabel}>Address:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {item.restaurant.address}
              </Text>
            </View>

            {item.restaurant.phone && (
              <View style={styles.detailsRow}>
                <Text style={styles.detailLabel}>Phone:</Text>
                <Text style={styles.detailValue}>{item.restaurant.phone}</Text>
              </View>
            )}

            {item.restaurant.email && (
              <View style={styles.detailsRow}>
                <Text style={styles.detailLabel}>Email:</Text>
                <Text style={styles.detailValue}>{item.restaurant.email}</Text>
              </View>
            )}

            {item.changed_fields.length > 0 && (
              <View style={styles.changesPreview}>
                <Text style={styles.changesLabel}>Changes:</Text>
                {item.changed_fields.slice(0, 3).map((field) => (
                  <Text key={field} style={styles.changeItem}>
                    • {getFieldLabel(field)}
                  </Text>
                ))}
                {item.changed_fields.length > 3 && (
                  <Text style={styles.moreChanges}>
                    +{item.changed_fields.length - 3} more
                  </Text>
                )}
              </View>
            )}

            <Text style={styles.dateText}>
              Submitted: {formatDateTime(item.restaurant.created_at)}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pending approvals</Text>
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
  approvalCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newBadge: {
    backgroundColor: '#2196F3',
  },
  editBadge: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  changesText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  changesPreview: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  changesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 6,
  },
  changeItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  moreChanges: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
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
