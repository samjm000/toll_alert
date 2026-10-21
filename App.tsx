import { StatusBar } from 'expo-status-bar';
import { DarkTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from './src/state/AppState';
import { MOCK_CROSSINGS_CONFIG } from './src/config/crossings';
import { LanguageProvider } from './src/i18n';
import { registerCrossingNotificationCategory } from './src/notifications';
import { syncReminders } from './src/notifications/reminders';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

/**
 * Anything already handed to the OS was written in the old language: the
 * repeating unpaid reminders keep the text they were scheduled with, and the
 * "Mark as paid" button label belongs to the registered category. Both are
 * rewritten when the language changes.
 */
function onLanguageChange() {
  registerCrossingNotificationCategory().catch(() => {});
  syncReminders(MOCK_CROSSINGS_CONFIG.crossings).catch(() => {});
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider onChange={onLanguageChange}>
        <AppStateProvider>
          {/* Web tab title. React Navigation's default uses the route name, which
              is undefined while the app is still loading — the site showed "undefined". */}
          <NavigationContainer
            theme={navigationTheme}
            documentTitle={{ formatter: (options) => (options?.title ? `${options.title} · Toll Alert` : 'Toll Alert') }}
          >
            <RootNavigator />
            <StatusBar style="light" />
          </NavigationContainer>
        </AppStateProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
