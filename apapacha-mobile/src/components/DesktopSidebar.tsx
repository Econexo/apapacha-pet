import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Image, Easing } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii } from '../theme/design';
import { useReducedMotion } from '../hooks/useMotion';
import { TAB_ICONS } from './tabIcons';

// Escala de espaciado (base 4). El menú lateral respira: los ítems van juntos
// entre sí y muy separados de la marca y del pie, que es lo que da jerarquía.
const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
const SIDEBAR_WIDTH = 260;

interface Props extends BottomTabBarProps {
  unreadMessages?: number;
}

export function DesktopSidebar({ state, descriptors, navigation, unreadMessages = 0 }: Props) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <Image source={require('../../assets/Logo.png')} style={styles.logo} resizeMode="contain" />
        <View>
          <Text style={styles.brandName}>ApapachaPet</Text>
          <Text style={styles.brandTag}>Hospitalidad felina</Text>
        </View>
      </View>

      <View style={styles.nav}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = (options.title ?? route.name) as string;
          const badge = route.name === 'Inbox' ? unreadMessages : 0;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
          };

          return (
            <SidebarItem
              key={route.key}
              label={label}
              routeName={route.name}
              focused={focused}
              badge={badge}
              onPress={onPress}
            />
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Cuidado premium para gatos</Text>
      </View>
    </View>
  );
}

function SidebarItem({ label, routeName, focused, badge, onPress }: {
  label: string;
  routeName: string;
  focused: boolean;
  badge: number;
  onPress: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const activo = useRef(new Animated.Value(focused ? 1 : 0)).current;
  const hover = useRef(new Animated.Value(0)).current;

  // La animación comunica estado (selección y hover), no decora: 180 ms, sin
  // rebote, y sin movimiento alguno si el sistema pide reducirlo.
  useEffect(() => {
    if (reducedMotion) { activo.setValue(focused ? 1 : 0); return; }
    Animated.timing(activo, {
      toValue: focused ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [focused, reducedMotion, activo]);

  const animarHover = (to: number) => {
    if (reducedMotion) { hover.setValue(to); return; }
    Animated.timing(hover, { toValue: to, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  };

  const icons = TAB_ICONS[routeName];
  const fondo = Animated.add(
    activo.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
    hover.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }),
  ).interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => animarHover(1)}
      onHoverOut={() => animarHover(0)}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      style={styles.item}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.itemFondo, { opacity: fondo }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.indicador, {
          opacity: activo,
          transform: [{ scaleY: activo.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
        }]}
      />
      {icons && (
        <Ionicons
          name={focused ? icons.active : icons.inactive}
          size={21}
          color={focused ? colors.primaryDark : colors.textMuted}
        />
      )}
      <Text style={[styles.itemLabel, focused && styles.itemLabelActivo]} numberOfLines={1}>{label}</Text>
      {badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Capa neutra propia del panel: se distingue del fondo del contenido.
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: S.md,
    paddingTop: S.xxl,
    paddingBottom: S.xl,
  },

  brand: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.sm, marginBottom: S.xxl },
  logo: { width: 38, height: 38, borderRadius: radii.sm },
  brandName: { fontFamily: fonts.display, fontSize: 17, color: colors.textMain, letterSpacing: -0.2 },
  brandTag: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },

  // Ítems juntos entre sí: son un grupo.
  nav: { gap: S.xs },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    height: 46,
    paddingHorizontal: S.md,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  itemFondo: { backgroundColor: colors.primaryLight, borderRadius: radii.md },
  indicador: {
    position: 'absolute',
    left: 0,
    top: 11,
    bottom: 11,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  itemLabel: { flex: 1, fontSize: 14.5, fontWeight: '600', color: colors.textMuted },
  itemLabelActivo: { color: colors.primaryDark, fontWeight: '700' },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  footer: { marginTop: 'auto', paddingTop: S.xl, paddingHorizontal: S.sm },
  footerText: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16 },
});
