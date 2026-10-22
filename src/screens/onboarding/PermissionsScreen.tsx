import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { APP_STORE_URL, PLAY_STORE_URL } from '../../config/release';
import { colors, radii, spacing } from '../../theme';
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
/**
 * One lettered instruction (A, B, C), badge plus text. Client ask (2026-10,
 * via Rob): make this page easier to follow, "kind of A, B, C".
 */
function Step({ index, children, isLast }: { index: number; children: React.ReactNode; isLast: boolean }) {
  return (
    <View style={[styles.step, isLast && styles.stepLast]}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{String.fromCharCode(65 + index)}</Text>
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
 * `androidSteps`); bold segments are the OS's own button names, drawn as a
 * yellow button-like chip so they can be matched to the screen by eye. A chip
 * only wraps after a "→", so a long translated path still fits a small phone.
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
        <Text key={i} style={styles.osButton}>
          {`\u00A0${segment.text.replace(/^"|"$/g, '').replace(/ /g, '\u00A0').replace(/→\u00A0/g, '→ ')}\u00A0`}
        </Text>
      ) : (
        segment.text
      )
    )
  );
}

/**
 * Which phone's steps to show. On the web mockup there is no native platform,
 * so it follows the visitor's browser — an iPhone visitor must never see the
 * Android-only "Allow all the time" wording.
 */
function showsAndroidSteps(): boolean {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
  }
  return Platform.OS === 'android';
}

/**
 * The website's version of this page sells the app instead of arming it — a
 * browser can't detect crossings. Opens the store for the visitor's phone,
 * or says "coming soon" until the listings exist (src/config/release.ts).
 */
function DownloadActions({ onSkip, skipLabel }: { onSkip: () => void; skipLabel: string }) {
  const [comingSoon, setComingSoon] = useState(false);
  const download = () => {
    const url = showsAndroidSteps() ? PLAY_STORE_URL : APP_STORE_URL;
    if (url) {
      Linking.openURL(url);
    } else {
      setComingSoon(true);
    }
  };
  return (
    <View style={styles.actions}>
      {comingSoon && (
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonTitle}>Coming soon</Text>
          <Text style={styles.comingSoonBody}>
            Toll Alert will be free to download on Google Play and the App Store shortly.
          </Text>
        </View>
      )}
      <PrimaryButton label="PRESS TO DOWNLOAD FREE" onPress={download} />
      <PrimaryButton label={skipLabel} variant="secondary" onPress={onSkip} />
    </View>
  );
}

export function PermissionsScreen(_props: Props) {
  const { completeOnboarding, setBackgroundMonitoringEnabled } = useAppState();
  const [working, setWorking] = useState(false);
  const { t } = useLanguage();
  const steps = renderSteps(showsAndroidSteps() ? t.permissions.androidSteps : t.permissions.iosSteps);

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
            <Step key={index} index={index} isLast={index === steps.length - 1}>
              {step}
            </Step>
          ))}
          <Text style={styles.cardFootnote}>{t.permissions.footnote}</Text>
        </Card>
      </View>
      {Platform.OS === 'web' ? (
        <DownloadActions onSkip={completeOnboarding} skipLabel={t.permissions.notNow} />
      ) : (
        <View style={styles.actions}>
          <Text style={styles.note}>{t.permissions.note}</Text>
          <PrimaryButton
            label={working ? t.permissions.settingUp : t.permissions.turnOn}
            onPress={enableThenContinue}
            disabled={working}
          />
          <PrimaryButton label={t.permissions.notNow} variant="secondary" onPress={completeOnboarding} disabled={working} />
        </View>
      )}
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Nudges the badge onto the text's first-line baseline rather than the
    // top of its line box, which otherwise reads as slightly too high.
    marginTop: -2,
  },
  stepBadgeText: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.ink,
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
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
  osButton: {
    fontWeight: '800',
    color: colors.ink,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  note: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  comingSoon: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md,
    gap: 4,
  },
  comingSoonTitle: { fontSize: 17, fontWeight: '900', color: colors.primary, textAlign: 'center' },
  comingSoonBody: { fontSize: 14, color: colors.text, textAlign: 'center', lineHeight: 20 },
});
