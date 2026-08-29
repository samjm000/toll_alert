import { Image, StyleSheet } from 'react-native';

interface Props {
  size?: number;
  variant?: 'brand' | 'white';
}

const SOURCES = {
  brand: require('../../assets/logo-mark.png'),
  white: require('../../assets/logo-mark-white.png'),
};

export function Logo({ size = 40, variant = 'brand' }: Props) {
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
