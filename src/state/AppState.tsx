import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { MOCK_CROSSINGS_CONFIG, MOCK_SUBSCRIPTION_CONFIG } from '../config/crossings';
import { geofencing } from '../geofencing';
import { recordDetection } from '../geofencing/detection';
import { Crossing, CrossingEvent } from '../types/crossing';
import { logEvent } from '../diagnostics/log';
import {
  loadCrossingEvents,
  loadMonitoringEnabled,
  markCrossingEventPaid,
  saveMonitoringEnabled,
} from './persistence';
import {
  addPaidActionListener,
  ensureNotificationPermission,
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
   * Real background monitoring (src/geofencing). Persisted across launches
   * and re-armed automatically at startup — see the mount effect below for
   * why that re-arm is load-bearing rather than a convenience.
   */
  backgroundMonitoringEnabled: boolean;
  /** True until the persisted monitoring state has been read back and re-armed. */
  monitoringLoaded: boolean;
  /** Requests location + notification permission and starts/stops the real engine. Resolves false if permission was denied. */
  setBackgroundMonitoringEnabled: (enabled: boolean) => Promise<boolean>;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState>({ status: 'none' });
  const [crossingEvents, setCrossingEvents] = useState<CrossingEvent[]>([]);
  const [backgroundMonitoringEnabled, setBackgroundMonitoringEnabledState] = useState(false);
  const [monitoringLoaded, setMonitoringLoaded] = useState(false);

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

  /**
   * Runs the same shared pipeline the headless background path uses
   * (src/geofencing/detection.ts) and then mirrors the persisted result into
   * React state, so a detection recorded while the app was closed and one
   * recorded while it's open end up identical.
   */
  const recordCrossing = useCallback(async (crossing: Crossing, source: 'geofence' | 'simulated') => {
    const event = await recordDetection(crossing, source);
    setCrossingEvents((prev) => [event, ...prev.filter((e) => e.id !== event.id)]);
  }, []);

  /**
   * Held in a ref so the handler passed to `geofencing.start()` never goes
   * stale. The engine keeps whatever function it was given for the lifetime
   * of the process; handing it a callback that closes over a particular
   * render's state would silently stop working after a re-render.
   */
  const recordCrossingRef = useRef(recordCrossing);
  recordCrossingRef.current = recordCrossing;

  const simulateCrossing = useCallback(
    (crossingId: string) => {
      const crossing = MOCK_CROSSINGS_CONFIG.crossings.find((c) => c.id === crossingId);
      if (!crossing) return;
      recordCrossingRef.current(crossing, 'simulated').catch(() => {});
    },
    []
  );

  const startEngine = useCallback(async () => {
    await geofencing.start(MOCK_CROSSINGS_CONFIG.crossings, (detection) =>
      recordCrossingRef.current(detection.crossing, 'geofence')
    );
  }, []);

  const setBackgroundMonitoringEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (!enabled) {
        await geofencing.stop().catch((e) => logEvent('error', 'app', 'geofencing.stop() threw', String(e)));
        await saveMonitoringEnabled(false);
        setBackgroundMonitoringEnabledState(false);
        return true;
      }

      const granted = await geofencing.requestPermissions();
      if (!granted) {
        await saveMonitoringEnabled(false);
        setBackgroundMonitoringEnabledState(false);
        return false;
      }

      // Asked here, in the foreground, off a deliberate user action — the
      // only place it *can* be asked. A real detection happens in a headless
      // task that cannot show a permission dialog, so leaving this until
      // then (as it used to be) meant a device that had never granted
      // POST_NOTIFICATIONS silently dropped every alert it ever produced.
      const notificationsGranted = await ensureNotificationPermission();
      if (!notificationsGranted) {
        await logEvent(
          'warn',
          'app',
          'Monitoring enabled but notification permission was refused — crossings will be recorded in-app but no alert will be shown'
        );
      }

      try {
        await startEngine();
      } catch (e) {
        await logEvent('error', 'app', 'geofencing.start() threw', String(e));
        await saveMonitoringEnabled(false);
        setBackgroundMonitoringEnabledState(false);
        return false;
      }

      await saveMonitoringEnabled(true);
      setBackgroundMonitoringEnabledState(true);
      return true;
    },
    [startEngine]
  );

  const markPaid = useCallback((eventId: string) => {
    setCrossingEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: 'paid', paidAt: new Date().toISOString() } : e))
    );
    markCrossingEventPaid(eventId).catch(() => {});
  }, []);

  useEffect(() => {
    registerCrossingNotificationCategory().catch(() => {});
    const subscription = addPaidActionListener(markPaid);
    return () => subscription.remove();
  }, [markPaid]);

  /**
   * Restores everything that has to survive a process restart.
   *
   * The re-arm here is the important part. The OS-level geofences registered
   * by `startGeofencingAsync` outlive the app's process, but the JS state
   * that gives them meaning did not: the toggle was `useState(false)` with no
   * persistence and nothing re-ran `start()`, so after any relaunch the UI
   * read "Off" while the OS was still dutifully delivering transitions into
   * an engine with an empty crossing list.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [storedEvents, wasEnabled] = await Promise.all([loadCrossingEvents(), loadMonitoringEnabled()]);
      if (cancelled) return;

      setCrossingEvents(storedEvents);

      if (!wasEnabled) {
        setMonitoringLoaded(true);
        return;
      }

      try {
        await startEngine();
        if (!cancelled) setBackgroundMonitoringEnabledState(true);
        await logEvent('info', 'app', 'Re-armed background monitoring at launch (was enabled before this process started)');
      } catch (e) {
        await logEvent('error', 'app', 'Failed to re-arm background monitoring at launch', String(e));
        if (!cancelled) setBackgroundMonitoringEnabledState(false);
      } finally {
        if (!cancelled) setMonitoringLoaded(true);
      }
    })().catch(() => {
      if (!cancelled) setMonitoringLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [startEngine]);

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
      monitoringLoaded,
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
      monitoringLoaded,
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
