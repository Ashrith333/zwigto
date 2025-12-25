import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { reviewService, restaurantService } from '../../services';
import { Review, RestaurantRating } from '../../../shared/api-contracts';

export const RestaurantRatingsScreen: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<RestaurantRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const restaurant = await restaurantService.getMyRestaurant();
      setRestaurantId(restaurant.id);
      
      const [reviewsData, ratingData] = await Promise.all([
        reviewService.getRestaurantReviews(restaurant.id),
        reviewService.getRestaurantRating(restaurant.id),
      ]);
      
      setReviews(reviewsData);
      setRating(ratingData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load ratings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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
    return stars;
  };

  return (
    <View style={styles.container}>
      {rating && (
        <View style={styles.ratingHeader}>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingNumber}>{rating.average_rating.toFixed(1)}</Text>
            <View style={styles.starsRow}>
              {renderStars(Math.round(rating.average_rating))}
            </View>
            <Text style={styles.totalReviews}>{rating.total_reviews} review{rating.total_reviews !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <View style={styles.starsRow}>
                {renderStars(item.rating)}
              </View>
              <Text style={styles.reviewDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            {item.comment && (
              <Text style={styles.reviewComment}>{item.comment}</Text>
            )}
            <Text style={styles.reviewOrderId}>Order: #{item.order_id.slice(0, 8)}</Text>
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No reviews yet</Text>
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
  reviewCard: {
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
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  reviewOrderId: {
    fontSize: 12,
    color: '#999',
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

