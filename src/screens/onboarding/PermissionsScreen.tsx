import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';
import { useAppState } from '../../state/AppState';
import { Segment, useLanguage } from '../../i18n';

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
 * The wording is in src/i18n/strings.ts (`permissions.iosSteps` /
 * `androidSteps`); bold segments are the OS's own button names.
 *
 * Android 11+ does NOT show a dialog for background location:
 * expo-location's `requestBackgroundPermissionsAsync` opens the system
 * settings page instead. Describing that as a prompt sends the user looking
 * for a popup that never appears.
 */
function renderSteps(steps: Segment[][]): React.ReactNode[] {
  return steps.map((segments) =>
    segments.map((segment, i) =>
      segment.bold ? (
        <Text key={i} style={styles.bold}>
          {segment.text}
        </Text>
      ) : (
        segment.text
      )
    )
  );
}

export function PermissionsScreen(_props: Props) {
  const { completeOnboarding, setBackgroundMonitoringEnabled } = useAppState();
  const [working, setWorking] = useState(false);
  const { t } = useLanguage();
  const steps = renderSteps(Platform.OS === 'ios' ? t.permissions.iosSteps : t.permissions.androidSteps);

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
          Platform.OS === 'android' ? t.permissions.androidAlertTitle : t.permissions.iosAlertTitle,
          Platform.OS === 'android' ? t.permissions.androidAlertBody : t.permissions.iosAlertBody,
          [{ text: t.permissions.ok, onPress: completeOnboarding }]
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
        <Text style={styles.title}>{t.permissions.title}</Text>
        <Text style={styles.body}>{t.permissions.body}</Text>
        <Card>
          <Text style={styles.cardTitle}>{t.permissions.cardTitle}</Text>
          {steps.map((step, index) => (
            <Step key={index} number={index + 1} isLast={index === steps.length - 1}>
              {step}
            </Step>
          ))}
          <Text style={styles.cardFootnote}>{t.permissions.footnote}</Text>
        </Card>
      </View>
      <View style={styles.actions}>
        <Text style={styles.note}>{t.permissions.note}</Text>
        <PrimaryButton
          label={working ? t.permissions.settingUp : t.permissions.turnOn}
          onPress={enableThenContinue}
          disabled={working}
        />
        <PrimaryButton label={t.permissions.notNow} variant="secondary" onPress={completeOnboarding} disabled={working} />
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
