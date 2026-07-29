import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { Button } from './ui/Button';
import { ScreenBackground } from './ui/ScreenBackground';
import type { RootStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface Props {
  title: string;
  body: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}

// Estado para pantallas privadas cuando se navega sin sesión. Es el punto de
// entrada explícito a Login: antes no existía ninguno en toda la app.
export function GuestGate({ title, body, icon = 'lock-closed-outline' }: Props) {
  const navigation = useNavigation<Nav>();
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenBackground />
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={30} color={colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        <Button
          label="Iniciar sesión o crear cuenta"
          icon="log-in"
          onPress={() => navigation.navigate('Login')}
          style={{ marginTop: 8, alignSelf: 'stretch' }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.textMain, textAlign: 'center' },
  body: { fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
});
