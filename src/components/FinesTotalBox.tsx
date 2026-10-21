import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { TOLL_FINES_PULSE_MS, tollFinesHeadline } from '../config/fineStats';
import { colors, radii, spacing } from '../theme';
import { useReduceMotion } from './useReduceMotion';

/**
 * The landing page's fines box: one combined annual total, in red, that
 * fades down and back up every TOLL_FINES_PULSE_MS. A fade rather than a hard
 * blink, never below 25% opacity so it stays readable, and static when the
 * phone's "Reduce motion" setting is on.
 */
export function FinesTotalBox() {
  const opacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    let pulse: Animated.CompositeAnimation | undefined;
    const interval = setInterval(() => {
      pulse = Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 450, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]);
      pulse.start();
    }, TOLL_FINES_PULSE_MS);
    return () => {
      clearInterval(interval);
      pulse?.stop();
      opacity.setValue(1);
    };
  }, [opacity, reduceMotion]);

  return (
    <View style={styles.box}>
      <Animated.Text style={[styles.text, { opacity }]} accessibilityRole="header">
        {tollFinesHeadline()}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.danger,
    padding: spacing.lg,
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.danger,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 30,
  },
});
