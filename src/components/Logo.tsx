import { Image, StyleSheet } from 'react-native';

interface Props {
  size?: number;
  /** 'badge' = compact bell-only circular mark (headers, nav). 'full' = detailed square icon (hero moments). */
  variant?: 'badge' | 'full';
}

const SOURCES = {
  badge: require('../../assets/logo-mark.png'),
  full: require('../../assets/icon.png'),
};

export function Logo({ size = 40, variant = 'badge' }: Props) {
  return (
    <Image
      source={SOURCES[variant]}
      style={[styles.image, { width: size, height: size }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  image: {},
});
