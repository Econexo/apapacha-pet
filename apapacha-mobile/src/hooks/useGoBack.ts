import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'Home' | 'Explore' | 'Inbox' | 'Bookings' | 'Profile' | 'HostDashboard';

/**
 * Retroceso seguro para pantallas que se pueden abrir por URL.
 *
 * `goBack()` a secas no hace nada cuando no hay pantalla anterior en la pila,
 * que es justo lo que pasa al entrar por un enlace directo: una notificación
 * push (abren /chat/<id>, /reservas, /pago/<id>...), un refresco del navegador
 * o un enlace compartido. El usuario queda con una flecha de retroceso que no
 * responde. En ese caso volvemos a la pestaña que corresponda.
 */
export function useGoBack(destino: Tab = 'Home') {
  const navigation = useNavigation<Nav>();
  return useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('MainTabs', { screen: destino } as never);
  }, [navigation, destino]);
}
