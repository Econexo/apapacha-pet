import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

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
import { colors } from './src/theme/colors';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

type TabIconName = 'compass' | 'compass-outline' | 'chatbubbles' | 'chatbubbles-outline' | 'calendar' | 'calendar-outline' | 'paw' | 'paw-outline';

function MainTabs() {
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
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: TabIconName;
          if (route.name === 'Explore') iconName = focused ? 'compass' : 'compass-outline';
          else if (route.name === 'Inbox') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'Bookings') iconName = focused ? 'calendar' : 'calendar-outline';
          else iconName = focused ? 'paw' : 'paw-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      })}
    >
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: 'Explorar' }} />
      <Tab.Screen name="Inbox" component={InboxScreen} options={{ title: 'Mensajes' }} />
      <Tab.Screen name="Bookings" component={BookingsScreen} options={{ title: 'Reservas' }} />
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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
      initialRouteName={profile?.kyc_status === 'pending' ? 'ClientVerification' : 'MainTabs'}
    >
      <Stack.Screen name="ClientVerification" component={ClientVerificationScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ animation: 'fade' }} />
      <Stack.Screen name="SearchModal" component={SearchFilterScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="SpaceDetail" component={SpaceDetailScreen} />
      <Stack.Screen name="VisiterDetail" component={VisiterDetailScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="CheckIn" component={CheckInScreen} />
      <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      <Stack.Screen name="AddPetModal" component={AddPetScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="HostOnboarding" component={HostOnboardingScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="TrustAndSafety" component={TrustAndSafetyScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="HostDashboard" component={HostDashboardScreen} options={{ animation: 'fade' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
