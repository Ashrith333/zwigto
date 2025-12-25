import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { adminService } from '../../services';
import { Payment } from '../../../shared/api-contracts';

export const PaymentManagementScreen: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const allPayments = await adminService.getAllPayments();
      setPayments(allPayments);
    } catch (error) {
      Alert.alert('Error', 'Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CAPTURED':
        return '#34C759';
      case 'FAILED':
        return '#FF3B30';
      case 'REFUNDED':
        return '#FF9500';
      default:
        return '#666';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {payments.filter((p) => p.status === 'CAPTURED').length}
          </Text>
          <Text style={styles.statLabel}>Successful</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {payments.filter((p) => p.status === 'FAILED').length}
          </Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {payments.filter((p) => p.status === 'REFUNDED').length}
          </Text>
          <Text style={styles.statLabel}>Refunded</Text>
        </View>
      </View>

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentId}>Payment #{item.id.slice(0, 8)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            
            {item.metadata?.order_id && (
              <Text style={styles.paymentDetails}>Order: {item.metadata.order_id.slice(0, 8)}</Text>
            )}
            <Text style={styles.paymentAmount}>₹{item.amount.toFixed(2)}</Text>
            <Text style={styles.paymentDate}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
            {item.razorpay_payment_id && (
              <Text style={styles.razorpayId}>Razorpay: {item.razorpay_payment_id}</Text>
            )}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No payments found</Text>
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
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  paymentCard: {
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
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentDetails: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 8,
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  razorpayId: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
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

