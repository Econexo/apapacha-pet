import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface AppHeaderProps {
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

const CONTENT_HEIGHT = 64;

export function AppHeader({ onBack, rightElement }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const totalHeight = insets.top + CONTENT_HEIGHT;

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      <Image
        source={require('../../assets/LogoHeader.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <View style={[styles.nav, { paddingTop: insets.top }]}>
        <View style={styles.side}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={{ flex: 1 }} />
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
    overflow: 'hidden',
  },
  nav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  side: { width: 52, alignItems: 'center', justifyContent: 'center' },
  backBtn: { padding: 4 },
  backText: { fontSize: 28, color: colors.primary, fontWeight: '300', lineHeight: 28 },
});
