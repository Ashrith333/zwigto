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
      <View style={[styles.container, { marginBottom: Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'Home' && styles.navItemActive]}
          onPress={() => (navigation as any).navigate(homeRoute)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, currentScreen === 'Home' && styles.iconContainerActive]}>
            <Ionicons 
              name={currentScreen === 'Home' ? 'home' : 'home-outline'} 
              size={24} 
              color={currentScreen === 'Home' ? '#007AFF' : '#666'} 
            />
          </View>
          <Text style={[styles.navLabel, currentScreen === 'Home' && styles.navLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'Profile' && styles.navItemActive]}
          onPress={() => (navigation as any).navigate('Profile')}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, currentScreen === 'Profile' && styles.iconContainerActive]}>
            <Ionicons 
              name={currentScreen === 'Profile' ? 'person' : 'person-outline'} 
              size={24} 
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
    backgroundColor: 'transparent',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 24,
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    minHeight: 50,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minHeight: 50,
  },
  navItemActive: {
    // Active state handled by icon and label
  },
  iconContainer: {
    marginBottom: 4,
    padding: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: '#E3F2FD',
  },
  navLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

