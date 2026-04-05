import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

export const usePushNotifications = () => {
  useEffect(() => {
    const registerToken = async () => {
      try {
        if (!Capacitor.isNativePlatform()) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== 'granted') return;

        await PushNotifications.register();

        await PushNotifications.addListener('registration', async (token) => {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) return;

          await supabase
            .from('user_fcm_tokens')
            .upsert({
              user_id: currentUser.id,
              fcm_token: token.value,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        });

        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Notification reçue:', notification);
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Notification cliquée:', action);
        });

      } catch (error) {
        console.error('Error initializing push notifications:', error);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        PushNotifications.removeAllListeners().then(() => {
          registerToken();
        });
      }
    });

    registerToken();

    return () => {
      subscription.unsubscribe();
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, []);

  return {};
};