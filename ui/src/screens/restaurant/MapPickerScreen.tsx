import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBRNB4Sb5cAlkDtlI6R0jT-lW9IgIcjaiA';

export const MapPickerScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { initialLat, initialLon } = (route.params as any) || {};
  const webViewRef = useRef<WebView>(null);
  
  const [latitude, setLatitude] = useState<number>(initialLat || 28.6139);
  const [longitude, setLongitude] = useState<number>(initialLon || 77.2090);
  const [address, setAddress] = useState<string>('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    reverseGeocode(latitude, longitude);
  }, []);

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        setGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = location.coords.latitude;
      const lon = location.coords.longitude;
      setLatitude(lat);
      setLongitude(lon);
      
      // Update map position
      if (webViewRef.current && mapLoaded) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'setPosition',
          latitude: lat,
          longitude: lon,
        }));
      }
      
      await reverseGeocode(lat, lon);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to get current location');
    } finally {
      setGettingLocation(false);
    }
  };

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (addresses.length > 0) {
        const addr = addresses[0];
        const addressParts = [
          addr.street,
          addr.name,
          addr.district,
          addr.city,
          addr.region,
          addr.postalCode,
        ].filter(Boolean);
        setAddress(addressParts.length > 0 ? addressParts.join(', ') : 'Address not available');
      }
    } catch (error) {
      console.warn('Failed to reverse geocode:', error);
      setAddress('Address not available');
    }
  };

  const handleConfirm = () => {
    // Get the previous screen name from navigation state
    const state = (navigation as any).getState();
    const routes = state?.routes || [];
    const previousRoute = routes[routes.length - 2];
    
    if (previousRoute) {
      (navigation as any).navigate(previousRoute.name, {
        selectedLatitude: latitude,
        selectedLongitude: longitude,
        selectedAddress: address,
      });
    } else {
      (navigation as any).navigate('RestaurantForm', {
        selectedLatitude: latitude,
        selectedLongitude: longitude,
        selectedAddress: address,
      });
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'positionChanged') {
        setLatitude(data.latitude);
        setLongitude(data.longitude);
        reverseGeocode(data.latitude, data.longitude);
      } else if (data.type === 'mapLoaded') {
        setMapLoaded(true);
      }
    } catch (error) {
      console.warn('Failed to parse WebView message:', error);
    }
  };

  const googleMapsHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { height: 100%; width: 100%; overflow: hidden; }
        #map { height: 100vh; width: 100%; }
        #error { 
          display: none;
          padding: 20px; 
          text-align: center; 
          color: #d32f2f; 
          background: #ffebee; 
          height: 100vh;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }
      </style>
    </head>
    <body>
      <div id="error">
        <p style="font-size: 16px; margin-bottom: 10px;">⚠️ Map failed to load</p>
        <p style="font-size: 12px; color: #666;">Please check your internet connection</p>
      </div>
      <div id="map"></div>
      <script>
        let map;
        let marker;
        let initialLat = ${latitude};
        let initialLon = ${longitude};
        let mapLoaded = false;

        function showError() {
          document.getElementById('error').style.display = 'flex';
          document.getElementById('map').style.display = 'none';
        }

        function initMap() {
          try {
            map = new google.maps.Map(document.getElementById('map'), {
              center: { lat: initialLat, lng: initialLon },
              zoom: 15,
              mapTypeControl: true,
              streetViewControl: true,
              fullscreenControl: true,
              gestureHandling: 'greedy'
            });

            marker = new google.maps.Marker({
              position: { lat: initialLat, lng: initialLon },
              map: map,
              draggable: true,
              title: 'Restaurant Location'
            });

            // Update position when marker is dragged
            marker.addListener('dragend', function(event) {
              const lat = event.latLng.lat();
              const lng = event.latLng.lng();
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'positionChanged',
                  latitude: lat,
                  longitude: lng
                }));
              }
            });

            // Update position when map is clicked
            map.addListener('click', function(event) {
              const lat = event.latLng.lat();
              const lng = event.latLng.lng();
              marker.setPosition({ lat: lat, lng: lng });
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'positionChanged',
                  latitude: lat,
                  longitude: lng
                }));
              }
            });

            mapLoaded = true;
            // Notify that map is loaded
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapLoaded'
              }));
            }
          } catch (error) {
            console.error('Map initialization error:', error);
            showError();
          }
        }

        function handleMapError() {
          console.error('Google Maps API failed to load');
          showError();
        }

        // Listen for messages from React Native
        document.addEventListener('message', function(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'setPosition' && marker && map) {
              const lat = data.latitude;
              const lng = data.longitude;
              marker.setPosition({ lat: lat, lng: lng });
              map.setCenter({ lat: lat, lng: lng });
            }
          } catch (e) {
            console.error('Error handling message:', e);
          }
        });

        // Fallback for window.addEventListener
        window.addEventListener('message', function(event) {
          try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (data.type === 'setPosition' && marker && map) {
              const lat = data.latitude;
              const lng = data.longitude;
              marker.setPosition({ lat: lat, lng: lng });
              map.setCenter({ lat: lat, lng: lng });
            }
          } catch (e) {
            console.error('Error handling message:', e);
          }
        });
      </script>
      <script>
        // Load Google Maps API
        function loadGoogleMaps() {
          const script = document.createElement('script');
          script.src = 'https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&libraries=places';
          script.async = true;
          script.defer = true;
          script.onerror = function() {
            console.error('Failed to load Google Maps script');
            handleMapError();
          };
          document.head.appendChild(script);
        }
        
        // Start loading
        loadGoogleMaps();
        
        // Timeout fallback
        setTimeout(function() {
          if (!mapLoaded) {
            console.warn('Map load timeout');
            handleMapError();
          }
        }, 15000);
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pick Location</Text>
        <TouchableOpacity onPress={handleConfirm}>
          <Text style={styles.confirmButton}>Confirm</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          style={styles.map}
          source={{ html: googleMapsHTML }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.locationButton, gettingLocation && styles.locationButtonDisabled]}
          onPress={getCurrentLocation}
          disabled={gettingLocation}
        >
          {gettingLocation ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.locationButtonText}>📍 Get Current Location</Text>
          )}
        </TouchableOpacity>

        {address ? (
          <View style={styles.addressSection}>
            <Text style={styles.sectionTitle}>Selected Address</Text>
            <Text style={styles.addressText}>{address}</Text>
          </View>
        ) : (
          <View style={styles.addressSection}>
            <Text style={styles.sectionTitle}>Address</Text>
            <Text style={styles.addressText}>Getting address...</Text>
          </View>
        )}

        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>
            💡 Tip: Tap on the map or drag the marker to select location. Use "Get Current Location" to auto-fill your current address.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  confirmButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  mapContainer: {
    height: 300,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#BBDEFB',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  controls: {
    flex: 1,
    padding: 16,
  },
  locationButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  locationButtonDisabled: {
    opacity: 0.6,
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addressSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  instructions: {
    backgroundColor: '#FFF9C4',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FBC02D',
  },
  instructionsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});
