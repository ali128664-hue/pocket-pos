import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import type { Profile, AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone?: string
  ) => Promise<{ error: any | null; user: User | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to fetch or construct user profile
const fetchUserProfile = async (currentUser: User | null): Promise<Profile | null> => {
  if (!currentUser) return null;

  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (data && !error) {
        return data as Profile;
      }
    }
  } catch {
    // Profile table might not exist yet before migrations; fallback to metadata
  }

  // Fallback profile constructed from user auth metadata
  return {
    id: currentUser.id,
    full_name:
      currentUser.user_metadata?.full_name ||
      currentUser.email?.split('@')[0] ||
      'Shop Owner',
    phone: currentUser.user_metadata?.phone || null,
    avatar_url: currentUser.user_metadata?.avatar_url || null,
    created_at: currentUser.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchUserProfile(user);
      setProfile(p);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial session restoration from SecureStore
    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured()) {
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.warn('Error restoring session:', error.message);
        }

        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          if (initialSession?.user) {
            const p = await fetchUserProfile(initialSession.user);
            if (isMounted) setProfile(p);
          }
        }
      } catch (err) {
        console.warn('Auth initialization exception:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // 2. Realtime listener for auth state changes (SIGN_IN, SIGN_OUT, TOKEN_REFRESH)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);
      const currentUser = newSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const p = await fetchUserProfile(currentUser);
        if (isMounted) setProfile(p);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        const p = await fetchUserProfile(data.user);
        setProfile(p);
      }

      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      phone?: string
    ) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone || null,
            },
          },
        });

        if (error) return { error, user: null };

        if (data.user) {
          if (data.session) {
            setSession(data.session);
            setUser(data.user);
            const p = await fetchUserProfile(data.user);
            setProfile(p);
          }
        }

        return { error: null, user: data.user };
      } catch (err) {
        return { error: err, user: null };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('SignOut exception:', err);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'pocketpos://reset-password',
      });
      return { error };
    } catch (err) {
      return { error: err };
    }
  }, []);

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      profile,
      isLoading,
      isAuthenticated: Boolean(user && session),
      signIn,
      signUp,
      signOut,
      resetPassword,
      refreshProfile,
    }),
    [user, session, profile, isLoading, signIn, signUp, signOut, resetPassword, refreshProfile]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
