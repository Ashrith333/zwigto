import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput, ScrollView, Platform, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

const GOOGLE_MAPS_API_KEY = 'AIzaSyBRNB4Sb5cAlkDtlI6R0jT-lW9IgIcjaiA';

export const MapPickerScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { initialLat, initialLon, initialAddress, useCurrentLocation } = (route.params as any) || {};
  const webViewRef = useRef<WebView>(null);
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [latitude, setLatitude] = useState<number>(initialLat || 28.6139);
  const [longitude, setLongitude] = useState<number>(initialLon || 77.2090);
  const [address, setAddress] = useState<string>(initialAddress || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If useCurrentLocation is true, get current location when map loads
    if (useCurrentLocation && mapLoaded) {
      getCurrentLocation();
    } else if (!initialAddress) {
      reverseGeocode(latitude, longitude);
    }
  }, [mapLoaded]);

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

  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    // Clear any pending timeout
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }

    // Debounce reverse geocoding to prevent too many calls
    geocodeTimeoutRef.current = setTimeout(async () => {
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
    }, 500); // 500ms debounce
  }, []);

  const handleConfirm = () => {
    // Get the previous screen name from navigation state
    const state = (navigation as any).getState();
    const routes = state?.routes || [];
    const previousRoute = routes[routes.length - 2];
    
    if (previousRoute) {
      // Navigate back to previous screen with location data
      (navigation as any).navigate(previousRoute.name, {
        selectedLatitude: latitude,
        selectedLongitude: longitude,
        selectedAddress: address,
      });
    } else {
      // Fallback to RestaurantForm
      (navigation as any).navigate('RestaurantForm', {
        selectedLatitude: latitude,
        selectedLongitude: longitude,
        selectedAddress: address,
      });
    }
  };

  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);
    
    // Clear any pending timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (text.trim().length > 2) {
      // Debounce autocomplete requests - auto-trigger after user stops typing
      searchTimeoutRef.current = setTimeout(() => {
        // Request autocomplete suggestions from WebView
        if (webViewRef.current && mapLoaded) {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'getAutocomplete',
            query: text.trim(),
          }));
        }
      }, 300); // 300ms debounce
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: any) => {
    setSearchQuery(suggestion.description);
    setShowSuggestions(false);
    setSearching(true);
    
    // Navigate map to selected location
    if (webViewRef.current && mapLoaded) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'selectPlace',
        placeId: suggestion.place_id,
      }));
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a location to search');
      return;
    }

    setSearching(true);
    setShowSuggestions(false);
    // Send search query to WebView
    if (webViewRef.current && mapLoaded) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'searchLocation',
        query: searchQuery.trim(),
      }));
    } else {
      Alert.alert('Error', 'Map is not ready yet. Please wait for the map to load.');
      setSearching(false);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'positionChanged') {
        setLatitude(data.latitude);
        setLongitude(data.longitude);
        if (data.address) {
          setAddress(data.address);
        } else {
          reverseGeocode(data.latitude, data.longitude);
        }
      } else if (data.type === 'mapLoaded') {
        setMapLoaded(true);
      } else if (data.type === 'mapError') {
        console.error('Map error from WebView:', data.message);
        Alert.alert(
          'Map Loading Error',
          data.message || 'Failed to load map. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else if (data.type === 'searchComplete') {
        setSearching(false);
        if (data.latitude && data.longitude) {
          setLatitude(data.latitude);
          setLongitude(data.longitude);
          if (data.address) {
            setAddress(data.address);
          } else {
            reverseGeocode(data.latitude, data.longitude);
          }
        }
      } else if (data.type === 'searchError') {
        setSearching(false);
        Alert.alert('Search Error', data.message || 'Failed to find location');
      } else if (data.type === 'autocompleteResults') {
        setSearchSuggestions(data.predictions || []);
        setShowSuggestions(data.predictions && data.predictions.length > 0);
      } else if (data.type === 'placeSelected') {
        setSearching(false);
        if (data.latitude && data.longitude) {
          setLatitude(data.latitude);
          setLongitude(data.longitude);
          if (data.address) {
            setAddress(data.address);
          } else {
            reverseGeocode(data.latitude, data.longitude);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse WebView message:', error);
    }
  };

  // Memoize the HTML to prevent regeneration - only recreate when initial values change
  const initialLatRef = useRef(initialLat || 28.6139);
  const initialLonRef = useRef(initialLon || 77.2090);
  
  const googleMapsHTML = useMemo(() => {
    // Only update initial values if they were provided
    if (initialLat !== undefined) initialLatRef.current = initialLat;
    if (initialLon !== undefined) initialLonRef.current = initialLon;
    
    return `
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
        #error p { margin: 10px 0; }
      </style>
    </head>
    <body>
      <div id="error">
        <p style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">⚠️ Oops! Something went wrong</p>
        <p style="font-size: 14px; color: #666; margin-bottom: 5px;">The map didn't load correctly.</p>
        <p style="font-size: 12px; color: #999;">Please check your internet connection and try again.</p>
      </div>
      <div id="map"></div>
      <script>
        let map;
        let marker;
        let initialLat = ${initialLatRef.current};
        let initialLon = ${initialLonRef.current};
        let mapLoaded = false;
        let loadTimeout;

        function showError(message) {
          const errorDiv = document.getElementById('error');
          const mapDiv = document.getElementById('map');
          if (errorDiv) {
            if (message) {
              const errorText = errorDiv.querySelector('p:last-child');
              if (errorText) {
                errorText.textContent = message;
              }
            }
            errorDiv.style.display = 'flex';
          }
          if (mapDiv) {
            mapDiv.style.display = 'none';
          }
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapError',
              message: message || 'Map failed to load'
            }));
          }
        }

        function initMap() {
          try {
            if (!window.google || !window.google.maps) {
              showError('Google Maps API not loaded');
              return;
            }

            const mapElement = document.getElementById('map');
            if (!mapElement) {
              showError('Map container not found');
              return;
            }

            map = new google.maps.Map(mapElement, {
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
            clearTimeout(loadTimeout);
            
            // Hide error if shown
            const errorDiv = document.getElementById('error');
            const mapDiv = document.getElementById('map');
            if (errorDiv) errorDiv.style.display = 'none';
            if (mapDiv) mapDiv.style.display = 'block';

            // Notify that map is loaded
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapLoaded'
              }));
            }
          } catch (error) {
            console.error('Map initialization error:', error);
            showError('Failed to initialize map: ' + (error.message || 'Unknown error'));
          }
        }

        function handleMapError(error) {
          console.error('Google Maps API failed to load:', error);
          let errorMessage = 'Google Maps API failed to load';
          if (error && error.message) {
            errorMessage += ': ' + error.message;
          }
          showError(errorMessage);
        }

        // Global error handler for Google Maps
        window.gm_authFailure = function() {
          showError('Google Maps authentication failed. Please check API key configuration.');
        };

        // Listen for messages from React Native
        document.addEventListener('message', function(event) {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'setPosition' && marker && map) {
              const lat = data.latitude;
              const lng = data.longitude;
              marker.setPosition({ lat: lat, lng: lng });
              map.setCenter({ lat: lat, lng: lng });
            } else if (data.type === 'getAutocomplete' && window.google && window.google.maps && window.google.maps.places) {
              // Get autocomplete suggestions
              const service = new google.maps.places.AutocompleteService();
              service.getPlacePredictions({
                input: data.query,
                types: ['geocode', 'establishment'],
                componentRestrictions: { country: 'in' }
              }, function(predictions, status) {
                if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'autocompleteResults',
                      predictions: predictions
                    }));
                  }
                } else {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'autocompleteResults',
                      predictions: []
                    }));
                  }
                }
              });
            } else if (data.type === 'selectPlace' && window.google && window.google.maps && window.google.maps.places) {
              // Get place details from place_id
              const service = new google.maps.places.PlacesService(map);
              service.getDetails({
                placeId: data.placeId,
                fields: ['geometry', 'formatted_address', 'name']
              }, function(place, status) {
                if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry) {
                  const lat = place.geometry.location.lat();
                  const lng = place.geometry.location.lng();
                  
                  marker.setPosition({ lat: lat, lng: lng });
                  map.setCenter({ lat: lat, lng: lng });
                  map.setZoom(17);
                  
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'placeSelected',
                      latitude: lat,
                      longitude: lng,
                      address: place.formatted_address || place.name
                    }));
                  }
                } else {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'searchError',
                      message: 'Failed to get place details.'
                    }));
                  }
                }
              });
            } else if (data.type === 'searchLocation' && map) {
              // Search for location using Places API
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode({ address: data.query }, function(results, status) {
                if (status === 'OK' && results && results.length > 0) {
                  const location = results[0].geometry.location;
                  const lat = location.lat();
                  const lng = location.lng();
                  
                  marker.setPosition({ lat: lat, lng: lng });
                  map.setCenter({ lat: lat, lng: lng });
                  map.setZoom(17);
                  
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'searchComplete',
                      latitude: lat,
                      longitude: lng,
                      address: results[0].formatted_address
                    }));
                  }
                } else {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'searchError',
                      message: 'Location not found. Please try a different search term.'
                    }));
                  }
                }
              });
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
            } else if (data.type === 'getAutocomplete' && window.google && window.google.maps && window.google.maps.places) {
              // Get autocomplete suggestions
              const service = new google.maps.places.AutocompleteService();
              service.getPlacePredictions({
                input: data.query,
                types: ['geocode', 'establishment'],
                componentRestrictions: { country: 'in' } // Restrict to India, remove if you want worldwide
              }, function(predictions, status) {
                if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'autocompleteResults',
                      predictions: predictions
                    }));
                  }
                } else {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'autocompleteResults',
                      predictions: []
                    }));
                  }
                }
              });
            } else if (data.type === 'selectPlace' && window.google && window.google.maps && window.google.maps.places) {
              // Get place details from place_id
              const service = new google.maps.places.PlacesService(map);
              service.getDetails({
                placeId: data.placeId,
                fields: ['geometry', 'formatted_address', 'name']
              }, function(place, status) {
                if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry) {
                  const lat = place.geometry.location.lat();
                  const lng = place.geometry.location.lng();
                  
                  marker.setPosition({ lat: lat, lng: lng });
                  map.setCenter({ lat: lat, lng: lng });
                  map.setZoom(17);
                  
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'placeSelected',
                      latitude: lat,
                      longitude: lng,
                      address: place.formatted_address || place.name
                    }));
                  }
                } else {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'searchError',
                      message: 'Failed to get place details.'
                    }));
                  }
                }
              });
            } else if (data.type === 'searchLocation' && map) {
              // Search for location using Places API
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode({ address: data.query }, function(results, status) {
                if (status === 'OK' && results && results.length > 0) {
                  const location = results[0].geometry.location;
                  const lat = location.lat();
                  const lng = location.lng();
                  
                  marker.setPosition({ lat: lat, lng: lng });
                  map.setCenter({ lat: lat, lng: lng });
                  map.setZoom(17);
                  
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'searchComplete',
                      latitude: lat,
                      longitude: lng,
                      address: results[0].formatted_address
                    }));
                  }
                } else {
                  if (window.ReactNativeWebView) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'searchError',
                      message: 'Location not found. Please try a different search term.'
                    }));
                  }
                }
              });
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
          script.src = 'https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&libraries=places&v=3.56';
          script.async = true;
          script.defer = true;
          script.onerror = function(error) {
            console.error('Failed to load Google Maps script:', error);
            handleMapError(error);
          };
          document.head.appendChild(script);
        }
        
        // Start loading
        loadGoogleMaps();
        
        // Timeout fallback
        loadTimeout = setTimeout(function() {
          if (!mapLoaded) {
            console.warn('Map load timeout');
            handleMapError(new Error('Map load timeout after 15 seconds'));
          }
        }, 15000);
      </script>
    </body>
    </html>
  `;
  }, []); // Empty dependency array - HTML only created once

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Section - always visible at top */}
      <View style={styles.searchContainer}>
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a location..."
            value={searchQuery}
            onChangeText={handleSearchInputChange}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholderTextColor="#999"
            onFocus={() => {
              if (searchSuggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 200);
            }}
          />
          <TouchableOpacity
            style={[styles.searchButton, searching && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={searching || !searchQuery.trim()}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchButtonText}>🔍</Text>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Autocomplete Suggestions */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {searchSuggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={suggestion.place_id || index}
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(suggestion)}
              >
                <Text style={styles.suggestionMainText}>{suggestion.description}</Text>
                {suggestion.structured_formatting && suggestion.structured_formatting.secondary_text && (
                  <Text style={styles.suggestionSecondaryText}>
                    {suggestion.structured_formatting.secondary_text}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          style={styles.map}
          source={{ html: googleMapsHTML }}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            Alert.alert(
              'Map Loading Error',
              'Failed to load map. Please check your internet connection and try again.',
              [{ text: 'OK' }]
            );
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView HTTP error:', nativeEvent);
            Alert.alert(
              'Map Loading Error',
              `HTTP Error: ${nativeEvent.statusCode}. Please check your internet connection.`,
              [{ text: 'OK' }]
            );
          }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading map...</Text>
            </View>
          )}
        />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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

        {/* Selected Address Display */}
        {address ? (
          <View style={styles.addressSection}>
            <Text style={styles.sectionTitle}>Selected Address:</Text>
            <Text style={styles.addressText}>{address}</Text>
            <Text style={styles.coordinatesText}>
              Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </Text>
          </View>
        ) : (
          <View style={styles.addressSection}>
            <Text style={styles.sectionTitle}>Address</Text>
            <Text style={styles.addressText}>Select a location on the map to see the address</Text>
          </View>
        )}

        {/* Confirm Button - only shown when address is selected */}
        {address && (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmButtonText}>✓ Confirm This Address</Text>
          </TouchableOpacity>
        )}

        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>
            💡 Tip: Search for a location, or tap/drag on the map to select. Address will be confirmed from the map selection.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  mapContainer: {
    height: 300,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#BBDEFB',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  searchSection: {
    flexDirection: 'row',
    gap: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionMainText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  suggestionSecondaryText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 14,
    color: '#333',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonText: {
    fontSize: 18,
  },
  locationButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    color: '#333',
    lineHeight: 20,
    marginTop: 4,
    fontWeight: '500',
  },
  coordinatesText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontFamily: 'monospace',
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
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});
