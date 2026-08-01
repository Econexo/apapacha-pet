import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Platform, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii } from '../theme/design';
import { Button } from './ui/Button';
import { useReducedMotion } from '../hooks/useMotion';
import { TOUR_STEPS, type TourTargetKey } from './tourSteps';

// ─── Registro de objetivos ───────────────────────────────────────────────────
// Las pantallas registran la posición de los elementos que la guía puede
// resaltar. Si un objetivo no está registrado, el paso se muestra sin foco:
// nunca falla, solo degrada.

interface Rect { x: number; y: number; width: number; height: number }

interface TourTargetsValue {
  registrar: (key: TourTargetKey, rect: Rect) => void;
  objetivos: Partial<Record<TourTargetKey, Rect>>;
}

const TourTargetsContext = createContext<TourTargetsValue>({ registrar: () => {}, objetivos: {} });

export function TourTargetsProvider({ children }: { children: React.ReactNode }) {
  const [objetivos, setObjetivos] = useState<Partial<Record<TourTargetKey, Rect>>>({});
  const registrar = useCallback((key: TourTargetKey, rect: Rect) => {
    setObjetivos(prev => {
      const anterior = prev[key];
      if (anterior && anterior.x === rect.x && anterior.y === rect.y &&
          anterior.width === rect.width && anterior.height === rect.height) return prev;
      return { ...prev, [key]: rect };
    });
  }, []);
  return (
    <TourTargetsContext.Provider value={{ registrar, objetivos }}>
      {children}
    </TourTargetsContext.Provider>
  );
}

export function useTourTargets() {
  return useContext(TourTargetsContext);
}

/** Envuelve un elemento para que la guía pueda resaltarlo. */
export function TourTarget({ tourKey, children, style }: {
  tourKey: TourTargetKey;
  children: React.ReactNode;
  style?: any;
}) {
  const { registrar } = useTourTargets();
  const ref = useRef<View>(null);
  const medir = useCallback(() => {
    ref.current?.measureInWindow?.((x, y, width, height) => {
      if (width > 0 && height > 0) registrar(tourKey, { x, y, width, height });
    });
  }, [registrar, tourKey]);
  return (
    <View ref={ref} style={style} onLayout={medir} collapsable={false}>
      {children}
    </View>
  );
}

// ─── Persistencia ────────────────────────────────────────────────────────────

const claveVisto = (userId: string) => `tour_visto:${userId}`;

export async function tourYaVisto(userId: string): Promise<boolean> {
  try { return (await AsyncStorage.getItem(claveVisto(userId))) === '1'; }
  catch { return true; } // ante fallo de storage, no molestar
}

export async function marcarTourVisto(userId: string): Promise<void> {
  try { await AsyncStorage.setItem(claveVisto(userId), '1'); } catch { /* no bloquear */ }
}

// ─── La guía ─────────────────────────────────────────────────────────────────

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AppTour({ visible, onClose }: Props) {
  const { objetivos } = useTourTargets();
  const reducedMotion = useReducedMotion();
  const [paso, setPaso] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;

  const step = TOUR_STEPS[paso];
  const foco = step?.target ? objetivos[step.target] : undefined;

  useEffect(() => {
    if (!visible) return;
    if (reducedMotion) { anim.setValue(1); return; }
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [paso, visible, reducedMotion, anim]);

  useEffect(() => { if (visible) setPaso(0); }, [visible]);

  if (!visible || !step) return null;

  const ultimo = paso === TOUR_STEPS.length - 1;

  const cerrar = () => { setPaso(0); onClose(); };
  const siguiente = () => (ultimo ? cerrar() : setPaso(p => p + 1));
  const atras = () => setPaso(p => Math.max(0, p - 1));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={cerrar}>
      {/* Velo difuminado. El blur solo existe en web; en nativo el velo sólido
          cumple la misma función sin añadir dependencias. */}
      <View style={[styles.velo, Platform.OS === 'web' ? ({ backdropFilter: 'blur(6px)' } as any) : null]}>
        {/* Foco sobre el elemento real, cuando el paso lo pide y está medido. */}
        {foco && (
          <View
            pointerEvents="none"
            style={[styles.foco, {
              left: foco.x - 8,
              top: foco.y - 8,
              width: foco.width + 16,
              height: foco.height + 16,
            }]}
          />
        )}

        <Animated.View
          style={[
            styles.tarjeta,
            {
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={step.icon} size={26} color={colors.primary} />
          </View>

          <Text style={styles.titulo}>{step.title}</Text>
          <Text style={styles.cuerpo}>{step.body}</Text>

          <View style={styles.puntos}>
            {TOUR_STEPS.map((s, i) => (
              <View key={s.key} style={[styles.punto, i === paso && styles.puntoActivo]} />
            ))}
          </View>

          <Button
            label={ultimo ? 'Empezar a usar la app' : 'Siguiente'}
            icon={ultimo ? 'checkmark' : 'arrow-forward'}
            onPress={siguiente}
            style={{ alignSelf: 'stretch' }}
          />

          <View style={styles.pie}>
            {paso > 0 ? (
              <TouchableOpacity onPress={atras} activeOpacity={0.7}>
                <Text style={styles.pieLink}>Atrás</Text>
              </TouchableOpacity>
            ) : <View />}
            {!ultimo && (
              <TouchableOpacity onPress={cerrar} activeOpacity={0.7}>
                <Text style={styles.pieLink}>Saltar guía</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(24,12,42,0.62)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  foco: {
    position: 'absolute',
    borderRadius: radii.md,
    borderWidth: 2.5,
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,255,255,0.14)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
  },
  tarjeta: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: 22, padding: 24, alignItems: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  titulo: { fontFamily: fonts.display, fontSize: 21, color: colors.textMain, textAlign: 'center', marginBottom: 8 },
  cuerpo: { fontSize: 14.5, color: colors.textMuted, textAlign: 'center', lineHeight: 21, marginBottom: 18 },
  puntos: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  punto: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  puntoActivo: { backgroundColor: colors.primary, width: 20 },
  pie: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 14, minHeight: 20 },
  pieLink: { fontSize: 13.5, fontWeight: '700', color: colors.textMuted },
});
