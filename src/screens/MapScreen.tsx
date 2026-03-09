import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  Alert
} from 'react-native';
import Mapbox from '@maplibre/maplibre-react-native';
import * as ExpoLocation from 'expo-location';
import { Location } from '../types';
import { styles } from './MapScreen.styles';

const LOCATIONS: Location[] = [
  // 100 series rooms (1st floor)
  { name: '150', latitude: 40.76850, longitude: -111.89600 },
  { name: '151', latitude: 40.76850, longitude: -111.89560 },
  { name: '155 A', latitude: 40.76850, longitude: -111.89520 },
  { name: '155 BC', latitude: 40.76850, longitude: -111.89480 },
  { name: '155 D', latitude: 40.76850, longitude: -111.89440 },
  { name: '155 EF', latitude: 40.76850, longitude: -111.89400 },

  // 200 series rooms (2nd floor)
  { name: '250', latitude: 40.76800, longitude: -111.89600 },
  { name: '251', latitude: 40.76800, longitude: -111.89560 },
  { name: '255 A', latitude: 40.76800, longitude: -111.89520 },
  { name: '255 BC', latitude: 40.76800, longitude: -111.89480 },
  { name: '255 D', latitude: 40.76800, longitude: -111.89440 },
  { name: '255 EF', latitude: 40.76800, longitude: -111.89400 },
  { name: '257 A', latitude: 40.76780, longitude: -111.89600 },
  { name: '257 B', latitude: 40.76780, longitude: -111.89560 },
  { name: '260 B', latitude: 40.76780, longitude: -111.89520 },

  // 300 series rooms (3rd floor)
  { name: '355 BC', latitude: 40.76750, longitude: -111.89600 },
  { name: '355 EF', latitude: 40.76750, longitude: -111.89560 },

  // Ballrooms
  { name: 'Ballroom A', latitude: 40.76700, longitude: -111.89600 },
  { name: 'Ballroom B', latitude: 40.76700, longitude: -111.89560 },
  { name: 'Ballroom E', latitude: 40.76700, longitude: -111.89520 },
  { name: 'Ballroom G', latitude: 40.76700, longitude: -111.89480 },
  { name: 'Ballroom H', latitude: 40.76700, longitude: -111.89440 },

  // Halls
  { name: 'Hall E', latitude: 40.76650, longitude: -111.89520 }
];

// Function to create a box around a point (approximate room size)
const createRoomBox = (lat: number, lon: number, widthMeters = 20, heightMeters = 20) => {
  // Approximate degrees per meter at Salt Lake City latitude (~40.76°)
  const latDegPerMeter = 1 / 111320; // latitude degrees per meter
  const lonDegPerMeter = 1 / (111320 * Math.cos(lat * Math.PI / 180)); // longitude degrees per meter

  const halfWidth = (widthMeters / 2) * lonDegPerMeter;
  const halfHeight = (heightMeters / 2) * latDegPerMeter;

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [lon - halfWidth, lat + halfHeight], // top-left
        [lon + halfWidth, lat + halfHeight], // top-right
        [lon + halfWidth, lat - halfHeight], // bottom-right
        [lon - halfWidth, lat - halfHeight], // bottom-left
        [lon - halfWidth, lat + halfHeight]  // close the polygon
      ]]
    }
  };
};

// Salt Palace Convention Center bounds (approximate)
const SALT_PALACE_BOUNDS = {
  north: 40.76900,
  south: 40.76550,
  east: -111.89400,
  west: -111.89650
};

// Center of Salt Palace
const SALT_PALACE_CENTER = [-111.89500, 40.76700]; // [longitude, latitude]

// GeoJSON for Salt Palace boundary rectangle
const SALT_PALACE_RECTANGLE = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [SALT_PALACE_BOUNDS.west, SALT_PALACE_BOUNDS.north],
      [SALT_PALACE_BOUNDS.east, SALT_PALACE_BOUNDS.north],
      [SALT_PALACE_BOUNDS.east, SALT_PALACE_BOUNDS.south],
      [SALT_PALACE_BOUNDS.west, SALT_PALACE_BOUNDS.south],
      [SALT_PALACE_BOUNDS.west, SALT_PALACE_BOUNDS.north]
    ]]
  }
};

export default function MapScreen() {
  const [location, setLocation] = useState<ExpoLocation.LocationObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInsideSaltPalace, setIsInsideSaltPalace] = useState(false);

  const checkIfInsideSaltPalace = (lat: number, lon: number): boolean => {
    return (
      lat >= SALT_PALACE_BOUNDS.south &&
      lat <= SALT_PALACE_BOUNDS.north &&
      lon >= SALT_PALACE_BOUNDS.west &&
      lon <= SALT_PALACE_BOUNDS.east
    );
  };

  useEffect(() => {
    (async () => {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }

      try {
        const currentLocation = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.High
        });
        setLocation(currentLocation);

        console.log('Current user location:', {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          altitude: currentLocation.coords.altitude,
          accuracy: currentLocation.coords.accuracy,
          timestamp: new Date(currentLocation.timestamp).toISOString()
        });

        const inside = checkIfInsideSaltPalace(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude
        );
        setIsInsideSaltPalace(inside);
        console.log('Inside Salt Palace:', inside);
      } catch (error) {
        console.error('Error getting location:', error);
        setErrorMsg('Could not get current location');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openDirections = (destination: Location) => {
    const { latitude, longitude, name } = destination;
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q='
    });
    const latLng = `${latitude},${longitude}`;
    const url = Platform.select({
      ios: `${scheme}${name}@${latLng}`,
      android: `${scheme}${latLng}(${name})`
    });

    if (url) {
      Linking.openURL(url).catch((err) => {
        console.error('Error opening maps:', err);
        // Fallback to Google Maps web
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latLng}`;
        Linking.openURL(googleMapsUrl).catch(() => {
          Alert.alert('Error', 'Could not open maps application');
        });
      });
    }
  };

  const openDirectionsToSaltPalace = () => {
    const latitude = SALT_PALACE_CENTER[1];
    const longitude = SALT_PALACE_CENTER[0];
    const label = 'Salt Palace Convention Center';

    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q='
    });
    const latLng = `${latitude},${longitude}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) {
      Linking.openURL(url).catch((err) => {
        console.error('Error opening maps:', err);
        // Fallback to Google Maps web
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latLng}`;
        Linking.openURL(googleMapsUrl).catch(() => {
          Alert.alert('Error', 'Could not open maps application');
        });
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
      >
        <Mapbox.Camera
          zoomLevel={16}
          centerCoordinate={SALT_PALACE_CENTER}
        />

        {/* Salt Palace boundary rectangle */}
        <Mapbox.ShapeSource id="saltPalaceBoundary" shape={SALT_PALACE_RECTANGLE}>
          <Mapbox.FillLayer
            id="saltPalaceFill"
            style={{
              fillColor: '#0066cc',
              fillOpacity: 0.1
            }}
          />
          <Mapbox.LineLayer
            id="saltPalaceLine"
            style={{
              lineColor: '#0066cc',
              lineWidth: 3,
              lineOpacity: 0.8
            }}
          />
        </Mapbox.ShapeSource>

        {/* Room boxes */}
        {LOCATIONS.map((loc, index) => (
          <Mapbox.ShapeSource
            key={`room-box-${index}`}
            id={`roomBox-${index}`}
            shape={createRoomBox(loc.latitude, loc.longitude)}
          >
            <Mapbox.FillLayer
              id={`roomFill-${index}`}
              style={{
                fillColor: '#ff6b35',
                fillOpacity: 0.3
              }}
            />
            <Mapbox.LineLayer
              id={`roomLine-${index}`}
              style={{
                lineColor: '#ff6b35',
                lineWidth: 2,
                lineOpacity: 0.8
              }}
            />
          </Mapbox.ShapeSource>
        ))}

        {/* Show user location only if inside Salt Palace */}
        {isInsideSaltPalace && location && (
          <Mapbox.PointAnnotation
            id="userLocation"
            coordinate={[location.coords.longitude, location.coords.latitude]}
          >
            <View style={styles.userLocationMarker}>
              <View style={styles.userLocationDot} />
            </View>
          </Mapbox.PointAnnotation>
        )}

        {/* Location markers */}
        {LOCATIONS.map((loc, index) => (
          <Mapbox.PointAnnotation
            key={index}
            id={`location-${index}`}
            coordinate={[loc.longitude, loc.latitude]}
            title={loc.name}
          >
            <View style={styles.markerContainer}>
              <View style={styles.marker} />
              <Text style={styles.markerLabel}>{loc.name}</Text>
            </View>
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>

      {/* Status message */}
      {!isInsideSaltPalace && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            You are outside of the Salt Palace Convention Center
          </Text>
          <TouchableOpacity
            style={styles.directionsToVenueButton}
            onPress={openDirectionsToSaltPalace}
          >
            <Text style={styles.directionsToVenueButtonText}>
              Get Directions to Salt Palace
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {errorMsg && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Direction buttons */}
      <View style={styles.buttonContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {LOCATIONS.map((loc, index) => (
            <TouchableOpacity
              key={index}
              style={styles.directionButton}
              onPress={() => openDirections(loc)}
            >
              <Text style={styles.buttonText}>How do I get to...?</Text>
              <Text style={styles.locationName}>{loc.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
