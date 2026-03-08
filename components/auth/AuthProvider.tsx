// components/auth/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type UserRole = 'owner' | 'manager' | 'staff' | null;

interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  business_id: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signInWithMagicLink: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateProfile: (data: Partial<AuthUser>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [supabase] = useState(() => {
    if (typeof window === 'undefined') return null as unknown as ReturnType<typeof createClient>
    return createClient()
  });

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Fetch user business association with role
          const { data: userBusiness } = await supabase
            .from('user_businesses')
            .select('role, business_id')
            .eq('user_id', session.user.id)
            .single();
          
          if (userBusiness) {
            setUser({
              id: session.user.id,
              email: session.user.email!,
              full_name: session.user.user_metadata?.full_name || null,
              role: userBusiness.role,
              business_id: userBusiness.business_id,
              avatar_url: session.user.user_metadata?.avatar_url || null
            });
          } else {
            // User has no business association yet
            setUser({
              id: session.user.id,
              email: session.user.email!,
              full_name: session.user.user_metadata?.full_name || null,
              role: null,
              business_id: null,
              avatar_url: session.user.user_metadata?.avatar_url || null
            });
          }
        } else {
          setUser(null);
        }
        
        setIsLoading(false);
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        // Fetch initial user business association
        supabase
          .from('user_businesses')
          .select('role, business_id')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data: userBusiness }) => {
            if (userBusiness) {
              setUser({
                id: session.user.id,
                email: session.user.email!,
                full_name: session.user.user_metadata?.full_name || null,
                role: userBusiness.role,
                business_id: userBusiness.business_id,
                avatar_url: session.user.user_metadata?.avatar_url || null
              });
            } else {
              // User has no business association yet
              setUser({
                id: session.user.id,
                email: session.user.email!,
                full_name: session.user.user_metadata?.full_name || null,
                role: null,
                business_id: null,
                avatar_url: session.user.user_metadata?.avatar_url || null
              });
            }
          });
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signInWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    try {
      await fetch('/api/signout', { method: 'POST' }).catch(() => {})
    } catch {}
    await supabase.auth.signOut();
    setUser(null);
    router.push('/auth/signin');
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    return { error };
  };

  const updateProfile = async (data: Partial<AuthUser>) => {
    if (!user) return { error: new Error('No user logged in') };
    
    const updates = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error) {
      setUser({ ...user, ...data });
    }

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signUp,
        signInWithMagicLink,
        signOut,
        resetPassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};