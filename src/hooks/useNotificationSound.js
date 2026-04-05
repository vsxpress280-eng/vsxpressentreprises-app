import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const DEFAULT_SOUND_AGENT = 'cash';
export const DEFAULT_SOUND_ADMIN = 'admin';

export const NOTIFICATION_SOUNDS = [
  { 
    id: 'cash', 
    label: '💰 Cash', 
    url: 'https://mstuvrnnfsjomlzrakwp.supabase.co/storage/v1/object/sign/notification-sounds/2869-preview.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84ZjdkNjZmZi00MzBmLTRhYjgtYjA4MS00NDMwMjA0OWE5MDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJub3RpZmljYXRpb24tc291bmRzLzI4NjktcHJldmlldy5tcDMiLCJpYXQiOjE3NzUwMDM2MTcsImV4cCI6MzMzMTEwMDM2MTd9.08J5esYxLp202PN0bJ6aeTrRRpgag-8hMd1Li30ASus'
  },
  { 
    id: 'chime', 
    label: '🎵 Chime', 
    url: 'https://mstuvrnnfsjomlzrakwp.supabase.co/storage/v1/object/sign/notification-sounds/2865-preview.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84ZjdkNjZmZi00MzBmLTRhYjgtYjA4MS00NDMwMjA0OWE5MDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJub3RpZmljYXRpb24tc291bmRzLzI4NjUtcHJldmlldy5tcDMiLCJpYXQiOjE3NzUwMDMzNDksImV4cCI6MTg2MTQwMzM0OX0.HfBbzs9Y5p3vDkqVPlQv6NsNoH1j3KjaNgQMKaR9EjY'
  },
  { 
    id: 'ding', 
    label: '🔔 Ding', 
    url: 'https://mstuvrnnfsjomlzrakwp.supabase.co/storage/v1/object/sign/notification-sounds/2868-preview.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84ZjdkNjZmZi00MzBmLTRhYjgtYjA4MS00NDMwMjA0OWE5MDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJub3RpZmljYXRpb24tc291bmRzLzI4NjgtcHJldmlldy5tcDMiLCJpYXQiOjE3NzUwMDMyOTUsImV4cCI6MTg2MTQwMzI5NX0.-Q6SsYd803RyCOxI-WUSa_vij7Gm-kMUxFzY2FDvG6E'
  },
  { 
    id: 'alerte', 
    label: '⚡ Alerte', 
    url: 'https://mstuvrnnfsjomlzrakwp.supabase.co/storage/v1/object/sign/notification-sounds/2867-preview.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84ZjdkNjZmZi00MzBmLTRhYjgtYjA4MS00NDMwMjA0OWE5MDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJub3RpZmljYXRpb24tc291bmRzLzI4NjctcHJldmlldy5tcDMiLCJpYXQiOjE3NzUwMDMzMTMsImV4cCI6MTg2MTQwMzMxM30.bdPkqjtDAHj2sZe2wgaZG45K5Z9HFUVuWbvSDaFr_pU'
  },
  { 
    id: 'pulse', 
    label: '📳 Pulse', 
    url: 'https://mstuvrnnfsjomlzrakwp.supabase.co/storage/v1/object/sign/notification-sounds/2866-preview.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84ZjdkNjZmZi00MzBmLTRhYjgtYjA4MS00NDMwMjA0OWE5MDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJub3RpZmljYXRpb24tc291bmRzLzI4NjYtcHJldmlldy5tcDMiLCJpYXQiOjE3NzUwMDMzMzAsImV4cCI6MTg2MTQwMzMzMH0.IqCKUaF1qGzyg2yjDk4StA-9CedbJXhpZ77LeaB5Pbs'
  },
  { 
    id: 'admin', 
    label: '🛡️ Admin', 
    url: 'https://mstuvrnnfsjomlzrakwp.supabase.co/storage/v1/object/sign/notification-sounds/admin_order.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84ZjdkNjZmZi00MzBmLTRhYjgtYjA4MS00NDMwMjA0OWE5MDEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJub3RpZmljYXRpb24tc291bmRzL2FkbWluX29yZGVyLm1wMyIsImlhdCI6MTc3NTAwNjI0NywiZXhwIjoxODYxNDA2MjQ3fQ.VvOI5lOnZKtvfKK1-v1MZ1dIYNzgrPVJKGnCtBGK11w'
  }
];

export const playSound = (soundId) => {
  const sound = NOTIFICATION_SOUNDS.find((s) => s.id === soundId) || NOTIFICATION_SOUNDS[0];
  if (sound) {
    const audio = new Audio(sound.url);
    audio.play().catch((err) => console.error("Error playing sound:", err));
  }
};

export const getUserSound = async (userId) => {
  if (!userId) return DEFAULT_SOUND_AGENT;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('notification_sound')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data?.notification_sound || DEFAULT_SOUND_AGENT;
  } catch (error) {
    console.error('Error fetching user sound:', error);
    return DEFAULT_SOUND_AGENT;
  }
};

export const saveUserSound = async (userId, soundId) => {
  if (!userId) return false;
  try {
    const { error } = await supabase
      .from('users')
      .update({ notification_sound: soundId })
      .eq('id', userId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving user sound:', error);
    return false;
  }
};

export const useNotificationSound = (userId) => {
  const playNotification = useCallback(async () => {
    if (!userId) {
      playSound(DEFAULT_SOUND_AGENT);
      return;
    }
    const soundId = await getUserSound(userId);
    playSound(soundId);
  }, [userId]);

  return { playNotification };
};