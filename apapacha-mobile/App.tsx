import { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useRoute, RouteProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import {
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { ExploreScreen } from './src/screens/ExploreScreen';
import { SpaceDetailScreen } from './src/screens/SpaceDetailScreen';
import { VisiterDetailScreen } from './src/screens/VisiterDetailScreen';
import { CheckInScreen } from './src/screens/CheckInScreen';
import { BookingsScreen } from './src/screens/BookingsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { HostDashboardScreen } from './src/screens/HostDashboardScreen';
import { InboxScreen } from './src/screens/InboxScreen';
import { ChatDetailScreen } from './src/screens/ChatDetailScreen';
import { AddPetScreen } from './src/screens/AddPetScreen';
import { SearchFilterScreen } from './src/screens/SearchFilterScreen';
import { CheckoutScreen } from './src/screens/CheckoutScreen';
import { HostOnboardingScreen } from './src/screens/HostOnboardingScreen';
import { ClientVerificationScreen } from './src/screens/ClientVerificationScreen';
import { TrustAndSafetyScreen } from './src/screens/TrustAndSafetyScreen';
import { InsuranceClaimScreen } from './src/screens/InsuranceClaimScreen';
import { PaymentSuccessScreen } from './src/screens/PaymentSuccessScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { LeaveReviewScreen } from './src/screens/LeaveReviewScreen';
import { ManageServiceScreen } from './src/screens/ManageServiceScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { TransferInstructionsScreen } from './src/screens/TransferInstructionsScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SetPasswordScreen } from './src/screens/SetPasswordScreen';
import { AdminScreen } from './src/screens/AdminScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { colors } from './src/theme/colors';
import { ToastProvider } from './src/components/Toast';
import { linking, guestLinking } from './src/linking';
import type { RootStackParamList } from './src/types/navigation';
import { getUnreadMessageCount } from './src/services/notifications.service';
import { supabase } from './supabase';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function AddPetWrapper() {
  const route = useRoute<RouteProp<RootStackParamList, 'AddPetModal'>>();
  return <AddPetScreen petId={route.params?.petId} />;
}

function LeaveReviewWrapper() {
  const route = useRoute<RouteProp<RootStackParamList, 'LeaveReview'>>();
  return <LeaveReviewScreen {...route.params} />;
}

function ManageServiceWrapper() {
  const route = useRoute<RouteProp<RootStackParamList, 'ManageService'>>();
  return <ManageServiceScreen type={route.params?.type} serviceId={route.params?.serviceId} />;
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Home:          { active: 'home',           inactive: 'home-outline'           },
  Explore:       { active: 'compass',        inactive: 'compass-outline'        },
  Inbox:         { active: 'chatbubbles',    inactive: 'chatbubbles-outline'    },
  Bookings:      { active: 'calendar',       inactive: 'calendar-outline'       },
  HostDashboard: { active: 'paw',            inactive: 'paw-outline'            },
  Profile:       { active: 'person-circle',  inactive: 'person-circle-outline'  },
};

function MainTabs() {
  const { profile, user } = useAuth();
  const isHost = profile?.role === 'host';

  const [unreadMsgs, setUnreadMsgs] = useState(0);

  const refreshUnread = useCallback(() => {
    getUnreadMessageCount().then(setUnreadMsgs).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshUnread();
    // La tabla notifications ya está en la publicación supabase_realtime.
    // Filtramos por user_id para no refrescar el contador de cada usuario
    // con las notificaciones de todos los demás (la RLS ya impide leerlas,
    // pero sin el filtro igual se dispara una consulta extra por cada evento).
    const channel = supabase
      .channel('unread-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, refreshUnread)
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [refreshUnread, user]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 72,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          if (!icons) return null;
          if (route.name === 'Explore') {
            return (
              <View style={{
                width: 52, height: 52, borderRadius: 26,
                backgroundColor: focused ? colors.primary : colors.primaryLight,
                alignItems: 'center', justifyContent: 'center',
                marginTop: -18,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: focused ? 0.4 : 0.15,
                shadowRadius: 8,
                elevation: 6,
              }}>
                <Ionicons name={focused ? icons.active : icons.inactive} size={24} color={focused ? '#fff' : colors.primary} />
              </View>
            );
          }
          return <Ionicons name={focused ? icons.active : icons.inactive} size={size ?? 24} color={color} />;
        },
        tabBarLabelStyle: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
        tabBarLabel: ({ focused, children }) =>
          route.name === 'Explore' ? null :
          <View><Text style={{ fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, color: focused ? colors.primary : colors.textMuted }}>{children}</Text></View>,
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}     options={{ title: 'Inicio' }} />
      <Tab.Screen name="Explore"  component={ExploreScreen}  options={{ title: 'Explorar' }} />
      <Tab.Screen
        name="Inbox"
        component={InboxScreen}
        options={{ title: 'Mensajes', tabBarBadge: unreadMsgs > 0 ? unreadMsgs : undefined }}
      />
      <Tab.Screen name="Bookings" component={BookingsScreen} options={{ title: 'Reservas' }} />
      {isHost && (
        <Tab.Screen
          name="HostDashboard"
          component={HostDashboardScreen}
          options={{ title: 'Cuidador' }}
        />
      )}
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Perfil' }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ animation: 'fade' }} />
        <Stack.Screen name="SpaceDetail" component={SpaceDetailScreen} />
        <Stack.Screen name="VisiterDetail" component={VisiterDetailScreen} />
        <Stack.Screen name="TrustAndSafety" component={TrustAndSafetyScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack.Navigator>
    );
  }

  const getInitialRoute = () => {
    // Onboarding solo si explícitamente false Y el perfil parece recién creado (sin datos)
    const needsOnboarding = profile?.onboarding_done === false && !profile?.age && !profile?.address;
    if (needsOnboarding) return 'Onboarding';
    // NOTA: NO forzamos ClientVerification en cada login (antes molestaba a los
    // usuarios con kyc 'pending' en cada reingreso). La verificación de identidad
    // se ofrece con un banner opcional en el Perfil (ClientVerification sigue
    // accesible por navegación).
    return 'MainTabs';
  };

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      initialRouteName={getInitialRoute()}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="SetPassword" component={SetPasswordScreen} options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="ClientVerification" component={ClientVerificationScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ animation: 'fade' }} />
      <Stack.Screen name="SearchModal" component={SearchFilterScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="SpaceDetail" component={SpaceDetailScreen} />
      <Stack.Screen name="VisiterDetail" component={VisiterDetailScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="TransferInstructions" component={TransferInstructionsScreen} />
      <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="CheckIn" component={CheckInScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="AddPetModal" component={AddPetWrapper} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="HostOnboarding" component={HostOnboardingScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="TrustAndSafety" component={TrustAndSafetyScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="InsuranceClaim" component={InsuranceClaimScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="HostDashboard" component={HostDashboardScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="LeaveReview" component={LeaveReviewWrapper} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Admin" component={AdminScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="ManageService" component={ManageServiceWrapper} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Fraunces_500Medium, Fraunces_600SemiBold,
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <ToastProvider>
        <AuthProvider>
          <NavigationRoot />
        </AuthProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

// El mapa de rutas depende de la sesión: sin ella solo se mapean rutas públicas,
// para que Login sea alcanzable (ver comentario en src/linking.ts).
function NavigationRoot() {
  const { session } = useAuth();
  return (
    <NavigationContainer
      linking={session ? linking : guestLinking}
      documentTitle={{
        formatter: (options) => (options?.title ? `${options.title} · ApapachaPet` : 'ApapachaPet'),
      }}
    >
      <RootNavigator />
    </NavigationContainer>
  );
}
