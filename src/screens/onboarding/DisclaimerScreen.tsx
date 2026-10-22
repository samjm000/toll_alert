import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FOOTER_IN_SCROLL, footerScrollContent, footerSpacer } from '../../components/webFooter';
import { useLanguage } from '../../i18n';
import { colors, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Disclaimer'>;

/**
 * The text lives in src/i18n/strings.ts (`disclaimer`).
 *
 * Client review (2026-09-24, via Rob): say that the phone must be in the
 * vehicle for the alert to be received. Sam (2026-10-22): make it say plainly
 * that Toll Alert takes no responsibility. The English version was rewritten
 * to do that; it has not been reviewed by a solicitor. The other languages
 * still carry the older wording and are switched off (LANGUAGES_ENABLED).
 */

export function DisclaimerScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [accepted, setAccepted] = useState(false);
  const footer = (
    <PrimaryButton
      label={t.disclaimer.understand}
      disabled={!accepted}
      onPress={() => navigation.navigate('Permissions')}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scroll, footerScrollContent]}>
        <Text style={styles.title}>{t.disclaimer.title}</Text>
        <Card>
          <Text style={styles.disclaimerText}>{t.disclaimer.text}</Text>
        </Card>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => setAccepted((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>{t.disclaimer.checkbox}</Text>
        </Pressable>
        {FOOTER_IN_SCROLL && (
          <>
            <View style={footerSpacer} />
            {footer}
          </>
        )}
      </ScrollView>

      {!FOOTER_IN_SCROLL && footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  scrollView: { flex: 1 },
  scroll: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  disclaimerText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxMark: {
    color: colors.ink,
    fontWeight: '800',
    fontSize: 14,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
});
