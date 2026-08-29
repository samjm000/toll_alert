import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../theme';

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

const toneStyles: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.border, fg: colors.textMuted },
  success: { bg: colors.successBg, fg: colors.success },
  warning: { bg: colors.warningBg, fg: colors.warning },
  danger: { bg: colors.dangerBg, fg: colors.danger },
};

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
