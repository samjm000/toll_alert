import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { colors, radii, spacing } from '../theme';
import { LANGUAGE_CODES, STRINGS, useLanguage } from '../i18n';

/**
 * A "🌐 English" chip that opens a sheet listing every language, each shown
 * in its own name so someone who can't read the current one can still find
 * theirs.
 */
export function LanguageButton() {
  const { language, t, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.chip}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t.common.chooseLanguage}
      >
        <Text style={styles.chipText}>🌐 {t.languageName}</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.title}>{t.common.chooseLanguage}</Text>
            {LANGUAGE_CODES.map((code) => (
              <Pressable
                key={code}
                onPress={() => {
                  setLanguage(code);
                  setOpen(false);
                }}
                style={[styles.option, code === language && styles.optionSelected]}
                accessibilityRole="radio"
                accessibilityState={{ checked: code === language }}
              >
                <Text style={[styles.optionText, code === language && styles.optionTextSelected]}>
                  {STRINGS[code].languageName}
                </Text>
                {code === language && <Text style={styles.optionTextSelected}>✓</Text>}
              </Pressable>
            ))}
            <PrimaryButton label={t.common.cancel} variant="secondary" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.text },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionSelected: { backgroundColor: colors.primarySoftBg, borderColor: colors.primary },
  optionText: { fontSize: 16, fontWeight: '700', color: colors.text },
  optionTextSelected: { fontSize: 16, fontWeight: '800', color: colors.primary },
});
