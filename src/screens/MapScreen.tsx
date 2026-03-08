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
import { showLocation } from 'react-native-map-link';
import { Location } from '../types';
import { styles } from './MapScreen.styles';

const LOCATIONS: Location[] = [
  { name: 'Classroom 155', latitude: 40.76877678903509, longitude: -111.89612638583064 },
  { name: 'Classroom 151', latitude: 40.76761483311832, longitude: -111.89492475626699 },
  { name: 'Classroom 150', latitude: 40.76742388037703, longitude: -111.89493548510237 },
  { name: 'Ballroom H', latitude: 40.76638070271472, longitude: -111.89495965220146 },
  { name: 'Ballroom B', latitude: 40.766822042287295, longitude: -111.89497572729124 },
  { name: 'Ballrooms A,E,G', latitude: 40.76656028261861, longitude: -111.89446132441859 },
  { name: 'Main Stage', latitude: 40.765841570073285, longitude: -111.89539696893233 },
  { name: 'Expo Hall', latitude: 40.76701859236386, longitude: -111.8952862676633 }
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

        const inside = checkIfInsideSaltPalace(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude
        );
        setIsInsideSaltPalace(inside);
      } catch (error) {
        console.error('Error getting location:', error);
        setErrorMsg('Could not get current location');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openDirections = (destination: Location) => {
    showLocation({
      latitude: destination.latitude,
      longitude: destination.longitude,
      title: destination.name,
      dialogTitle: 'Open with',
      dialogMessage: 'Select an app to get directions',
      cancelText: 'Cancel'
    }).catch((err) => {
      console.error('Error opening maps:', err);
      Alert.alert('Error', 'Could not open maps application');
    });
  };

  const openDirectionsToSaltPalace = () => {
    showLocation({
      latitude: SALT_PALACE_CENTER[1],
      longitude: SALT_PALACE_CENTER[0],
      title: 'Salt Palace Convention Center',
      dialogTitle: 'Get Directions',
      dialogMessage: 'Select an app to get directions to the Salt Palace',
      cancelText: 'Cancel'
    }).catch((err) => {
      console.error('Error opening maps:', err);
      Alert.alert('Error', 'Could not open maps application');
    });
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
