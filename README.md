# RootsTech Mobile App

A React Native mobile app for viewing RootsTech conference classes and navigating to conference rooms.

## Features

### Classes Tab
- Displays all RootsTech classes and main stage events
- Shows class details including date, time, title, speakers, location, and classroom
- Caches results for 10 minutes to reduce API calls
- Pull-to-refresh to manually update the class list
- Tap any class to open its details on the FamilySearch website

### Map Tab
- Shows a detailed map of the Salt Palace Convention Center using MapLibre
- Detects if you are inside the Salt Palace Convention Center
- Shows your current location on the map (only if you're inside the venue)
- When outside the venue:
  - Displays "You are outside of the Salt Palace Convention Center" message
  - Shows "Get Directions to Salt Palace" button that opens your preferred maps app
- Displays markers with labels for all conference rooms and venues
- "How do I get to...?" buttons for quick directions to:
  - Classroom 155
  - Classroom 151
  - Classroom 150
  - Ballroom H
  - Ballroom B
  - Ballrooms A, E, G
  - Main Stage
  - Expo Hall
- Opens native maps app with turn-by-turn directions
- Supports multiple map apps (Apple Maps, Google Maps, Waze, etc.)

## Setup

### Prerequisites
- Node.js installed
- **Java 17** (required for Android builds)
  - Check version: `java -version`
  - Install: `brew install openjdk@17` (macOS) or download from [Adoptium](https://adoptium.net/)
- iOS Simulator (for iOS development) or Android Studio (for Android development)
- **Note**: This app uses native modules (MapLibre) and **requires a development build**. It will NOT work with Expo Go.

### Installation

1. Install dependencies:
```bash
npm install
```

2. **Build a development build** (required for MapLibre):

   For iOS Simulator:
   ```bash
   npm run ios
   ```

   For Android Emulator:
   ```bash
   npm run android
   ```

   For physical device with EAS Build (requires Expo account):
   ```bash
   npm install -g eas-cli
   eas build --profile development --platform ios  # or android
   ```

3. Start the development server:
```bash
npm start
```

4. The app will automatically connect to your development build

### Building APKs

**Debug APK** (for testing):
```bash
npm run build:apk:debug
```
APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

**Release APK** (for production):
```bash
npm run build:apk
```
APK location: `android/app/build/outputs/apk/release/app-release.apk`

Note: Release builds require a signing key. See [Android signing documentation](https://reactnative.dev/docs/signed-apk-android) for setup.

## Technical Details

### API Integration
The app fetches data from the FamilySearch RootsTech GraphQL API, porting the logic from the Java backend:
- Sessions endpoint
- Main stage events endpoint
- Handles duplicate detection and marks online replays
- ASCII normalization for special characters

### Caching Strategy
- Class data is cached in AsyncStorage for 10 minutes
- Reduces API calls and improves performance
- Can be manually refreshed using pull-to-refresh gesture

### Location Permissions
The app requests foreground location permissions to:
- Detect if you are inside the Salt Palace Convention Center
- Show user's current location on the map (only when inside the venue)
- Provide accurate directions to conference rooms

### Map Technology
The app uses MapLibre GL for mapping:
- Open-source mapping solution (no API keys required)
- High-performance vector maps
- Smooth zoom and pan interactions
- Custom markers with labels for conference locations
- Geofencing to detect venue boundaries

The app uses react-native-map-link for navigation:
- Provides a dialog to choose from available map apps
- Supports Apple Maps, Google Maps, Waze, and more
- Works cross-platform on iOS and Android

## Project Structure

```
src/
  screens/
    ClassesScreen.tsx    # List of classes with details
    MapScreen.tsx        # Map view with navigation
  services/
    api.ts              # API service (ported from Java)
  types/
    index.ts            # TypeScript type definitions
```

## Notes

- Location coordinates are for the Salt Palace Convention Center in Salt Lake City, Utah
- The app uses MapLibre for the in-app map display (open-source, no API keys required)
- For turn-by-turn navigation, react-native-map-link provides a choice of installed map apps
- The geofencing boundary is approximate and covers the main Salt Palace Convention Center area
- All class data is fetched in real-time from the official RootsTech API
- When outside the venue, you can easily get directions to the Salt Palace with one tap
