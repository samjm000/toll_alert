import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleProp, ViewStyle } from 'react-native';

/**
 * Blinks its children on and off, for anything still waiting to be paid.
 *
 * Client ask (via Rob): "can the toll to be paid flash on and off". Only the
 * app's own screens can do this — a system notification can't be made to
 * flash — so it's used on the unpaid badges and TAP TO PAY prompts in-app,
 * and on the alert preview on the landing page.
 *
 * Fades rather than hard-switching, and never below 25% opacity, so the text
 * stays readable mid-blink. Holds still when the phone's "Reduce motion"
 * setting is on — flashing content is exactly what that setting is for.
 */
export function Flashing({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 450, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.delay(300),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}
