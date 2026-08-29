import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing } from '../../theme';
import { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Disclaimer'>;

/**
 * PLACEHOLDER LEGAL COPY — not final.
 * This wording must be reviewed and signed off by a solicitor before this
 * screen ships to production. Do not treat this text as legal advice.
 */
const DISCLAIMER_TEXT =
  'This app is a reminder tool, not a guarantee. Detection can fail — GPS can lose signal ' +
  '(e.g. in tunnels), notifications can be delayed or silenced by your phone’s operating ' +
  'system, and background processes can be stopped by the OS to save battery. You are fully ' +
  'responsible for paying your own tolls and charges regardless of whether you receive an ' +
  'alert from this app.';

export function DisclaimerScreen({ navigation }: Props) {
  const [accepted, setAccepted] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Before you continue</Text>
        <Card>
          <Text style={styles.disclaimerText}>{DISCLAIMER_TEXT}</Text>
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
          <Text style={styles.checkboxLabel}>
            I understand this app is a reminder only, and that paying tolls and charges is my
            responsibility.
          </Text>
        </Pressable>
      </ScrollView>

      <PrimaryButton
        label="I understand"
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
    borderColor: colors.primaryDeep,
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
