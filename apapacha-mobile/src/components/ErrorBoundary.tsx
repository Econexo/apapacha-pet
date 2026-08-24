import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii } from '../theme/design';

/**
 * Sin esto, cualquier error al pintar una pantalla desmonta el árbol entero de
 * React: el usuario ve una pantalla en blanco donde no responde ni la flecha de
 * retroceso, y no hay forma de saber qué pasó ni de salir salvo cerrar la app.
 *
 * Con esto, el fallo queda acotado a una pantalla de recuperación con salida.
 */
interface Props { children: React.ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Queda en la consola del dispositivo para poder diagnosticarlo después.
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  recargar = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.replace('/');
    } else {
      this.setState({ error: null });
    }
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.root}>
        <View style={styles.icono}>
          <Ionicons name="alert-circle-outline" size={34} color={colors.primary} />
        </View>
        <Text style={styles.titulo}>Algo se rompió aquí</Text>
        <Text style={styles.texto}>
          No pudimos mostrar esta pantalla. Tus datos están a salvo: nada de lo que hiciste se perdió.
        </Text>
        <TouchableOpacity style={styles.boton} onPress={this.recargar} activeOpacity={0.85}>
          <Text style={styles.botonTexto}>Volver al inicio</Text>
        </TouchableOpacity>
        {__DEV__ && <Text style={styles.detalle}>{this.state.error.message}</Text>}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, backgroundColor: colors.background },
  icono: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  titulo: { fontFamily: fonts.display, fontSize: 20, color: colors.textMain, textAlign: 'center' },
  texto: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
  boton: { marginTop: 10, backgroundColor: colors.primary, paddingHorizontal: 26, paddingVertical: 14, borderRadius: radii.lg },
  botonTexto: { color: colors.surface, fontWeight: '800', fontSize: 14 },
  detalle: { marginTop: 14, fontSize: 11, color: colors.textMuted, textAlign: 'center' },
});
