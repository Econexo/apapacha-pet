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
  passwordRecovery: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  passwordRecovery: false,
  signOut: async () => {},
  refreshProfile: async () => {},
  clearPasswordRecovery: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Supabase emite PASSWORD_RECOVERY cuando la sesión viene del enlace de
      // "restablecer contraseña". Sin esto, el enlace solo iniciaba sesión y
      // dejaba al usuario en Inicio, sin ninguna forma de cambiar la clave.
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession(session);
      if (session) {
        // Al entrar (no en cada refresco de token, que remontaría la
        // navegación y perdería la pantalla actual) esperamos al perfil antes
        // de decidir la ruta inicial: si el stack se monta con el perfil aún
        // sin cargar, la decisión se toma con datos incompletos.
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') setLoading(true);
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
      setPasswordRecovery(false);
      // Sin esto, el linking restaura la pantalla privada anterior (p. ej.
      // /perfil) y parece que "Cerrar Sesión" no hizo nada. La URL final no
      // la fija este replaceState: la vuelve a escribir React Navigation al
      // montar el stack de invitado con guestLinking (initialRouteName
      // "Login"), así que puede terminar en "/login" en vez de "/" — lo que
      // importa es que nunca queda en una pantalla privada, no el valor
      // exacto de la URL.
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
      passwordRecovery,
      signOut,
      refreshProfile,
      clearPasswordRecovery: () => setPasswordRecovery(false),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
