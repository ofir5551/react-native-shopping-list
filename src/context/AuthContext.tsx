import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

type AuthContextType = {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    isLoading: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    setSession(session);
                    setUser(session.user);
                } else {
                    // No existing session — sign in anonymously so every user
                    // has a valid JWT (needed for AI rate limiting).
                    // The resulting session arrives via onAuthStateChange below.
                    await supabase.auth.signInAnonymously();
                }
            } catch {
                // Supabase unreachable — continue without a session
            } finally {
                setIsLoading(false);
            }
        };
        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            // After a real sign-out, get a fresh anonymous session so the user
            // always has a JWT for AI features even without an account.
            if (event === 'SIGNED_OUT') {
                supabase.auth.signInAnonymously().catch(() => {});
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, session, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
