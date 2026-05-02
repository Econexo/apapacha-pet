import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface AppHeaderProps {
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

const NAV_HEIGHT = 56;
// La imagen LogoHeader.png es 1485×1485. El logo ocupa la banda central.
// Renderizamos la imagen a IMG_HEIGHT píxeles de alto (cuadrada) y la
// centramos dentro de NAV_HEIGHT usando top negativo. overflow:hidden recorta.
const IMG_HEIGHT = 300;
const IMG_OFFSET = -Math.round((IMG_HEIGHT - NAV_HEIGHT) / 2); // -122

export function AppHeader({ onBack, rightElement }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <View style={styles.side}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/LogoHeader.png')}
            style={[styles.logoImg, { top: IMG_OFFSET }]}
            resizeMode="contain"
          />
        </View>
        <View style={styles.side}>
          {rightElement ?? null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  nav: {
    height: NAV_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  side: { width: 52, alignItems: 'center', justifyContent: 'center' },
  logoWrap: {
    flex: 1,
    height: NAV_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  logoImg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: IMG_HEIGHT,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 28, color: colors.primary, fontWeight: '300', lineHeight: 28 },
});
