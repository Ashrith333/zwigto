import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reviewService, restaurantService, orderService } from '../../services';
import { Review, RestaurantRating, Order } from '../../../shared/api-contracts';
import { theme } from '../../theme/theme';
import { getOrderIdDisplay } from '../../utils/orderId';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);

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
      setFilteredReviews(reviewsData);
      
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
        <Ionicons
          key={i}
          name={i <= ratingValue ? 'star' : 'star-outline'}
          size={16}
          color={i <= ratingValue ? '#FFB800' : theme.colors.border}
          style={styles.starIcon}
        />
      );
    }
    return <View style={styles.starsRow}>{stars}</View>;
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredReviews(reviews);
      return;
    }
    
    const lowerQuery = text.toLowerCase().trim();
    const filtered = reviews.filter(review => {
      const orderId = getOrderIdDisplay(review.order_id).toLowerCase();
      return orderId.includes(lowerQuery);
    });
    setFilteredReviews(filtered);
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
            {renderStars(Math.round(rating.average_rating))}
            <Text style={styles.totalReviews}>{rating.total_reviews} review{rating.total_reviews !== 1 ? 's' : ''}</Text>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Order ID"
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearchChange('')}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredReviews}
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
                <View style={styles.orderInfoHeader}>
                  <Ionicons name="receipt-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.orderInfoLabel}>Order Details</Text>
                </View>
                <View style={styles.orderInfoRow}>
                  <Text style={styles.orderInfoText}>Order ID: #{getOrderIdDisplay(item.order_id)}</Text>
                {order && (
                  <>
                    <View style={styles.orderInfoRow}>
                      <Ionicons name="cash-outline" size={14} color={theme.colors.textSecondary} />
                      <Text style={styles.orderInfoText}>₹{order.total_amount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.orderInfoRow}>
                      <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
                      <Text style={styles.orderInfoText}>
                        {new Date(order.created_at).toLocaleDateString('en-IN', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </Text>
                    </View>
                    {order.items && order.items.length > 0 && (
                      <View style={styles.orderInfoRow}>
                        <Ionicons name="list-outline" size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.orderInfoText}>
                          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
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
    backgroundColor: theme.colors.background,
  },
  ratingHeader: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    ...theme.shadows.md,
  },
  ratingCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.success + '15',
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
  },
  ratingNumber: {
    ...theme.typography.h1,
    fontSize: 56,
    fontWeight: '700',
    color: theme.colors.success,
    marginBottom: theme.spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
    gap: 4,
  },
  starIcon: {
    marginHorizontal: 2,
  },
  totalReviews: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  reviewDate: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  reviewComment: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  reviewOrderId: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  orderInfo: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  orderInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  orderInfoLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    fontSize: 13,
  },
  orderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  orderInfoText: {
    ...theme.typography.small,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  feedbackSection: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  feedbackLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    fontSize: 13,
    marginBottom: theme.spacing.xs,
  },
  replySection: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.success + '15',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
  },
  replyLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.success,
    fontSize: 12,
    marginBottom: theme.spacing.xs,
  },
  replyText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    fontSize: 13,
  },
  replyButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  replyButtonText: {
    color: theme.colors.textInverse,
    ...theme.typography.captionBold,
    fontSize: 14,
  },
  editReplyButton: {
    backgroundColor: theme.colors.warning,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    alignSelf: 'flex-start',
    ...theme.shadows.sm,
  },
  editReplyButtonText: {
    color: theme.colors.textInverse,
    ...theme.typography.captionBold,
    fontSize: 12,
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
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
    ...theme.shadows.lg,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  modalReviewInfo: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  modalReviewText: {
    ...theme.typography.body,
    marginBottom: theme.spacing.xs,
  },
  modalReviewComment: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  replyInputLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    fontSize: 14,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.md,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.background,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  cancelButton: {
    backgroundColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    ...theme.typography.captionBold,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
  submitButtonText: {
    color: theme.colors.textInverse,
    ...theme.typography.captionBold,
  },
});

