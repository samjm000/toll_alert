import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MOCK_CROSSINGS_CONFIG, MOCK_SUBSCRIPTION_CONFIG } from '../config/crossings';
import { geofencing } from '../geofencing';
import { Crossing, CrossingEvent } from '../types/crossing';
import {
  addPaidActionListener,
  presentCrossingNotification,
  registerCrossingNotificationCategory,
} from '../notifications';

const ONBOARDING_KEY = 'tollalert.onboardingComplete.v1';

export type SubscriptionStatus = 'none' | 'active' | 'expired';

interface SubscriptionState {
  status: SubscriptionStatus;
  /** ISO date. Only meaningful when status is 'active' or 'expired'. */
  expiresAt?: string;
}

interface AppState {
  onboardingComplete: boolean;
  onboardingLoaded: boolean;
  completeOnboarding: () => void;
  /** DEMO ONLY — lets testers replay the intro flow without clearing browser/app storage. */
  resetOnboarding: () => void;

  subscription: SubscriptionState;
  /** DEMO ONLY — stands in for a completed StoreKit / Play Billing purchase. */
  mockSubscribe: () => void;
  /** DEMO ONLY — lets the mockup show the lapsed-reminder state without waiting a year. */
  mockExpireSubscription: () => void;

  crossingEvents: CrossingEvent[];
  /** DEMO ONLY — stands in for the background geofencing engine firing a local notification. */
  simulateCrossing: (crossingId: string) => void;
  markPaid: (eventId: string) => void;

  /**
   * Real background monitoring (src/geofencing) — off by default. This
   * calls the actual region-monitoring engine, not the demo button above;
   * it needs a custom-dev-client build on a real device to do anything
   * (won't run under Expo Go or the web preview). See src/geofencing/README.md.
   */
  backgroundMonitoringEnabled: boolean;
  /** Requests location permission and starts/stops the real engine. Resolves false if permission was denied. */
  setBackgroundMonitoringEnabled: (enabled: boolean) => Promise<boolean>;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState>({ status: 'none' });
  const [crossingEvents, setCrossingEvents] = useState<CrossingEvent[]>([]);
  const [backgroundMonitoringEnabled, setBackgroundMonitoringEnabledState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => setOnboardingComplete(value === 'true'))
      .finally(() => setOnboardingLoaded(true));
  }, []);

  const completeOnboarding = useCallback(() => {
    setOnboardingComplete(true);
    AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
  }, []);

  const resetOnboarding = useCallback(() => {
    setOnboardingComplete(false);
    AsyncStorage.removeItem(ONBOARDING_KEY).catch(() => {});
  }, []);

  const mockSubscribe = useCallback(() => {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    setSubscription({ status: 'active', expiresAt: expires.toISOString() });
  }, []);

  const mockExpireSubscription = useCallback(() => {
    const expired = new Date();
    expired.setDate(expired.getDate() - 1);
    setSubscription({ status: 'expired', expiresAt: expired.toISOString() });
  }, []);

  const recordCrossing = useCallback((crossing: Crossing) => {
    const eventId = `${crossing.id}-${Date.now()}`;
    setCrossingEvents((prev) => [
      {
        id: eventId,
        crossingId: crossing.id,
        detectedAt: new Date().toISOString(),
        status: 'pending',
      },
      ...prev,
    ]);
    presentCrossingNotification(crossing, eventId).catch(() => {});
  }, []);

  const simulateCrossing = useCallback(
    (crossingId: string) => {
      const crossing = MOCK_CROSSINGS_CONFIG.crossings.find((c) => c.id === crossingId);
      if (!crossing) return;
      recordCrossing(crossing);
    },
    [recordCrossing]
  );

  const setBackgroundMonitoringEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (!enabled) {
        await geofencing.stop().catch(() => {});
        setBackgroundMonitoringEnabledState(false);
        return true;
      }
      const granted = await geofencing.requestPermissions();
      if (!granted) {
        setBackgroundMonitoringEnabledState(false);
        return false;
      }
      await geofencing.start(MOCK_CROSSINGS_CONFIG.crossings, (detection) => recordCrossing(detection.crossing));
      setBackgroundMonitoringEnabledState(true);
      return true;
    },
    [recordCrossing]
  );

  const markPaid = useCallback((eventId: string) => {
    setCrossingEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: 'paid', paidAt: new Date().toISOString() } : e))
    );
  }, []);

  useEffect(() => {
    registerCrossingNotificationCategory().catch(() => {});
    const subscription = addPaidActionListener(markPaid);
    return () => subscription.remove();
  }, [markPaid]);

  const value = useMemo<AppState>(
    () => ({
      onboardingComplete,
      onboardingLoaded,
      completeOnboarding,
      resetOnboarding,
      subscription,
      mockSubscribe,
      mockExpireSubscription,
      crossingEvents,
      simulateCrossing,
      markPaid,
      backgroundMonitoringEnabled,
      setBackgroundMonitoringEnabled,
    }),
    [
      onboardingComplete,
      onboardingLoaded,
      completeOnboarding,
      resetOnboarding,
      subscription,
      mockSubscribe,
      mockExpireSubscription,
      crossingEvents,
      simulateCrossing,
      markPaid,
      backgroundMonitoringEnabled,
      setBackgroundMonitoringEnabled,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}

export const subscriptionConfig = MOCK_SUBSCRIPTION_CONFIG;
