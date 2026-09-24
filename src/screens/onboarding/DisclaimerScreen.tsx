import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useLanguage } from '../../i18n';
import { colors, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Disclaimer'>;

/**
 * PLACEHOLDER LEGAL COPY — not final. The text lives in src/i18n/strings.ts
 * (`disclaimer`), in every language the app offers.
 * This wording must be reviewed and signed off by a solicitor before this
 * screen ships to production, and each translation checked by a native
 * speaker. Do not treat this text as legal advice.
 *
 * Client review (2026-09-24, via Rob): keep as it is, but say that the phone
 * must be in the vehicle for the alert to be received.
 */

export function DisclaimerScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const [accepted, setAccepted] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
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
      </ScrollView>

      <PrimaryButton
        label={t.disclaimer.understand}
        disabled={!accepted}
        onPress={() => navigation.navigate('Permissions')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
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
