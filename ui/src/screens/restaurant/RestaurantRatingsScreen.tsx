import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { reviewService, restaurantService, orderService } from '../../services';
import { Review, RestaurantRating, Order } from '../../../shared/api-contracts';

export const RestaurantRatingsScreen: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState<RestaurantRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderDetails, setOrderDetails] = useState<Record<string, Order>>({});

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
      
      // Load order details for each review
      const orderDetailsMap: Record<string, Order> = {};
      for (const review of reviewsData) {
        try {
          const order = await orderService.getOrder(review.order_id);
          orderDetailsMap[review.order_id] = order;
        } catch (error) {
          console.warn(`Failed to load order ${review.order_id}:`, error);
        }
      }
      setOrderDetails(orderDetailsMap);
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

  const handleReply = (review: Review) => {
    setSelectedReview(review);
    setReplyText(review.restaurant_reply || '');
    setReplyModalVisible(true);
  };

  const handleSubmitReply = async () => {
    if (!selectedReview || !replyText.trim()) {
      Alert.alert('Error', 'Please enter a reply');
      return;
    }

    setSubmitting(true);
    try {
      await reviewService.replyToReview(selectedReview.id, { reply: replyText.trim() });
      Alert.alert('Success', 'Reply submitted successfully');
      setReplyModalVisible(false);
      loadData(); // Reload to show the reply
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to submit reply');
    } finally {
      setSubmitting(false);
    }
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
        renderItem={({ item }) => {
          const order = orderDetails[item.order_id];
          return (
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.starsRow}>
                  {renderStars(item.rating)}
                </View>
                <Text style={styles.reviewDate}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              
              {/* Order Details */}
              <View style={styles.orderInfo}>
                <Text style={styles.orderInfoLabel}>Order Details:</Text>
                <Text style={styles.orderInfoText}>Order ID: #{item.order_id.slice(0, 8)}</Text>
                {order && (
                  <>
                    <Text style={styles.orderInfoText}>Amount: ₹{order.total_amount.toFixed(2)}</Text>
                    <Text style={styles.orderInfoText}>
                      Date: {new Date(order.created_at).toLocaleDateString()}
                    </Text>
                    {order.items && order.items.length > 0 && (
                      <Text style={styles.orderInfoText}>
                        Items: {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </>
                )}
              </View>
              
              {/* Customer Feedback */}
              {item.comment && (
                <View style={styles.feedbackSection}>
                  <Text style={styles.feedbackLabel}>Customer Feedback:</Text>
                  <Text style={styles.reviewComment}>{item.comment}</Text>
                </View>
              )}
              
              {/* Restaurant Reply */}
              {item.restaurant_reply ? (
                <View style={styles.replySection}>
                  <Text style={styles.replyLabel}>Your Reply:</Text>
                  <Text style={styles.replyText}>{item.restaurant_reply}</Text>
                  <TouchableOpacity
                    style={styles.editReplyButton}
                    onPress={() => handleReply(item)}
                  >
                    <Text style={styles.editReplyButtonText}>Edit Reply</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.replyButton}
                  onPress={() => handleReply(item)}
                >
                  <Text style={styles.replyButtonText}>Reply to Review</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
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
      
      {/* Reply Modal */}
      <Modal
        visible={replyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          Keyboard.dismiss();
          setReplyModalVisible(false);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={() => {}}>
              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Reply to Review</Text>
                  {selectedReview && (
                    <>
                      <View style={styles.modalReviewInfo}>
                        <Text style={styles.modalReviewText}>
                          Rating: {renderStars(selectedReview.rating)}
                        </Text>
                        {selectedReview.comment && (
                          <Text style={styles.modalReviewComment}>
                            "{selectedReview.comment}"
                          </Text>
                        )}
                      </View>
                      
                      <Text style={styles.replyInputLabel}>Your Reply:</Text>
                      <TextInput
                        style={styles.replyInput}
                        multiline
                        numberOfLines={4}
                        placeholder="Write your reply..."
                        value={replyText}
                        onChangeText={setReplyText}
                        returnKeyType="done"
                        blurOnSubmit={true}
                      />
                      
                      <View style={styles.modalButtons}>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.cancelButton]}
                          onPress={() => {
                            Keyboard.dismiss();
                            setReplyModalVisible(false);
                          }}
                          disabled={submitting}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.submitButton, !replyText.trim() && styles.submitButtonDisabled]}
                          onPress={handleSubmitReply}
                          disabled={submitting || !replyText.trim()}
                        >
                          <Text style={styles.submitButtonText}>
                            {submitting ? 'Submitting...' : 'Submit'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </ScrollView>
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
  orderInfo: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
  },
  orderInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  orderInfoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  feedbackSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  feedbackLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  replySection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 5,
  },
  replyText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  replyButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  replyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editReplyButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  editReplyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalReviewInfo: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  modalReviewText: {
    fontSize: 14,
    marginBottom: 5,
  },
  modalReviewComment: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  replyInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2196F3',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

