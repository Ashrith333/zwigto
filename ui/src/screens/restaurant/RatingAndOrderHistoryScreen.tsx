import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { orderService, restaurantService, reviewService } from '../../services';
import { Order, OrderStatus, Review, RestaurantRating } from '../../../shared/api-contracts';

export const RatingAndOrderHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [rating, setRating] = useState<RestaurantRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, Review>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const restaurant = await restaurantService.getMyRestaurant();
      setRestaurantId(restaurant.id);
      
      const [ordersData, ratingData, reviewsData] = await Promise.all([
        orderService.getRestaurantOrders(),
        reviewService.getRestaurantRating(restaurant.id),
        reviewService.getRestaurantReviews(restaurant.id),
      ]);
      
      // Sort orders by created_at descending (newest first)
      const sortedOrders = ordersData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setOrders(sortedOrders);
      setRating(ratingData);
      
      // Create a map of order_id -> review for quick lookup
      const reviewsMap: Record<string, Review> = {};
      reviewsData.forEach(review => {
        reviewsMap[review.order_id] = review;
      });
      setReviews(reviewsMap);
    } catch (error) {
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PICKED_UP:
        return '#34C759';
      case OrderStatus.CANCELLED:
        return '#FF3B30';
      case OrderStatus.READY:
        return '#FF9500';
      case OrderStatus.PREPARING:
        return '#9C27B0';
      case OrderStatus.CONFIRMED:
        return '#2196F3';
      default:
        return '#666';
    }
  };

  const renderStars = (ratingValue: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Text key={i} style={styles.star}>
          {i <= ratingValue ? '⭐' : '☆'}
        </Text>
      );
    }
    return <View style={styles.starsRow}>{stars}</View>;
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
      {/* Overall Rating Header */}
      {rating && (
        <View style={styles.ratingHeader}>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingNumber}>{rating.average_rating.toFixed(1)}</Text>
            <View style={styles.starsRow}>
              {renderStars(Math.round(rating.average_rating))}
            </View>
            <Text style={styles.totalReviews}>
              {rating.total_reviews} review{rating.total_reviews !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Orders List */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => {
          const review = reviews[item.id];
          return (
            <TouchableOpacity
              style={styles.orderCard}
              onPress={() => {
                (navigation as any).navigate('RestaurantOrderDetail', { orderId: item.id });
              }}
            >
              <View style={styles.orderHeader}>
                <View style={styles.orderIdContainer}>
                  <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
                  {review && (
                    <View style={styles.ratingBadge}>
                      {renderStars(review.rating)}
                    </View>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              
              <View style={styles.orderDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount:</Text>
                  <Text style={styles.detailValue}>₹{item.total_amount.toFixed(2)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Ordered:</Text>
                  <Text style={styles.detailValue}>{formatDateTime(item.created_at)}</Text>
                </View>
                {item.pickup_time && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Picked:</Text>
                    <Text style={styles.detailValue}>{formatDateTime(item.pickup_time)}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No orders yet</Text>
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
  ratingHeader: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  ratingCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  star: {
    fontSize: 20,
    marginHorizontal: 2,
  },
  totalReviews: {
    fontSize: 14,
    color: '#666',
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderIdContainer: {
    flex: 1,
  },
  orderId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
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

