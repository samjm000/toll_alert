import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';
import { useAppState } from '../../state/AppState';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Permissions'>;

/**
 * The last onboarding step, and the one that actually arms the app.
 *
 * It used to end at a "Continue" button that only called
 * `completeOnboarding()`, with a note explaining that permission would be
 * requested "later, from the Settings screen's Background monitoring
 * toggle". That reads as scrupulous, but the effect on a real tester was
 * that they finished setup, saw a Home screen claiming to be watching
 * crossings, and drove over the Dartford Crossing with nothing armed at
 * all — no permission requested, no geofence registered, no alert
 * possible. A setup flow whose last screen says "next you'll see the system
 * permission prompt" and then doesn't show one is worse than no screen.
 *
 * Still opt-in: the prompt only happens off a deliberate button press, and
 * "Not now" leaves everything off with the Settings toggle unchanged.
 */
export function PermissionsScreen(_props: Props) {
  const { completeOnboarding, setBackgroundMonitoringEnabled } = useAppState();
  const [working, setWorking] = useState(false);

  const enableThenContinue = async () => {
    setWorking(true);
    try {
      const enabled = await setBackgroundMonitoringEnabled(true);
      if (!enabled) {
        // Not a dead end — finish onboarding either way and say plainly what
        // the consequence is, rather than trapping the user on this screen.
        Alert.alert(
          'Alerts are off',
          Platform.OS === 'android'
            ? 'Toll Alert needs "Allow all the time" location access to spot a crossing while the app is closed. You can grant it any time from Settings → Background monitoring, and check it worked under Settings → Diagnostics.'
            : 'Toll Alert needs "Always" location access to spot a crossing while the app is closed. You can grant it any time from Settings → Background monitoring.',
          [{ text: 'OK', onPress: completeOnboarding }]
        );
        return;
      }
      completeOnboarding();
    } finally {
      setWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>One last thing</Text>
        <Text style={styles.body}>
          To detect crossings while your phone is in your pocket, Toll Alert needs to check your
          location in the background — including when the app is closed.
        </Text>
        <Card>
          <Text style={styles.cardTitle}>You'll see two or three system prompts next</Text>
          <Text style={styles.cardBody}>
            Please choose{' '}
            <Text style={styles.bold}>"Allow While Using App"</Text>, then{' '}
            <Text style={styles.bold}>{Platform.OS === 'ios' ? '"Change to Always Allow"' : '"Allow all the time"'}</Text>{' '}
            when asked again, and finally <Text style={styles.bold}>allow notifications</Text> — that
            last one is how the alert actually reaches you. Toll Alert only uses this to detect the
            crossings in your config; it doesn't track or store your route.
          </Text>
        </Card>
        <Text style={styles.note}>
          Without background location and notifications, a crossing detected while the app is closed
          can't reach you. You can change either later in Settings.
        </Text>
      </View>
      <View style={styles.actions}>
        <PrimaryButton
          label={working ? 'Setting up…' : 'Turn on crossing alerts'}
          onPress={enableThenContinue}
          disabled={working}
        />
        <PrimaryButton label="Not now" variant="secondary" onPress={completeOnboarding} disabled={working} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  content: {
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  body: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 22,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardBody: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: colors.text,
  },
  note: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
