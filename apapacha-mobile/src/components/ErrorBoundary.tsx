import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { radii } from '../theme/design';

/**
 * Sin esto, cualquier error al pintar una pantalla desmonta el árbol entero de
 * React: el usuario ve una pantalla en blanco donde no responde ni la flecha de
 * retroceso, y no hay forma de saber qué pasó ni de salir salvo cerrar la app.
 *
 * Con esto, el fallo queda acotado a una pantalla de recuperación con salida.
 *
 * El detalle del error se muestra también en producción, detrás de "Ver
 * detalle". Antes solo salía con __DEV__, así que cuando la app fallaba en el
 * teléfono de alguien que está probando, la captura que nos llegaba no traía
 * NADA con lo que diagnosticar: solo "Algo se rompió aquí". El botón de copiar
 * existe para que ese texto se pueda pegar en un mensaje.
 */
interface Props { children: React.ReactNode }
interface State { error: Error | null; stack: string | null; abierto: boolean; copiado: boolean }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, stack: null, abierto: false, copiado: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Queda en la consola del dispositivo para poder diagnosticarlo después.
    console.error('[ErrorBoundary]', error, info?.componentStack);
    this.setState({ stack: info?.componentStack ?? null });
  }

  private detalle(): string {
    const { error, stack } = this.state;
    const donde = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.pathname : Platform.OS;
    return [
      `Pantalla: ${donde}`,
      `Error: ${error?.name ?? 'Error'}: ${error?.message ?? '(sin mensaje)'}`,
      error?.stack ? `\n${error.stack}` : '',
      stack ? `\nComponentes:${stack}` : '',
    ].filter(Boolean).join('\n');
  }

  copiar = async () => {
    try {
      await Clipboard.setStringAsync(this.detalle());
      this.setState({ copiado: true });
    } catch {
      // Copiar es una ayuda, no un requisito: el texto está a la vista igual.
    }
  };

  // Reintentar remonta el árbol sin recargar: si el fallo fue puntual (datos a
  // medio cargar, una carrera), el usuario sigue donde estaba en vez de volver
  // al inicio y tener que rehacer el camino.
  reintentar = () => this.setState({ error: null, stack: null, abierto: false, copiado: false });

  volverAlInicio = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.replace('/');
    } else {
      this.reintentar();
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    const { abierto, copiado } = this.state;

    return (
      <View style={styles.root}>
        <View style={styles.icono}>
          <Ionicons name="alert-circle-outline" size={34} color={colors.primary} />
        </View>
        <Text style={styles.titulo}>Algo se rompió aquí</Text>
        <Text style={styles.texto}>
          No pudimos mostrar esta pantalla. Tus datos están a salvo: nada de lo que hiciste se perdió.
        </Text>

        <View style={styles.botones}>
          <TouchableOpacity style={styles.boton} onPress={this.reintentar} activeOpacity={0.85}>
            <Text style={styles.botonTexto}>Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.botonSuave} onPress={this.volverAlInicio} activeOpacity={0.85}>
            <Text style={styles.botonSuaveTexto}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => this.setState({ abierto: !abierto })} activeOpacity={0.7} style={styles.verDetalle}>
          <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
          <Text style={styles.verDetalleTexto}>{abierto ? 'Ocultar detalle' : 'Ver detalle del error'}</Text>
        </TouchableOpacity>

        {abierto && (
          <View style={styles.cajaDetalle}>
            <ScrollView style={{ maxHeight: 200 }}>
              <Text style={styles.detalle} selectable>{this.detalle()}</Text>
            </ScrollView>
            <TouchableOpacity onPress={this.copiar} activeOpacity={0.7} style={styles.copiar}>
              <Ionicons name={copiado ? 'checkmark' : 'copy-outline'} size={14} color={colors.primary} />
              <Text style={styles.copiarTexto}>{copiado ? 'Copiado' : 'Copiar detalle'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, backgroundColor: colors.background },
  icono: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  titulo: { fontFamily: fonts.display, fontSize: 20, color: colors.textMain, textAlign: 'center' },
  texto: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 21 },
  botones: { flexDirection: 'row', gap: 10, marginTop: 10 },
  boton: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: radii.lg },
  botonTexto: { color: colors.surface, fontWeight: '800', fontSize: 14 },
  botonSuave: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border },
  botonSuaveTexto: { color: colors.textMain, fontWeight: '800', fontSize: 14 },
  verDetalle: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, padding: 6 },
  verDetalleTexto: { fontSize: 12.5, color: colors.textMuted, fontWeight: '700' },
  cajaDetalle: { alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: 12 },
  detalle: { fontSize: 11, color: colors.textMuted, lineHeight: 16, fontFamily: Platform.OS === 'web' ? 'monospace' : undefined },
  copiar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 8 },
  copiarTexto: { fontSize: 12.5, color: colors.primary, fontWeight: '800' },
});
