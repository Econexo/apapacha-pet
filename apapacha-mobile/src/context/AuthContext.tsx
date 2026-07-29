import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import type { Profile } from '../types/database';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
        if (event === 'SIGNED_IN' && Platform.OS === 'web' && typeof window !== 'undefined') {
          window.history.replaceState(null, '', window.location.pathname);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string, attempt = 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error?.code === 'PGRST116' && attempt < 3) {
      await new Promise(r => setTimeout(r, 800));
      return fetchProfile(userId, attempt + 1);
    }
    if (error && error.code !== 'PGRST116') console.error('[AuthContext] fetchProfile:', error.message);
    setProfile(data ?? null);
    setLoading(false);
  }

  async function refreshProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) await fetchProfile(user.id);
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Si la llamada global falla (red caída, lock de Safari en la PWA de iOS),
      // al menos limpiamos la sesión local para no dejar al usuario atrapado.
      console.warn('[AuthContext] signOut global falló, limpiando local:', e);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    } finally {
      setSession(null);
      setProfile(null);
      // Sin esto, el linking restaura /perfil y parece que no pasó nada.
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/');
      }
    }
  }

  return (
    <AuthContext.Provider value={{
      user: session?.user ?? null,
      session,
      profile,
      loading,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
