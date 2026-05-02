import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface AppHeaderProps {
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

const NAV_HEIGHT = 56;

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
            style={[
              styles.logoImg,
              // React Native Web pasa estas props directamente al <img> como CSS.
              // object-fit:cover + object-position:center centra el logo correctamente.
              { objectFit: 'cover', objectPosition: 'center 35%' } as any,
            ]}
            resizeMode="cover"
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    width: '50%',
    height: '50%',
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 28, color: colors.primary, fontWeight: '300', lineHeight: 28 },
});
