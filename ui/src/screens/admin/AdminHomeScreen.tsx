import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { adminService, restaurantService, orderService } from '../../services';

export const AdminHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    activeRestaurants: 0,
    pausedRestaurants: 0,
    pendingApprovals: 0,
    activeOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [allRestaurants, pendingRestaurants, allOrders] = await Promise.all([
        restaurantService.listRestaurants(), // ACTIVE restaurants only
        adminService.getPendingRestaurants(), // PENDING restaurants
        adminService.getAllOrders(), // All orders for admin
      ]);

      const activeRestaurants = allRestaurants.length;
      const pendingCount = pendingRestaurants.length;

      setStats({
        totalRestaurants: activeRestaurants + pendingCount,
        activeRestaurants,
        pausedRestaurants: 0, // TODO: Add paused restaurants endpoint if needed
        pendingApprovals: pendingCount,
        activeOrders: allOrders.filter((o) => 
          o.status !== 'PICKED_UP' && o.status !== 'CANCELLED'
        ).length,
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      Alert.alert('Error', 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantApprovals = () => {
    (navigation as any).navigate('RestaurantApprovals');
  };

  const handleChangeRequests = () => {
    (navigation as any).navigate('ChangeRequests');
  };

  const handleOrderOversight = () => {
    (navigation as any).navigate('OrderOversight');
  };

  const handlePayments = () => {
    (navigation as any).navigate('PaymentManagement');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalRestaurants}</Text>
          <Text style={styles.statLabel}>Total Restaurants</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.activeRestaurants}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pausedRestaurants}</Text>
          <Text style={styles.statLabel}>Paused</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pendingApprovals}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, stats.pendingApprovals > 0 && styles.actionButtonHighlight]}
          onPress={handleRestaurantApprovals}
        >
          <Text style={styles.actionButtonText}>Restaurant Approvals</Text>
          <Text style={styles.actionButtonSubtext}>
            {stats.pendingApprovals} pending approval{stats.pendingApprovals !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleChangeRequests}>
          <Text style={styles.actionButtonText}>Change Requests</Text>
          <Text style={styles.actionButtonSubtext}>Review restaurant change requests</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleOrderOversight}>
          <Text style={styles.actionButtonText}>Order Oversight</Text>
          <Text style={styles.actionButtonSubtext}>
            {stats.activeOrders} active order{stats.activeOrders !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handlePayments}>
          <Text style={styles.actionButtonText}>Payment Management</Text>
          <Text style={styles.actionButtonSubtext}>View payments and settlements</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonHighlight: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 14,
    color: '#666',
  },
});

