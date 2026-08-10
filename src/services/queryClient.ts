import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

/**
 * Station content changes on the order of hours, not seconds, so we lean on
 * long stale times and keep data in cache for a day.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * The Firestore JS SDK has no disk persistence on React Native, so the query
 * cache is what makes News and Schedule render offline. Without this, a cold
 * start with no connection shows empty states.
 */
export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'nepaliko:query-cache',
  throttleTime: 2000,
});

export const PERSIST_MAX_AGE = 24 * 60 * 60 * 1000;
