import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// URL y clave anónima por defecto para desarrollo local con Supabase CLI.
// IMPORTANTE (Zero Trust): Estas NO deben ser credenciales de producción. 
// En producción, usa react-native-dotenv u otro mecanismo validado.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxMjIzNjA5OCwiZXhwIjoxOTI3ODA0MDk4fQ.u-o4iBWe8P70J9uQ0RxyB7_l6oQh2K5E543m8I8XGGo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
