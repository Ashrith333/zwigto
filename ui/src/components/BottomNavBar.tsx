import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface BottomNavBarProps {
  currentScreen: 'Home' | 'Profile';
  homeRoute?: 'UserHome' | 'RestaurantHome' | 'AdminHome';
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ 
  currentScreen, 
  homeRoute = 'UserHome' 
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 4) }]}>
        <TouchableOpacity
          style={[styles.navItem, styles.navItemHome, currentScreen === 'Home' && styles.navItemActive]}
          onPress={() => (navigation as any).navigate(homeRoute)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, currentScreen === 'Home' && styles.iconContainerActive]}>
            <Ionicons 
              name={currentScreen === 'Home' ? 'home' : 'home-outline'} 
              size={20} 
              color={currentScreen === 'Home' ? '#007AFF' : '#666'} 
            />
          </View>
          <Text style={[styles.navLabel, currentScreen === 'Home' && styles.navLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, styles.navItemProfile, currentScreen === 'Profile' && styles.navItemActive]}
          onPress={() => (navigation as any).navigate('Profile')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, currentScreen === 'Profile' && styles.iconContainerActive]}>
            <Ionicons 
              name={currentScreen === 'Profile' ? 'person' : 'person-outline'} 
              size={20} 
              color={currentScreen === 'Profile' ? '#007AFF' : '#666'} 
            />
          </View>
          <Text style={[styles.navLabel, currentScreen === 'Profile' && styles.navLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    width: '100%',
    paddingTop: 15,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    minHeight: 85,
    flex: 1,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
    minHeight: 85,
    position: 'absolute',
  },
  navItemHome: {
    left: '20%',
    paddingTop: 2,
  },
  navItemProfile: {
    right: '20%',
    paddingTop: 2,
  },
  navItemActive: {
    // Active state handled by icon and label
  },
  iconContainer: {
    marginBottom: 3,
    padding: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: '#E3F2FD',
  },
  navLabel: {
    fontSize: 9,
    color: '#666',
    fontWeight: '500',
    marginTop: 1,
  },
  navLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

