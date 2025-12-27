import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BottomNavBarProps {
  currentScreen: 'Home' | 'Profile';
  homeRoute?: 'UserHome' | 'RestaurantHome' | 'AdminHome';
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ 
  currentScreen, 
  homeRoute = 'UserHome' 
}) => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'Home' && styles.navItemActive]}
          onPress={() => (navigation as any).navigate(homeRoute)}
        >
          <Text style={[styles.navIcon, currentScreen === 'Home' && styles.navIconActive]}>
            🏠
          </Text>
          <Text style={[styles.navLabel, currentScreen === 'Home' && styles.navLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, currentScreen === 'Profile' && styles.navItemActive]}
          onPress={() => (navigation as any).navigate('Profile')}
        >
          <Text style={[styles.navIcon, currentScreen === 'Profile' && styles.navIconActive]}>
            👤
          </Text>
          <Text style={[styles.navLabel, currentScreen === 'Profile' && styles.navLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navItemActive: {
    // Active state styling
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  navIconActive: {
    // Active icon styling
  },
  navLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

