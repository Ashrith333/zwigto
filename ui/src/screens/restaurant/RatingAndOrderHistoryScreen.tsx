import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { orderService, restaurantService, reviewService } from '../../services';
import { Order, OrderStatus, Review, RestaurantRating } from '../../../shared/api-contracts';
import { getOrderIdDisplay } from '../../utils/orderId';
import { theme } from '../../theme/theme';

export const RatingAndOrderHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [rating, setRating] = useState<RestaurantRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'time'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterPendingReply, setFilterPendingReply] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortButtonLayout, setSortButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [filterButtonLayout, setFilterButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const sortButtonRef = React.useRef<any>(null);
  const filterButtonRef = React.useRef<any>(null);

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
      
      setAllOrders(ordersData);
      setRating(ratingData);
      
      // Create a map of order_id -> review for quick lookup
      const reviewsMap: Record<string, Review> = {};
      reviewsData.forEach(review => {
        reviewsMap[review.order_id] = review;
      });
      setReviews(reviewsMap);
      
      // Apply filters and sorting
      applyFiltersAndSort(ordersData, reviewsMap, searchQuery, sortBy, sortOrder, filterPendingReply);
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

  const applyFiltersAndSort = (
    ordersToFilter: Order[],
    reviewsMap: Record<string, Review>,
    query: string,
    sort: 'rating' | 'time',
    order: 'asc' | 'desc',
    pendingOnly: boolean
  ) => {
    let filtered = ordersToFilter;

    // Filter by search query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase().trim();
      filtered = filtered.filter(order => {
        const orderId = getOrderIdDisplay(order.id).toLowerCase();
        return orderId.includes(lowerQuery);
      });
    }

    // Filter by pending reply (only show orders with reviews that don't have restaurant_reply)
    if (pendingOnly) {
      filtered = filtered.filter(order => {
        const review = reviewsMap[order.id];
        return review && !review.restaurant_reply;
      });
    }

    // Sort orders
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sort === 'rating') {
        const aReview = reviewsMap[a.id];
        const bReview = reviewsMap[b.id];
        const aRating = aReview?.rating || 0;
        const bRating = bReview?.rating || 0;
        comparison = aRating - bRating;
      } else {
        // Sort by time
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      
      return order === 'asc' ? comparison : -comparison;
    });

    setOrders(filtered);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    applyFiltersAndSort(allOrders, reviews, text, sortBy, sortOrder, filterPendingReply);
  };

  const handleSortChange = (sort: 'rating' | 'time', order: 'asc' | 'desc') => {
    setSortBy(sort);
    setSortOrder(order);
    applyFiltersAndSort(allOrders, reviews, searchQuery, sort, order, filterPendingReply);
    setShowSortDropdown(false);
  };

  const handleFilterToggle = (pendingOnly: boolean) => {
    setFilterPendingReply(pendingOnly);
    applyFiltersAndSort(allOrders, reviews, searchQuery, sortBy, sortOrder, pendingOnly);
    setShowFilterDropdown(false);
  };

  // Reapply filters when reviews change
  useEffect(() => {
    if (allOrders.length > 0 && Object.keys(reviews).length > 0) {
      applyFiltersAndSort(allOrders, reviews, searchQuery, sortBy, sortOrder, filterPendingReply);
    }
  }, [reviews]);

  return (
    <View style={styles.container}>
      {/* Overall Rating Header */}
      {rating && (
        <View style={styles.ratingHeader}>
          <View style={styles.ratingCard}>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingNumber}>{rating.average_rating.toFixed(1)}</Text>
                <Text style={styles.reviewCount}>({rating.total_reviews})</Text>
                <View style={styles.starsRow}>
                  {renderStars(Math.round(rating.average_rating))}
                </View>
              </View>
            </View>
          </View>
        )}

      <SafeAreaView style={styles.safeArea} edges={[]}>
        {/* Search and Filter Bar */}
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
          <TouchableOpacity
            ref={(ref) => {
              sortButtonRef.current = ref;
            }}
            onLayout={() => {
              setTimeout(() => {
                sortButtonRef.current?.measureInWindow((x, y, width, height) => {
                  setSortButtonLayout({ x, y, width, height });
                });
              }, 0);
            }}
            style={styles.filterButton}
            onPress={() => {
              sortButtonRef.current?.measureInWindow((x, y, width, height) => {
                setSortButtonLayout({ x, y, width, height });
                setShowSortDropdown(!showSortDropdown);
              });
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-vertical-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            ref={(ref) => {
              filterButtonRef.current = ref;
            }}
            onLayout={() => {
              setTimeout(() => {
                filterButtonRef.current?.measureInWindow((x, y, width, height) => {
                  setFilterButtonLayout({ x, y, width, height });
                });
              }, 0);
            }}
            style={[styles.filterButton, filterPendingReply && styles.filterButtonActive]}
            onPress={() => {
              filterButtonRef.current?.measureInWindow((x, y, width, height) => {
                setFilterButtonLayout({ x, y, width, height });
                setShowFilterDropdown(!showFilterDropdown);
              });
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="filter-outline" size={22} color={filterPendingReply ? theme.colors.primary : theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Orders List */}
      <FlatList
        contentContainerStyle={{ paddingBottom: 100 + Math.max(insets.bottom, 8) }}
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
                  <Text style={styles.orderId}>Order #{getOrderIdDisplay(item.id)}</Text>
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
              <Text style={styles.emptyText}>
                {searchQuery || filterPendingReply ? 'No orders found' : 'No orders yet'}
              </Text>
            </View>
          )
        }
      />

      {/* Sort Dropdown Modal */}
      {showSortDropdown && (
        <Modal
          visible={showSortDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSortDropdown(false)}
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowSortDropdown(false)}
          >
            <View
              style={[
                styles.dropdownList,
                {
                  position: 'absolute',
                  top: sortButtonLayout.y + sortButtonLayout.height + 4,
                  right: theme.spacing.md,
                  width: 200,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <Text style={styles.dropdownTitle}>Sort By</Text>
              <TouchableOpacity
                style={[styles.dropdownItem, sortBy === 'time' && styles.dropdownItemActive]}
                onPress={() => handleSortChange('time', sortBy === 'time' && sortOrder === 'desc' ? 'asc' : 'desc')}
              >
                <Ionicons 
                  name={sortBy === 'time' ? 'radio-button-on' : 'radio-button-off'} 
                  size={18} 
                  color={sortBy === 'time' ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[styles.dropdownItemText, sortBy === 'time' && styles.dropdownItemTextActive]}>
                  Time
                </Text>
                {sortBy === 'time' && (
                  <Ionicons 
                    name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                    size={16} 
                    color={theme.colors.primary} 
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dropdownItem, styles.dropdownItemLast, sortBy === 'rating' && styles.dropdownItemActive]}
                onPress={() => handleSortChange('rating', sortBy === 'rating' && sortOrder === 'desc' ? 'asc' : 'desc')}
              >
                <Ionicons 
                  name={sortBy === 'rating' ? 'radio-button-on' : 'radio-button-off'} 
                  size={18} 
                  color={sortBy === 'rating' ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[styles.dropdownItemText, sortBy === 'rating' && styles.dropdownItemTextActive]}>
                  Rating
                </Text>
                {sortBy === 'rating' && (
                  <Ionicons 
                    name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                    size={16} 
                    color={theme.colors.primary} 
                  />
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Filter Dropdown Modal */}
      {showFilterDropdown && (
        <Modal
          visible={showFilterDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFilterDropdown(false)}
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setShowFilterDropdown(false)}
          >
            <View
              style={[
                styles.dropdownList,
                {
                  position: 'absolute',
                  top: filterButtonLayout.y + filterButtonLayout.height + 4,
                  right: theme.spacing.md,
                  width: 200,
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <Text style={styles.dropdownTitle}>Filter</Text>
              <TouchableOpacity
                style={[styles.dropdownItem, !filterPendingReply && styles.dropdownItemActive]}
                onPress={() => handleFilterToggle(false)}
              >
                <Ionicons 
                  name={!filterPendingReply ? 'radio-button-on' : 'radio-button-off'} 
                  size={18} 
                  color={!filterPendingReply ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[styles.dropdownItemText, !filterPendingReply && styles.dropdownItemTextActive]}>
                  All Reviews
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dropdownItem, styles.dropdownItemLast, filterPendingReply && styles.dropdownItemActive]}
                onPress={() => handleFilterToggle(true)}
              >
                <Ionicons 
                  name={filterPendingReply ? 'radio-button-on' : 'radio-button-off'} 
                  size={18} 
                  color={filterPendingReply ? theme.colors.primary : theme.colors.textSecondary} 
                />
                <Text style={[styles.dropdownItemText, filterPendingReply && styles.dropdownItemTextActive]}>
                  Pending Reply
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    backgroundColor: theme.colors.surface,
  },
  ratingHeader: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingTop: 0,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    ...theme.shadows.md,
  },
  ratingCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.success + '15',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  ratingNumber: {
    ...theme.typography.h1,
    fontSize: 42,
    fontWeight: '700',
    color: theme.colors.success,
  },
  reviewCount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginLeft: theme.spacing.xs,
  },
  star: {
    fontSize: 18,
    marginHorizontal: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    gap: theme.spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
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
  filterButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    flexShrink: 0,
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary + '20',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.lg,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 10,
    paddingVertical: theme.spacing.xs,
  },
  dropdownTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    fontSize: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemActive: {
    backgroundColor: theme.colors.background,
  },
  dropdownItemText: {
    flex: 1,
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  dropdownItemTextActive: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  orderCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
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
    ...theme.typography.h3,
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.round,
    marginLeft: theme.spacing.sm,
  },
  statusText: {
    color: theme.colors.textInverse,
    ...theme.typography.smallBold,
    fontSize: 12,
  },
  orderDetails: {
    marginTop: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.body,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
});

