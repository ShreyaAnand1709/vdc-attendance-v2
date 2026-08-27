import 'react-native-url-polyfill/auto';

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:
      Platform.OS === 'web'
        ? {
            getItem: (key) => Promise.resolve(globalThis.localStorage?.getItem(key) ?? null),
            removeItem: (key) => {
              globalThis.localStorage?.removeItem(key);
              return Promise.resolve();
            },
            setItem: (key, value) => {
              globalThis.localStorage?.setItem(key, value);
              return Promise.resolve();
            },
          }
        : {
            getItem: (key) => SecureStore.getItemAsync(key),
            removeItem: (key) => SecureStore.deleteItemAsync(key),
            setItem: (key, value) => SecureStore.setItemAsync(key, value),
          },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
