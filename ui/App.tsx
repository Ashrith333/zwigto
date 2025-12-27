import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { UnifiedAuthScreen } from './src/screens/auth/UnifiedAuthScreen';
import { RoleSelectionScreen } from './src/screens/common/RoleSelectionScreen';
import { ProfileScreen } from './src/screens/common/ProfileScreen';
import { UserHomeScreen } from './src/screens/user/UserHomeScreen';
import { RouteSearchScreen } from './src/screens/user/RouteSearchScreen';
import { OrderHistoryScreen } from './src/screens/user/OrderHistoryScreen';
import { RestaurantHomeScreen } from './src/screens/restaurant/RestaurantHomeScreen';
import { RestaurantFormScreen } from './src/screens/restaurant/RestaurantFormScreen';
import { MapPickerScreen } from './src/screens/restaurant/MapPickerScreen';
import { OrderManagementScreen } from './src/screens/restaurant/OrderManagementScreen';
import { MenuManagementScreen } from './src/screens/restaurant/MenuManagementScreen';
import { RestaurantProfileScreen } from './src/screens/restaurant/RestaurantProfileScreen';
import { PaymentDetailsScreen } from './src/screens/restaurant/PaymentDetailsScreen';
import { RatingAndOrderHistoryScreen } from './src/screens/restaurant/RatingAndOrderHistoryScreen';
import { RestaurantOrderDetailScreen } from './src/screens/restaurant/RestaurantOrderDetailScreen';
import { RestaurantMenuScreen } from './src/screens/user/RestaurantMenuScreen';
import { CheckoutScreen } from './src/screens/user/CheckoutScreen';
import { OrderTrackingScreen } from './src/screens/user/OrderTrackingScreen';
import { AdminHomeScreen } from './src/screens/admin/AdminHomeScreen';
import { RestaurantApprovalsScreen } from './src/screens/admin/RestaurantApprovalsScreen';
import { RestaurantApprovalDetailScreen } from './src/screens/admin/RestaurantApprovalDetailScreen';
import { ChangeRequestsScreen } from './src/screens/admin/ChangeRequestsScreen';
import { OrderOversightScreen } from './src/screens/admin/OrderOversightScreen';
import { PaymentManagementScreen } from './src/screens/admin/PaymentManagementScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="UnifiedAuth">
        <Stack.Screen 
          name="UnifiedAuth" 
          component={UnifiedAuthScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="RoleSelection" 
          component={RoleSelectionScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{ title: 'Profile' }}
        />
        <Stack.Screen 
          name="UserHome" 
          component={UserHomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="RouteSearch" 
          component={RouteSearchScreen}
          options={{ title: 'Pick on Route' }}
        />
        <Stack.Screen 
          name="OrderHistory" 
          component={OrderHistoryScreen}
          options={{ title: 'Order History' }}
        />
        <Stack.Screen 
          name="RestaurantHome" 
          component={RestaurantHomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="RestaurantForm" 
          component={RestaurantFormScreen}
          options={{ title: 'Restaurant Details' }}
        />
        <Stack.Screen 
          name="MapPicker" 
          component={MapPickerScreen}
          options={{ title: 'Pick Location' }}
        />
        <Stack.Screen 
          name="OrderManagement" 
          component={OrderManagementScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="MenuManagement" 
          component={MenuManagementScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="RestaurantProfile" 
          component={RestaurantProfileScreen}
          options={{ title: 'Restaurant Profile' }}
        />
        <Stack.Screen 
          name="PaymentDetails" 
          component={PaymentDetailsScreen}
          options={{ title: 'Payment Details' }}
        />
        <Stack.Screen 
          name="RatingAndOrderHistory" 
          component={RatingAndOrderHistoryScreen}
          options={{ title: 'Rating and Order History' }}
        />
        <Stack.Screen 
          name="RestaurantOrderDetail" 
          component={RestaurantOrderDetailScreen}
          options={{ title: 'Order Details' }}
        />
        <Stack.Screen 
          name="RestaurantMenu" 
          component={RestaurantMenuScreen}
          options={{ title: 'Menu' }}
        />
        <Stack.Screen 
          name="Checkout" 
          component={CheckoutScreen}
          options={{ title: 'Checkout' }}
        />
        <Stack.Screen 
          name="OrderTracking" 
          component={OrderTrackingScreen}
          options={{ title: 'Track Order' }}
        />
        <Stack.Screen 
          name="AdminHome" 
          component={AdminHomeScreen}
          options={{ title: 'Admin Dashboard' }}
        />
        <Stack.Screen 
          name="RestaurantApprovals" 
          component={RestaurantApprovalsScreen}
          options={{ title: 'Restaurant Approvals' }}
        />
        <Stack.Screen 
          name="RestaurantApprovalDetail" 
          component={RestaurantApprovalDetailScreen}
          options={{ title: 'Approval Details' }}
        />
        <Stack.Screen 
          name="ChangeRequests" 
          component={ChangeRequestsScreen}
          options={{ title: 'Change Requests' }}
        />
        <Stack.Screen 
          name="OrderOversight" 
          component={OrderOversightScreen}
          options={{ title: 'Order Oversight' }}
        />
        <Stack.Screen 
          name="PaymentManagement" 
          component={PaymentManagementScreen}
          options={{ title: 'Payment Management' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

