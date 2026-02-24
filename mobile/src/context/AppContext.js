/**
 * AppContext — global state for profile, theme, and auth
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, getProfile, upsertProfile } from '../services/supabase';
import { cacheProfile, getCachedProfile } from '../services/storage';
import { calculateTargets } from '../utils/tdee';

const AppContext = createContext(null);

export const DARK_THEME = {
  bg: '#0f172a',
  card: '#1e293b',
  cardAlt: '#263248',
  border: '#334155',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#22c55e',
  primaryDark: '#16a34a',
  accent: '#3b82f6',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
  surface: '#1a2744',
};

export const LIGHT_THEME = {
  bg: '#f8fafc',
  card: '#ffffff',
  cardAlt: '#f1f5f9',
  border: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  primary: '#16a34a',
  primaryDark: '#15803d',
  accent: '#2563eb',
  danger: '#dc2626',
  warning: '#d97706',
  success: '#16a34a',
  surface: '#e8f5e9',
};

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [themeName, setThemeName] = useState('dark');
  const theme = themeName === 'dark' ? DARK_THEME : LIGHT_THEME;

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load profile when session changes
  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    loadProfile(session.user.id);
  }, [session]);

  const loadProfile = useCallback(async (userId) => {
    setLoading(true);
    try {
      // Try cache first for instant render
      const cached = await getCachedProfile();
      if (cached) { setProfile(cached); setThemeName(cached.theme || 'dark'); }

      // Then fetch fresh from Supabase
      const fresh = await getProfile(userId);
      if (fresh) {
        setProfile(fresh);
        setThemeName(fresh.theme || 'dark');
        await cacheProfile(fresh);
      }
    } catch (err) {
      console.error('Load profile error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!session?.user) return;
    try {
      // If weight/height/age/sex/activity changed, recalculate targets
      const needsRecalc = ['weight_kg','height_cm','age','sex','activity_level','goal_primary','diet_style'].some(
        k => updates[k] !== undefined
      );
      let finalUpdates = { ...updates };
      if (needsRecalc) {
        const merged = { ...profile, ...updates };
        const targets = calculateTargets(merged);
        finalUpdates = { ...finalUpdates, ...targets };
      }

      const saved = await upsertProfile(session.user.id, finalUpdates);
      setProfile(saved);
      setThemeName(saved.theme || 'dark');
      await cacheProfile(saved);
      return saved;
    } catch (err) {
      console.error('Update profile error:', err);
      throw err;
    }
  }, [session, profile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  return (
    <AppContext.Provider value={{
      session,
      profile,
      loading,
      theme,
      themeName,
      setThemeName: (name) => { setThemeName(name); updateProfile({ theme: name }); },
      updateProfile,
      loadProfile: () => session?.user && loadProfile(session.user.id),
      signOut,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
