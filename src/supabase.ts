import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// TODO: Replace these with your actual Supabase URL and Anon Key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

// Wrap fetch to gracefully handle network errors (Supabase unreachable/offline).
// Without this, the SDK's internal auto-refresh retries log uncaught errors to console.
const resilientFetch: typeof fetch = async (input, init) => {
    try {
        return await fetch(input, init);
    } catch {
        // Return a synthetic error response so the SDK handles it as an API error
        // rather than an uncaught network exception
        return new Response(JSON.stringify({ error: 'network_error', message: 'Network request failed' }), {
            status: 400,
            statusText: 'Network Unavailable',
            headers: new Headers({ 'Content-Type': 'application/json' }),
        });
    }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
    },
    global: {
        fetch: resilientFetch,
    },
});
