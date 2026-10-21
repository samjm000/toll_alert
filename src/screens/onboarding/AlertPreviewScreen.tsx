import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Flashing } from '../../components/Flashing';
import { Logo } from '../../components/Logo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useLanguage } from '../../i18n';
import { colors, radii, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'AlertPreview'>;

/**
 * Page 2 of onboarding: what the Dartford alert looks like. Replaces the old
 * "One wrong turn" ULEZ page at the client's request (2026-10, via Rob); the
 * preview used to sit at the bottom of the landing page.
 */
export function AlertPreviewScreen({ navigation }: Props) {
  const { t } = useLanguage();
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} bounces={false}>
        <SafeAreaView edges={['top']} style={styles.topRow}>
          <View style={styles.brandRow}>
            <Logo size={28} />
            <Text style={styles.brandText}>Toll Alert</Text>
          </View>
          <View style={styles.progressDots}>
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
          </View>
        </SafeAreaView>

        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>🔔 {t.welcome.alertPreviewTitle}</Text>
          <View style={styles.notificationCard}>
            <View style={styles.notificationIcon}>
              <Logo size={30} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.notificationHeaderRow}>
                <Text style={styles.notificationApp}>TOLL ALERT</Text>
                <Text style={styles.notificationTime}>{t.welcome.alertNow}</Text>
              </View>
              <Text style={styles.notificationTitle}>{t.welcome.alertTitle('Dartford Crossing')}</Text>
              <Text style={styles.notificationBody}>{t.welcome.alertBody}</Text>
              <Flashing style={styles.tapToPay}>
                <Text style={styles.tapToPayText}>{t.common.tapToPay}</Text>
              </Flashing>
            </View>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <PrimaryButton label={t.alertPreview.getStarted} onPress={() => navigation.navigate('HowItWorks')} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brandText: { fontSize: 15, fontWeight: '800', color: colors.text },
  progressDots: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 20, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressDotActive: { backgroundColor: colors.primary },
  previewSection: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  notificationCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(8, 6, 4, 0.97)',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  notificationIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notificationApp: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textOnDarkMuted,
    letterSpacing: 0.5,
  },
  notificationTime: {
    fontSize: 10,
    color: colors.textOnDarkMuted,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textOnDark,
    marginTop: 2,
  },
  notificationBody: {
    fontSize: 13,
    color: colors.textOnDarkMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  tapToPay: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
  },
  tapToPayText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.ink,
    letterSpacing: 0.5,
  },
});
