import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radii, shadows } from '../theme/design';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  show: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION = 3500;

const TYPE_CONFIG: Record<ToastType, { icon: React.ComponentProps<typeof Ionicons>['name']; bg: string; border: string; iconColor: string; textColor: string }> = {
  success: { icon: 'checkmark-circle', bg: '#F0FBF0', border: '#B8E6B9', iconColor: '#2D7A2E', textColor: '#1A4A1B' },
  error:   { icon: 'close-circle',     bg: '#FEF2F2', border: '#FCA5A5', iconColor: '#DC2626', textColor: '#991B1B' },
  warning: { icon: 'warning',          bg: '#FFFBEB', border: '#FDE68A', iconColor: '#D97706', textColor: '#92400E' },
  info:    { icon: 'information-circle', bg: '#EFF8FC', border: '#B3DCE8', iconColor: '#4A9DB5', textColor: '#1E5F75' },
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const cfg = TYPE_CONFIG[toast.type];
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const progress   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 8 }),
    ]).start();
    Animated.timing(progress, { toValue: 0, duration: TOAST_DURATION, useNativeDriver: false }).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -16, duration: 200, useNativeDriver: true }),
      ]).start(onDismiss);
    }, TOAST_DURATION);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity, transform: [{ translateY }], backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Ionicons name={cfg.icon} size={20} color={cfg.iconColor} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: cfg.textColor }]}>{toast.title}</Text>
        {toast.message ? <Text style={[styles.msg, { color: cfg.textColor }]}>{toast.message}</Text> : null}
        {/* Progress bar */}
        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) as any, backgroundColor: cfg.iconColor }]} />
        </View>
      </View>
      <TouchableOpacity onPress={onDismiss} style={{ padding: 2 }}>
        <Ionicons name="close" size={16} color={cfg.iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-4), { id, type, title, message }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    show,
    success: (title, msg) => show('success', title, msg),
    error:   (title, msg) => show('error',   title, msg),
    warning: (title, msg) => show('warning', title, msg),
    info:    (title, msg) => show('info',    title, msg),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map(t => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 56,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'box-none',
  } as any,
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    width: '100%', maxWidth: 480,
    borderWidth: 1, borderRadius: radii.lg,
    padding: 14, ...shadows.lg,
    overflow: 'hidden',
  },
  title: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  msg:   { fontSize: 12, fontWeight: '500', lineHeight: 17 },
  progressBg: { height: 2, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 2, borderRadius: 2 },
});
