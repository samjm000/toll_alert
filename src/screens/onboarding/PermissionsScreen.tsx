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
/** One numbered instruction, badge plus text, in the "What happens next" card. */
function Step({ number, children, isLast }: { number: number; children: React.ReactNode; isLast: boolean }) {
  return (
    <View style={[styles.step, isLast && styles.stepLast]}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{children}</Text>
    </View>
  );
}

/**
 * The prompts the user is about to see, one per step, in the order the OS
 * shows them. Written as discrete numbered actions rather than a paragraph
 * because a non-technical tester has to follow them while system dialogs are
 * covering the screen — and because step 2 on Android is the one people miss.
 *
 * A function rather than a module-level const: these read `styles`, which is
 * initialised at the bottom of the file, so evaluating them at module load
 * would hit the temporal dead zone.
 *
 * Android 11+ does NOT show a dialog for background location:
 * expo-location's `requestBackgroundPermissionsAsync` opens the system
 * settings page instead. Describing that as a prompt sends the user looking
 * for a popup that never appears.
 */
function getSteps(): React.ReactNode[] {
  return Platform.OS === 'ios'
    ? [
        <>
          Tap <Text style={styles.bold}>"Allow While Using App"</Text> on the location prompt.
        </>,
        <>
          iOS will ask a second time — choose{' '}
          <Text style={styles.bold}>"Change to Always Allow"</Text>.
        </>,
        <>
          Tap <Text style={styles.bold}>Allow</Text> on the notifications prompt. That's how the
          alert actually reaches you.
        </>,
      ]
    : [
        <>
          Tap <Text style={styles.bold}>"While using the app"</Text> on the location popup.
        </>,
        <>
          Android then opens your <Text style={styles.bold}>Settings page</Text>, not another
          popup. Go to <Text style={styles.bold}>Permissions → Location</Text>, choose{' '}
          <Text style={styles.bold}>"Allow all the time"</Text>, then come back here — Toll Alert
          will switch itself on.
        </>,
        <>
          Tap <Text style={styles.bold}>Allow</Text> on the notifications prompt. That's how the
          alert actually reaches you.
        </>,
      ];
}

export function PermissionsScreen(_props: Props) {
  const { completeOnboarding, setBackgroundMonitoringEnabled } = useAppState();
  const [working, setWorking] = useState(false);
  const steps = getSteps();

  const enableThenContinue = async () => {
    setWorking(true);
    try {
      const enabled = await setBackgroundMonitoringEnabled(true);
      if (!enabled) {
        // Not a dead end — finish onboarding either way and say plainly what
        // the consequence is, rather than trapping the user on this screen.
        // NOT necessarily a refusal on Android 11+: the background-location
        // request opens the system settings page and resolves immediately,
        // so this runs while the user is still on that page. AppState's
        // foreground-resume check picks the permission up when they come
        // back, which is why this wording asks them to finish rather than
        // telling them they denied it.
        Alert.alert(
          Platform.OS === 'android' ? 'One step left' : 'Alerts are off',
          Platform.OS === 'android'
            ? 'If your phone opened its Settings page, choose Permissions → Location → "Allow all the time", then come back here — Toll Alert will switch itself on. Without it, a crossing can\'t be spotted while the app is closed. You can check it worked under Settings → Diagnostics.'
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
          <Text style={styles.cardTitle}>What happens next</Text>
          {steps.map((step, index) => (
            <Step key={index} number={index + 1} isLast={index === steps.length - 1}>
              {step}
            </Step>
          ))}
          <Text style={styles.cardFootnote}>
            Toll Alert only uses this to detect the crossings in your list. It doesn't track or
            store your route.
          </Text>
        </Card>
      </View>
      <View style={styles.actions}>
        <Text style={styles.note}>
          Without background location and notifications, a crossing detected while the app is closed
          can't reach you. You can change either later in Settings.
        </Text>
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
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stepLast: {
    marginBottom: spacing.sm,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primarySoftBg,
    alignItems: 'center',
    justifyContent: 'center',
    // Nudges the badge onto the text's first-line baseline rather than the
    // top of its line box, which otherwise reads as slightly too high.
    marginTop: 1,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  cardFootnote: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    fontStyle: 'italic',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
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
    marginBottom: spacing.md,
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
