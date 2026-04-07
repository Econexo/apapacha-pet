import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { useState } from 'react';

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

import { colors } from './src/theme/colors';

type RouteType = 'LOGIN' | 'EXPLORE' | 'DETAIL' | 'VISITER_DETAIL' | 'CHECKIN' | 'BOOKINGS' | 'PROFILE' | 'HOST_DASHBOARD' | 'INBOX' | 'CHAT_DETAIL' | 'ADD_PET' | 'SEARCH' | 'CHECKOUT';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<RouteType>('LOGIN');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  const handleNavigateToDetail = (id: string, type: 'SPACE'|'VISITER') => {
    setSelectedEntityId(id);
    if (type === 'SPACE') {
      setCurrentRoute('DETAIL');
    } else {
      setCurrentRoute('VISITER_DETAIL');
    }
  };

  const renderScreen = () => {
    switch (currentRoute) {
      case 'LOGIN':
        return <LoginScreen onLogin={() => setCurrentRoute('EXPLORE')} />;
      case 'EXPLORE':
        return <ExploreScreen onNavigateToDetail={handleNavigateToDetail} onNavigateToSearch={() => setCurrentRoute('SEARCH')}/>;
      case 'SEARCH':
        return <SearchFilterScreen onBack={() => setCurrentRoute('EXPLORE')} onSearch={() => setCurrentRoute('EXPLORE')} />;
      case 'DETAIL':
        return (
          <SpaceDetailScreen 
            id={selectedEntityId || '1'} 
            onBack={() => setCurrentRoute('EXPLORE')} 
            onNavigateToCheckIn={() => setCurrentRoute('CHECKOUT')}
          />
        );
      case 'VISITER_DETAIL':
        return (
          <VisiterDetailScreen 
            id={selectedEntityId || 'v1'}
            onBack={() => setCurrentRoute('EXPLORE')} 
            onNavigateToRequest={() => setCurrentRoute('CHECKOUT')} 
          />
        );
      case 'CHECKOUT':
        return <CheckoutScreen type="SPACE" onBack={() => setCurrentRoute('DETAIL')} onConfirmAndPay={() => setCurrentRoute('CHECKIN')} />;
      case 'CHECKIN':
        return <CheckInScreen />;
      case 'BOOKINGS':
        return <BookingsScreen />;
      case 'INBOX':
        return <InboxScreen onNavigateToChat={(id) => setCurrentRoute('CHAT_DETAIL')} />;
      case 'CHAT_DETAIL':
        return <ChatDetailScreen onBack={() => setCurrentRoute('INBOX')} />;
      case 'PROFILE':
        return <ProfileScreen onSwitchToHost={() => setCurrentRoute('HOST_DASHBOARD')} onAddPet={() => setCurrentRoute('ADD_PET')} />;
      case 'ADD_PET':
        return <AddPetScreen onBack={() => setCurrentRoute('PROFILE')} onSave={() => setCurrentRoute('PROFILE')} />;
      case 'HOST_DASHBOARD':
        return <HostDashboardScreen />;
      default:
        return <LoginScreen onLogin={() => setCurrentRoute('EXPLORE')} />;
    }
  };

  const showBottomTab = currentRoute === 'EXPLORE' || currentRoute === 'BOOKINGS' || currentRoute === 'PROFILE' || currentRoute === 'INBOX' || currentRoute === 'HOST_DASHBOARD';

  const BottomTabBar = () => {
    if (!showBottomTab) return null;

    if (currentRoute === 'HOST_DASHBOARD') {
      return (
        <View style={styles.tabBarContainer}>
          <SafeAreaView style={styles.tabBarSafeArea}>
            <TouchableOpacity style={styles.hostExitBtn} onPress={() => setCurrentRoute('PROFILE')}>
              <Text style={styles.hostExitText}>← Volver a Vista de Dueño</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      );
    }

    const TabButton = ({ title, icon, route }: { title: string, icon: string, route: RouteType }) => {
      const isActive = currentRoute === route;
      return (
        <TouchableOpacity 
          style={styles.tabButton} 
          onPress={() => setCurrentRoute(route)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{icon}</Text>
          <Text style={[styles.tabTitle, isActive && styles.tabTitleActive]}>{title}</Text>
        </TouchableOpacity>
      );
    };

    return (
      <View style={styles.tabBarContainer}>
        <SafeAreaView style={styles.tabBarSafeArea}>
          <View style={styles.tabBar}>
            <TabButton title="Explorar" icon="🌍" route="EXPLORE" />
            <TabButton title="Mensajes" icon="💬" route="INBOX" />
            <TabButton title="Reservas" icon="📅" route="BOOKINGS" />
            <TabButton title="Perfil" icon="🐾" route="PROFILE" />
          </View>
        </SafeAreaView>
      </View>
    );
  };

  let barStyle: 'auto' | 'inverted' | 'light' | 'dark' = 'dark';
  if (currentRoute === 'LOGIN' || currentRoute === 'HOST_DASHBOARD' || currentRoute === 'DETAIL' || currentRoute === 'CHECKIN') {
    barStyle = 'light';
  }

  return (
    <View style={styles.container}>
      <StatusBar style={barStyle} />
      <View style={styles.screenWrapper}>
        {renderScreen()}
      </View>
      <BottomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  screenWrapper: { flex: 1, backgroundColor: colors.background },
  tabBarContainer: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.05, shadowRadius: 5 },
  tabBarSafeArea: { backgroundColor: colors.surface },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, paddingHorizontal: 10, height: 70 },
  tabButton: { alignItems: 'center', justifyContent: 'center', minWidth: 70 },
  tabIcon: { fontSize: 22, marginBottom: 4, opacity: 0.5 },
  tabIconActive: { opacity: 1 },
  tabTitle: { fontSize: 10, fontWeight: '600', color: colors.textMuted },
  tabTitleActive: { color: colors.primary, fontWeight: '800' },
  hostExitBtn: { padding: 16, alignItems: 'center', justifyContent: 'center', height: 70 },
  hostExitText: { fontSize: 15, fontWeight: '700', color: colors.primary }
});
