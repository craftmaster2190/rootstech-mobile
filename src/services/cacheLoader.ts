import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export class CacheLoader<T> {
  private readonly cacheKey: string;
  private readonly cacheDuration: number;

  constructor(cacheKey: string, cacheDurationMs: number) {
    this.cacheKey = cacheKey;
    this.cacheDuration = cacheDurationMs;
  }

  async get(): Promise<T | null> {
    try {
      const cachedStr = await AsyncStorage.getItem(this.cacheKey);
      if (cachedStr) {
        const cached: CachedData<T> = JSON.parse(cachedStr);
        const now = Date.now();
        if (now - cached.timestamp < this.cacheDuration) {
          console.log(`Cache hit for key: ${this.cacheKey}`);
          return cached.data;
        } else {
          console.log(`Cache expired for key: ${this.cacheKey}`);
        }
      }
    } catch (error) {
      console.error(`Error reading cache for key ${this.cacheKey}:`, error);
    }
    return null;
  }

  async set(data: T): Promise<void> {
    try {
      const cacheData: CachedData<T> = {
        data,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
      console.log(`Cache set for key: ${this.cacheKey}`);
    } catch (error) {
      console.error(`Error writing cache for key ${this.cacheKey}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.cacheKey);
      console.log(`Cache cleared for key: ${this.cacheKey}`);
    } catch (error) {
      console.error(`Error clearing cache for key ${this.cacheKey}:`, error);
    }
  }

  async loadWithCache(fetchFn: () => Promise<T>): Promise<T> {
    // Try to get from cache first
    const cached = await this.get();
    if (cached !== null) {
      return cached;
    }

    // Cache miss, fetch fresh data
    console.log(`Cache miss for key: ${this.cacheKey}, fetching fresh data`);
    const freshData = await fetchFn();

    // Store in cache
    await this.set(freshData);

    return freshData;
  }
}
