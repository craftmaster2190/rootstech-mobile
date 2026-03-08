import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export interface Subscription {
  unsubscribe: () => void;
}

export class AsyncCacheLoader<T> {
  private readonly cacheKey: string;
  private readonly cacheDuration: number;

  constructor(cacheKey: string, cacheDurationMs: number) {
    this.cacheKey = cacheKey;
    this.cacheDuration = cacheDurationMs;
  }

  private async get(): Promise<T | null> {
    try {
      const cachedStr = await AsyncStorage.getItem(this.cacheKey);
      if (cachedStr) {
        const cached: CachedData<T> = JSON.parse(cachedStr);
        return cached.data;
      }
    } catch (error) {
      console.error(`Error reading cache for key ${this.cacheKey}:`, error);
    }
    return null;
  }

  private async getIfValid(): Promise<T | null> {
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

  private async set(data: T): Promise<void> {
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

  loadWithCache(fetchFn: () => Promise<T>, onData: (data: T) => void, onError?: (error: Error) => void): Subscription {
    let cancelled = false;

    (async () => {
      try {
        // First, try to emit stale cached data
        const staleData = await this.get();
        if (staleData !== null && !cancelled) {
          console.log(`Emitting stale cache for key: ${this.cacheKey}`);
          onData(staleData);
        }

        // Check if cache is still valid
        const validData = await this.getIfValid();
        if (validData !== null) {
          // Cache is valid, no need to fetch
          if (staleData === null && !cancelled) {
            // Only emit if we didn't already emit stale data
            onData(validData);
          }
          return;
        }

        // Cache miss or expired, fetch fresh data
        console.log(`Fetching fresh data for key: ${this.cacheKey}`);
        const freshData = await fetchFn();

        if (!cancelled) {
          // Store in cache
          await this.set(freshData);

          // Emit fresh data
          console.log(`Emitting fresh data for key: ${this.cacheKey}`);
          onData(freshData);
        }
      } catch (error) {
        if (!cancelled && onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        } else if (!cancelled) {
          console.error(`Error loading with cache for key ${this.cacheKey}:`, error);
        }
      }
    })();

    return {
      unsubscribe: () => {
        cancelled = true;
      }
    };
  }
}
