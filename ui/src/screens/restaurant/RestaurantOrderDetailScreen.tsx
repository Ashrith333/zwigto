import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { orderService, reviewService, restaurantService } from '../../services';
import { Order, OrderStatus, Review } from '../../../shared/api-contracts';

export const RestaurantOrderDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { orderId } = route.params as { orderId: string };
  
  const [order, setOrder] = useState<Order | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [orderId]);

  const loadData = async () => {
    try {
      const restaurant = await restaurantService.getMyRestaurant();
      setRestaurantId(restaurant.id);
      
      const orderData = await orderService.getOrder(orderId);
      setOrder(orderData);
      
      // Load review if order is picked up
      if (orderData.status === OrderStatus.PICKED_UP) {
        if (orderData.review) {
          // Review is already in order data, try to get full details
          try {
            const reviewData = await reviewService.getReview(orderData.review.id);
            setReview(reviewData);
          } catch (error) {
            // If getReview fails, construct from order.review
            setReview({
              id: orderData.review.id,
              order_id: orderId,
              user_id: orderData.user_id,
              restaurant_id: orderData.restaurant_id,
              rating: orderData.review.rating,
              comment: orderData.review.comment,
              restaurant_reply: orderData.review.restaurant_reply,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as Review);
          }
        } else {
          // Check if review exists but wasn't loaded with order
          try {
            const reviews = await reviewService.getRestaurantReviews(restaurant.id);
            const orderReview = reviews.find(r => r.order_id === orderId);
            if (orderReview) {
              setReview(orderReview);
            }
          } catch (error) {
            console.warn('Failed to load review:', error);
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleReply = () => {
    if (review) {
      setReplyText(review.restaurant_reply || '');
      setReplyModalVisible(true);
    }
  };

  const handleSubmitReply = async () => {
    if (!review || !replyText.trim()) {
      Alert.alert('Error', 'Please enter a reply');
      return;
    }

    setSubmitting(true);
    try {
      await reviewService.replyToReview(review.id, { reply: replyText.trim() });
      Alert.alert('Success', 'Reply submitted successfully');
      setReplyModalVisible(false);
      loadData(); // Reload to show the reply
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to submit reply');
    } finally {
      setSubmitting(false);
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

  const getStatusTimeline = () => {
    if (!order) return [];
    
    const timeline = [];
    
    // PENDING - created_at
    timeline.push({
      status: OrderStatus.PENDING,
      label: 'Order Placed',
      time: order.created_at,
      completed: true,
    });
    
    // CONFIRMED - if status is CONFIRMED or later
    if ([OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.PICKED_UP].includes(order.status)) {
      timeline.push({
        status: OrderStatus.CONFIRMED,
        label: 'Order Confirmed',
        time: order.updated_at, // Approximate - we don't have exact timestamp
        completed: true,
      });
    }
    
    // PREPARING - if status is PREPARING or later
    if ([OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.PICKED_UP].includes(order.status)) {
      timeline.push({
        status: OrderStatus.PREPARING,
        label: 'Preparing',
        time: order.updated_at, // Approximate
        completed: true,
      });
    }
    
    // READY - if status is READY or later
    if ([OrderStatus.READY, OrderStatus.PICKED_UP].includes(order.status)) {
      timeline.push({
        status: OrderStatus.READY,
        label: 'Ready for Pickup',
        time: order.updated_at, // Approximate
        completed: true,
      });
    }
    
    // PICKED_UP - if status is PICKED_UP
    if (order.status === OrderStatus.PICKED_UP && order.pickup_time) {
      timeline.push({
        status: OrderStatus.PICKED_UP,
        label: 'Picked Up',
        time: order.pickup_time,
        completed: true,
      });
    }
    
    return timeline;
  };

  if (loading || !order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  const timeline = getStatusTimeline();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Order Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID:</Text>
            <Text style={styles.infoValue}>#{order.id.slice(0, 8)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Amount:</Text>
            <Text style={styles.infoValue}>₹{order.total_amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Status Timeline */}
        {timeline.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Timeline</Text>
            {timeline.map((item, index) => (
              <View key={item.status} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>{item.label}</Text>
                  <Text style={styles.timelineTime}>{formatDateTime(item.time)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Order Items */}
        {order.items && order.items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            {order.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.menu_item_name || 'Item'}</Text>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Review Section */}
        {order.status === OrderStatus.PICKED_UP && review && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Review</Text>
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                {renderStars(review.rating)}
                <Text style={styles.reviewDate}>
                  {formatDateTime(review.created_at)}
                </Text>
              </View>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
              
              {/* Restaurant Reply */}
              {review.restaurant_reply ? (
                <View style={styles.replySection}>
                  <Text style={styles.replyLabel}>Your Reply:</Text>
                  <Text style={styles.replyText}>{review.restaurant_reply}</Text>
                  <Text style={styles.replyNote}>Reply cannot be edited</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.replyButton}
                  onPress={handleReply}
                >
                  <Text style={styles.replyButtonText}>Reply to Review</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

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
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Reply to Review</Text>
                {review && (
                  <>
                    <View style={styles.modalReviewInfo}>
                      <Text style={styles.modalReviewText}>
                        Rating: {renderStars(review.rating)}
                      </Text>
                      {review.comment && (
                        <Text style={styles.modalReviewComment}>
                          "{review.comment}"
                        </Text>
                      )}
                    </View>
                    
                    <Text style={styles.replyInputLabel}>Your Reply:</Text>
                    <TextInput
                      style={styles.replyInput}
                      placeholder="Write your reply..."
                      value={replyText}
                      onChangeText={setReplyText}
                      returnKeyType="done"
                      blurOnSubmit={true}
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
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 12,
    color: '#666',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  reviewCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 20,
    marginHorizontal: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  replySection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  replyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 6,
  },
  replyText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 4,
  },
  replyNote: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  replyButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  replyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    padding: 12,
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

