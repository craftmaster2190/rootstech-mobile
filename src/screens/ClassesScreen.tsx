import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Fuse from 'fuse.js';
import { fetchClasses } from '../services/api';
import { RootstechClass } from '../types';
import { styles } from './ClassesScreen.styles';

type LocationFilter = 'online' | 'in-person';

export default function ClassesScreen() {
  const [classes, setClasses] = useState<RootstechClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('in-person');
  const flatListRef = useRef<FlatList>(null);

  // Filter classes by location first
  const locationFilteredClasses = useMemo(() => {
    console.log(`\n=== Filtering by: ${locationFilter} ===`);

    const filtered = classes.filter(classItem => {
      const location = classItem.Location.toLowerCase();
      let shouldInclude = false;

      if (locationFilter === 'online') {
        // Show Online, Online Replay, and "In Person and Online"
        shouldInclude = location.includes('online');
      } else {
        // in-person: Show In Person and "In Person and Online"
        shouldInclude = location.includes('in person');
      }

      if (!shouldInclude) {
        console.log(`Filtered OUT: ${classItem.Title} | Location: ${classItem.Location}`);
      }

      return shouldInclude;
    });

    console.log(`Total classes: ${classes.length}, After filter: ${filtered.length}, Filtered out: ${classes.length - filtered.length}\n`);

    return filtered;
  }, [classes, locationFilter]);

  // Configure Fuse.js for fuzzy search
  const fuse = useMemo(() => {
    return new Fuse(locationFilteredClasses, {
      keys: ['Title', 'Speakers', 'Location', 'Classroom', 'Date', 'Time'],
      threshold: 0.3, // Lower = stricter matching
      includeScore: true,
      minMatchCharLength: 2
    });
  }, [locationFilteredClasses]);

  // Filter classes based on search query
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) {
      return locationFilteredClasses;
    }
    const results = fuse.search(searchQuery);
    return results.map(result => result.item);
  }, [locationFilteredClasses, searchQuery, fuse]);

  const loadClasses = async () => {
    try {
      const data = await fetchClasses();
      setClasses(data);
    } catch (error) {
      console.error('Error loading classes:', error);
      Alert.alert('Error', 'Failed to load classes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadClasses();
  };

  const openUrl = (url: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const findFirstClassOnDay = (classList: RootstechClass[], dayName: string): number => {
    const index = classList.findIndex(classItem =>
      classItem.Date.toLowerCase().startsWith(dayName.toLowerCase())
    );
    return index >= 0 ? index : 0;
  };

  const findCurrentOrNextClass = (classList: RootstechClass[]): number => {
    const now = Date.now();
    const index = classList.findIndex(classItem => classItem.timestamp >= now);
    return index >= 0 ? index : 0;
  };

  const scrollToNow = () => {
    if (filteredClasses.length > 0 && flatListRef.current) {
      const index = findCurrentOrNextClass(filteredClasses);
      console.log('Scrolling to Now, index:', index);
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0
      });
    }
  };

  const scrollToThursday = () => {
    if (filteredClasses.length > 0 && flatListRef.current) {
      const index = findFirstClassOnDay(filteredClasses, 'thu');
      console.log('Scrolling to Thursday, index:', index);
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0
      });
    }
  };

  const scrollToFriday = () => {
    if (filteredClasses.length > 0 && flatListRef.current) {
      const index = findFirstClassOnDay(filteredClasses, 'fri');
      console.log('Scrolling to Friday, index:', index);
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0
      });
    }
  };

  const scrollToSaturday = () => {
    if (filteredClasses.length > 0 && flatListRef.current) {
      const index = findFirstClassOnDay(filteredClasses, 'sat');
      console.log('Scrolling to Saturday, index:', index);
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0
      });
    }
  };

  const renderItem = ({ item }: { item: RootstechClass }) => (
    <TouchableOpacity style={styles.card} onPress={() => openUrl(item.url)}>
      <View style={styles.header}>
        <Text style={styles.date}>{item.Date}</Text>
        <Text style={styles.time}>{item.Time}</Text>
      </View>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{item.Title}</Text>
        {item.isReplay && (
          <View style={styles.replayChip}>
            <Text style={styles.replayChipText}>Replay</Text>
          </View>
        )}
      </View>
      {item.Speakers && <Text style={styles.speakers}>{item.Speakers}</Text>}
      <View style={styles.locationRow}>
        <Text style={styles.location}>{item.Location}</Text>
        {item.Classroom && (
          <Text style={styles.classroom}> • {item.Classroom}</Text>
        )}
      </View>
      {item['Available for Viewing After Conference'] === 'Yes' && (
        <Text style={styles.available}>Available for viewing after conference</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading classes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            locationFilter === 'in-person' && styles.filterButtonActive
          ]}
          onPress={() => setLocationFilter('in-person')}
        >
          <Text style={[
            styles.filterButtonText,
            locationFilter === 'in-person' && styles.filterButtonTextActive
          ]}>
            In Person
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            locationFilter === 'online' && styles.filterButtonActive
          ]}
          onPress={() => setLocationFilter('online')}
        >
          <Text style={[
            styles.filterButtonText,
            locationFilter === 'online' && styles.filterButtonTextActive
          ]}>
            Online
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search classes, speakers, locations..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <FlatList
        ref={flatListRef}
        data={filteredClasses}
        keyExtractor={(item, index) => `${item.url}-${index}`}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        onScrollToIndexFailed={(info) => {
          console.log("Failed to scroll to index:", info);
          // Fallback: scroll to approximate offset and retry
          const offset = info.averageItemLength * info.index;
          flatListRef.current?.scrollToOffset({ offset, animated: true });
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          }, 100);
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No classes found matching your search' : 'No classes available'}
            </Text>
          </View>
        }
      />
      <View style={styles.scrollButtonsContainer}>
        <TouchableOpacity style={styles.scrollButton} onPress={scrollToNow}>
          <Text style={styles.scrollButtonText}>Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.scrollButton} onPress={scrollToThursday}>
          <Text style={styles.scrollButtonText}>Thursday</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.scrollButton} onPress={scrollToFriday}>
          <Text style={styles.scrollButtonText}>Friday</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.scrollButton} onPress={scrollToSaturday}>
          <Text style={styles.scrollButtonText}>Saturday</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
