import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, RefreshControl, Platform, Dimensions,
  Image, Linking, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { confirmBookingPayment } from '../services/bookings.service';
import { insertNotification } from '../services/notifications.service';
import { FadeInView } from '../components/ui/FadeInView';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { usePressScale } from '../hooks/useMotion';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, IoniconName> = {
  dashboard:    'stats-chart-outline',
  users:        'people-outline',
  applications: 'document-text-outline',
  payments:     'card-outline',
  bookings:     'calendar-outline',
};

const SUPABASE_FUNCTIONS_URL = `${supabaseUrl}/functions/v1`;

type Tab = 'dashboard' | 'users' | 'applications' | 'bookings' | 'payments';

interface Stats {
  totalUsers: number;
  totalSpaces: number;
  totalVisitors: number;
  totalBookings: number;
  activeBookings: number;
  pendingApplications: number;
}

interface AdminUser {
  id: string;
  full_name: string;
  last_name: string | null;
  age: number | null;
  address: string | null;
  bio: string | null;
  role: string;
  kyc_status: string;
  is_admin: boolean;
  signed_contract_url?: string | null;
  kyc_doc_front_url?: string | null;
  kyc_doc_back_url?: string | null;
  created_at: string;
  spacesCount?: number;
  visitersCount?: number;
  bookingsCount?: number;
}

interface AdminSpace {
  id: string;
  title: string;
  location: string;
  price_per_night: number;
  active: boolean;
}

interface AdminVisiter {
  id: string;
  name: string;
  profession_title: string;
  price_per_visit: number;
  active: boolean;
}

interface Application {
  id: string;
  applicant_id: string;
  service_type: string;
  status: string;
  submitted_at: string | null;
  welcome_email_sent?: boolean;
  kyc_doc_url?: string | null;
  selfie_url?: string | null;
  safety_evidence_url?: string | null;
  evidence_url_2?: string | null;
  profiles: { full_name: string; last_name: string | null } | null;
}

interface AdminBooking {
  id: string;
  service_type: string;
  start_date: string;
  end_date: string;
  status: string;
  service_phase: 'not_started' | 'in_progress';
  total_price: number;
  created_at: string;
  payment_status: string | null;
  payment_receipt_url: string | null;
  profiles: { full_name: string } | null;
}

interface PendingPayment {
  id: string;
  owner_id: string;
  total_price: number;
  payment_receipt_url: string | null;
  start_date: string;
  end_date: string;
  service_type: string;
  created_at: string;
  profiles: { full_name: string } | null;
}

const { width: SCREEN_W } = Dimensions.get('window');

const PAW_POSITIONS = Array.from({ length: 40 }, (_, i) => ({
  top:     (i * 137 + 53) % 900,
  left:    (i * 211 + 73) % (SCREEN_W || 400),
  rotate:  `${((i * 73) % 60) - 30}deg`,
  opacity: 0.028 + (i % 4) * 0.008,
  size:    20 + (i % 3) * 8,
}));

function PawBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {PAW_POSITIONS.map((p, i) => (
        <Text key={i} style={{ position: 'absolute', top: p.top, left: p.left, fontSize: p.size, opacity: p.opacity, transform: [{ rotate: p.rotate }] }}>
          🐾
        </Text>
      ))}
    </View>
  );
}

export function AdminScreen() {
  const navigation = useNavigation() as any;
  const { profile } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [spaces, setSpaces] = useState<AdminSpace[]>([]);
  const [visiters, setVisiters] = useState<AdminVisiter[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  // El listado de reservas se corta en 50 para que la pestaña cargue rápido, pero
  // los ingresos y los gráficos se calculaban sobre ese recorte: pasadas las 50
  // reservas el panel mostraba menos dinero del real, sin avisar. Los agregados
  // van sobre esta consulta ligera, que no lleva límite.
  const [resumenReservas, setResumenReservas] = useState<{ status: string; total_price: number; created_at: string }[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [usersError, setUsersError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.is_admin) {
      navigation.replace('MainTabs' as any);
      return;
    }
    loadAll();
  }, []);

  const loadAll = async (silent = false) => {
    if (!silent) setLoading(true);
    await Promise.all([
      loadStats(), loadUsers(), loadSpaces(), loadVisiters(),
      loadApplications(), loadBookings(), loadBookingSummary(), loadPendingPayments(),
    ]);
    if (!silent) setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll(true);
    setRefreshing(false);
  }, []);

  async function loadStats() {
    const [u, s, v, b, ba, pa] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('spaces').select('id', { count: 'exact', head: true }),
      supabase.from('visiters').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('host_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    setStats({
      totalUsers: u.count ?? 0,
      totalSpaces: s.count ?? 0,
      totalVisitors: v.count ?? 0,
      totalBookings: b.count ?? 0,
      activeBookings: ba.count ?? 0,
      pendingApplications: pa.count ?? 0,
    });
  }

  async function loadUsers() {
    setUsersError(null);
    const [profilesRes, spacesRes, visitersRes, bookingsRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, last_name, age, address, bio, role, kyc_status, is_admin, created_at, signed_contract_url, kyc_doc_front_url, kyc_doc_back_url').order('created_at', { ascending: false }),
      supabase.from('spaces').select('host_id'),
      supabase.from('visiters').select('host_id'),
      supabase.from('bookings').select('owner_id'),
    ]);
    if (profilesRes.error) {
      console.error('[AdminScreen] loadUsers:', profilesRes.error.message);
      setUsersError(profilesRes.error.message);
      return setUsers([]);
    }
    const profiles = profilesRes.data ?? [];
    if (profiles.length === 0) return setUsers([]);

    const spacesCount = (spacesRes.data ?? []).reduce<Record<string, number>>((acc, r: any) => {
      acc[r.host_id] = (acc[r.host_id] ?? 0) + 1; return acc;
    }, {});
    const visitersCount = (visitersRes.data ?? []).reduce<Record<string, number>>((acc, r: any) => {
      acc[r.host_id] = (acc[r.host_id] ?? 0) + 1; return acc;
    }, {});
    const bookingsCount = (bookingsRes.data ?? []).reduce<Record<string, number>>((acc, r: any) => {
      acc[r.owner_id] = (acc[r.owner_id] ?? 0) + 1; return acc;
    }, {});

    setUsers(profiles.map(p => ({
      ...p,
      spacesCount: spacesCount[p.id] ?? 0,
      visitersCount: visitersCount[p.id] ?? 0,
      bookingsCount: bookingsCount[p.id] ?? 0,
    })));
  }

  async function loadSpaces() {
    const { data, error } = await supabase
      .from('spaces')
      .select('id, title, location, price_per_night, active')
      .order('created_at', { ascending: false });
    if (error) { console.error('[Admin] loadSpaces:', error.message); return; }
    setSpaces((data ?? []) as AdminSpace[]);
  }

  async function loadVisiters() {
    const { data, error } = await supabase
      .from('visiters')
      .select('id, name, profession_title, price_per_visit, active')
      .order('created_at', { ascending: false });
    if (error) { console.error('[Admin] loadVisiters:', error.message); return; }
    setVisiters((data ?? []) as AdminVisiter[]);
  }

  async function loadApplications() {
    const { data, error } = await supabase
      .from('host_applications')
      .select('*')
      .order('id', { ascending: false });
    if (error) { console.error('[Admin] loadApplications:', error.message); return; }
    const apps = data ?? [];
    if (apps.length === 0) { setApplications([]); return; }
    const ids = [...new Set(apps.map((a: any) => a.applicant_id))];
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, last_name')
      .in('id', ids);
    const profMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    setApplications(apps.map((a: any) => ({ ...a, profiles: profMap[a.applicant_id] ?? null })) as unknown as Application[]);
  }

  async function loadBookings() {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, service_type, start_date, end_date, status, service_phase, total_price, created_at, payment_status, payment_receipt_url, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) { console.error('[Admin] loadBookings:', error.message); return; }
    setBookings((data ?? []) as unknown as AdminBooking[]);
  }

  async function loadBookingSummary() {
    const { data, error } = await supabase
      .from('bookings')
      .select('status, total_price, created_at');
    if (error) { console.error('[Admin] loadBookingSummary:', error.message); return; }
    setResumenReservas(data ?? []);
  }

  async function loadPendingPayments() {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, owner_id, total_price, payment_receipt_url, start_date, end_date, service_type, created_at, profiles(full_name)')
      .eq('payment_status', 'receipt_submitted')
      .order('created_at', { ascending: false });
    if (error) { console.error('[Admin] loadPendingPayments:', error.message); return; }
    setPendingPayments((data ?? []) as unknown as PendingPayment[]);
  }

  async function handleConfirmPayment(bookingId: string, ownerId?: string) {
    try {
      await confirmBookingPayment(bookingId);
      toast.success('Pago confirmado', 'La reserva está ahora activa.');
      loadPendingPayments();
      loadBookings();
      loadBookingSummary();
      loadStats();
    } catch (e: any) {
      toast.error('Error', e.message);
    }
  }

  async function approveApplication(id: string, userId: string, serviceType: string) {
    const { error } = await supabase.rpc('approve_host', { target_user_id: userId });
    if (error) { toast.error('Error', error.message); return; }
    // El correo de aprobación lo dispara el trigger de BD on_application_result_email
    // (status → 'approved'); no se envía desde el cliente porque auth.admin requiere service_role.
    const { error: appErr } = await supabase.from('host_applications').update({ status: 'approved' }).eq('id', id);
    if (appErr) console.error('[Admin] approveApplication update:', appErr.message);

    try {
      await insertNotification(
        userId,
        'application_approved',
        '¡Tu postulación fue aprobada! 🎉',
        'Felicitaciones, ya puedes publicar tus servicios como cuidador en ApapachaPet.',
        { application_id: id },
      );
    } catch (e) { console.error('[Admin] notify applicant:', e); }

    toast.success('Cuidador aprobado', 'Se notificó al postulante por correo y en la app.');
    loadApplications();
    loadStats();
  }

  async function rejectApplication(id: string, userId: string, serviceType: string) {
    const doReject = async (reason?: string) => {
      const { error } = await supabase.from('host_applications')
        .update({ status: 'rejected', rejection_reason: reason ?? null })
        .eq('id', id);
      if (error) { toast.error('Error', error.message); return; }
      // El correo de rechazo lo dispara el trigger de BD on_application_result_email (status → 'rejected').
      try {
        await insertNotification(
          userId,
          'application_rejected',
          'Tu postulación no fue aprobada',
          reason ?? 'Lamentablemente tu solicitud no pudo ser aprobada en esta oportunidad.',
          { application_id: id },
        );
      } catch {}
      toast.info('Postulación rechazada', 'Se notificó al postulante por correo y en la app.');
      loadApplications();
      loadStats();
    };

    if (Platform.OS === 'web') {
      const reason = window.prompt('Motivo de rechazo (opcional):') ?? undefined;
      await doReject(reason || undefined);
    } else {
      Alert.prompt(
        'Rechazar postulación',
        'Ingresa el motivo (opcional, se enviará al postulante):',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Rechazar', style: 'destructive', onPress: (reason?: string) => doReject(reason || undefined) },
        ],
        'plain-text',
      );
    }
  }

  async function recoverApplication(id: string) {
    const { error } = await supabase.from('host_applications').update({ status: 'pending' }).eq('id', id);
    if (error) { toast.error('Error', error.message); return; }
    loadApplications();
    loadStats();
  }

  async function toggleAdmin(userId: string, current: boolean) {
    const doIt = async () => {
      const { error } = await supabase.from('profiles').update({ is_admin: !current }).eq('id', userId);
      if (error) { toast.error('Error', error.message); return; }
      toast.success('Listo', current ? 'Permisos de admin retirados' : 'Usuario ahora es admin');
      loadUsers();
    };
    const msg = current ? '¿Quitar permisos de admin a este usuario?' : '¿Dar permisos de admin a este usuario?';
    if (Platform.OS === 'web') {
      if ((window as any).confirm(msg)) await doIt();
    } else {
      Alert.alert('Confirmar', msg, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Confirmar', onPress: doIt }]);
    }
  }

  async function updateKycStatus(userId: string, status: string) {
    const verb: Record<string, string> = {
      verified: 'verificar la identidad de',
      rejected: 'rechazar la identidad de',
      pending: 'resetear a pendiente la identidad de',
    };
    const doIt = async () => {
      const { error } = await supabase.from('profiles').update({ kyc_status: status }).eq('id', userId);
      if (error) { toast.error('Error', error.message); return; }
      toast.success('KYC actualizado', status === 'verified' ? 'Identidad verificada ✅' : status === 'rejected' ? 'Identidad rechazada' : 'Estado reseteado');
      loadUsers();
    };
    const msg = `¿Deseas ${verb[status] ?? status} este usuario?`;
    if (Platform.OS === 'web') {
      if ((window as any).confirm(msg)) await doIt();
    } else {
      Alert.alert('Gestionar KYC', msg, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: doIt },
      ]);
    }
  }

  async function deleteProfileUser(userId: string, name: string) {
    const doDelete = async () => {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) { toast.error('Error', error.message); return; }
      loadUsers(); loadStats();
    };
    if (Platform.OS === 'web') {
      if ((window as any).confirm(`¿Eliminar el perfil de ${name}? Su cuenta de login seguirá activa.`)) await doDelete();
    } else {
      Alert.alert('Eliminar perfil', `Eliminar el perfil de ${name}. Su cuenta de login seguirá activa.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  async function toggleSpaceActive(spaceId: string, current: boolean) {
    const { error } = await supabase.from('spaces').update({ active: !current }).eq('id', spaceId);
    if (error) { toast.error('Error', error.message); return; }
    loadSpaces();
  }

  async function deleteSpace(spaceId: string, title: string) {
    const doDelete = async () => {
      const { error, count } = await supabase.from('spaces').delete({ count: 'exact' }).eq('id', spaceId);
      if (error) { toast.error('Error al eliminar', error.message); return; }
      if (!count || count === 0) { toast.warning('Sin permisos', 'No se pudo eliminar. RLS bloqueó la operación.'); return; }
      await Promise.all([loadSpaces(), loadStats()]);
    };
    if (Platform.OS === 'web') {
      if ((window as any).confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) await doDelete();
    } else {
      Alert.alert('Eliminar espacio', `¿Eliminar "${title}"?\nEsta acción no se puede deshacer.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  async function toggleVisiterActive(visiterId: string, current: boolean) {
    const { error } = await supabase.from('visiters').update({ active: !current }).eq('id', visiterId);
    if (error) { toast.error('Error', error.message); return; }
    loadVisiters();
  }

  async function deleteVisiter(visiterId: string, name: string) {
    const doDelete = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const url = `${SUPABASE_FUNCTIONS_URL}/admin-delete-record`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({ table: 'visiters', id: visiterId }),
        });
        const text = await res.text();
        let json: any = {};
        try { json = JSON.parse(text); } catch {}
        if (!res.ok) { toast.error('Error al eliminar', `HTTP ${res.status}: ${json.error ?? text}`); return; }
        await Promise.all([loadVisiters(), loadStats()]);
      } catch (e: any) {
        toast.error('Error al eliminar', e.message ?? 'Error de red');
      }
    };

    if (Platform.OS === 'web') {
      if ((window as any).confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) {
        await doDelete();
      }
    } else {
      Alert.alert('Eliminar visiter', `¿Eliminar "${name}"?\nEsta acción no se puede deshacer.`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  async function updateBookingStatus(bookingId: string, status: string) {
    await supabase.from('bookings').update({ status }).eq('id', bookingId);
    loadBookings(); loadStats();
  }

  const filteredUsers = !search
    ? users
    : users.filter(u =>
        `${u.full_name ?? ''} ${u.last_name ?? ''}`.toLowerCase().includes(search.toLowerCase())
      );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const TAB_LABELS: Record<Tab, string> = {
    dashboard: 'Dashboard', users: 'Usuarios', applications: 'Postulaciones',
    payments: 'Pagos', bookings: 'Reservas',
  };
  const TAB_BADGES: Partial<Record<Tab, number>> = {
    applications: stats?.pendingApplications ?? 0,
    payments: pendingPayments.length,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Hero Header ──────────────────────────────── */}
      <View style={styles.header}>
        <PawBackground />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerIcon}>🛡️</Text>
          <Text style={styles.headerTitle}>Panel Admin</Text>
          <Text style={styles.headerSub}>Control total · Apapacha</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Pill Tabs ─────────────────────────────────── */}
      <View style={styles.tabBarWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
          {(['dashboard', 'users', 'applications', 'payments', 'bookings'] as Tab[]).map(tab => {
            const isActive = activeTab === tab;
            const badge = TAB_BADGES[tab] ?? 0;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.75}
              >
                <Ionicons name={TAB_ICONS[tab]} size={15} color={isActive ? '#fff' : colors.textMuted} />
                <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>
                  {TAB_LABELS[tab]}
                </Text>
                {badge > 0 && (
                  <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{badge}</Text></View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'dashboard' && (
          <DashboardTab
            stats={stats}
            users={users}
            spaces={spaces}
            visiters={visiters}
            bookings={bookings}
            resumenReservas={resumenReservas}
            applications={applications}
            pendingPaymentsCount={pendingPayments.length}
            onTabChange={setActiveTab}
            onToggleSpace={toggleSpaceActive}
            onDeleteSpace={deleteSpace}
            onToggleVisiter={toggleVisiterActive}
            onDeleteVisiter={deleteVisiter}
          />
        )}
        {activeTab === 'users' && (
          <UsersTab
            users={filteredUsers}
            search={search}
            onSearch={setSearch}
            onToggleAdmin={toggleAdmin}
            onUpdateKyc={updateKycStatus}
            onDeleteProfile={deleteProfileUser}
            dbError={usersError}
          />
        )}
        {activeTab === 'applications' && (
          <ApplicationsTab
            applications={applications}
            onApprove={(id, userId, serviceType) => approveApplication(id, userId, serviceType)}
            onReject={rejectApplication}
            onRecover={recoverApplication}
          />
        )}
        {activeTab === 'payments' && (
          <PaymentsTab payments={pendingPayments} onConfirm={handleConfirmPayment} />
        )}
        {activeTab === 'bookings' && <BookingsTab bookings={bookings} onUpdateStatus={updateBookingStatus} onConfirmPayment={handleConfirmPayment} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

type CardKey = 'users' | 'spaces' | 'visiters' | 'bookings' | 'active' | 'pending';

function KpiCard({ label, value, icon, color, onPress }: { label: string; value: number; icon: IoniconName; color: string; onPress?: () => void }) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  return (
    <Animated.View style={{ width: '47.5%', transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.statCard, { width: '100%', borderTopColor: color }]}
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <View style={[styles.statIconBox, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <AnimatedNumber value={value} style={styles.statValue} />
        <Text style={styles.statLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function DashboardTab({ stats, users, spaces, visiters, bookings, resumenReservas, applications, pendingPaymentsCount, onTabChange, onToggleSpace, onDeleteSpace, onToggleVisiter, onDeleteVisiter }: {
  stats: Stats | null;
  users: AdminUser[];
  spaces: AdminSpace[];
  visiters: AdminVisiter[];
  bookings: AdminBooking[];
  resumenReservas: { status: string; total_price: number; created_at: string }[];
  applications: Application[];
  pendingPaymentsCount: number;
  onTabChange: (tab: Tab) => void;
  onToggleSpace: (id: string, current: boolean) => void;
  onDeleteSpace: (id: string, title: string) => void;
  onToggleVisiter: (id: string, current: boolean) => void;
  onDeleteVisiter: (id: string, name: string) => void;
}) {
  const [servicesOpen, setServicesOpen] = useState(false);

  if (!stats) return null;

  const activeBookings = bookings.filter(b => b.status === 'active');

  // ── KPIs de navegación (sin duplicar: cada uno salta a su pestaña) ──
  const kpis: { label: string; value: number; icon: IoniconName; color: string; tab?: Tab }[] = [
    { label: 'Usuarios',          value: stats.totalUsers,          icon: 'people-outline',        color: colors.primary, tab: 'users' },
    { label: 'Reservas',          value: stats.totalBookings,       icon: 'calendar-outline',      color: colors.info,    tab: 'bookings' },
    { label: 'Pagos x confirmar', value: pendingPaymentsCount,      icon: 'card-outline',          color: colors.warning, tab: 'payments' },
    { label: 'Postulaciones',     value: stats.pendingApplications, icon: 'document-text-outline', color: colors.accent,  tab: 'applications' },
  ];

  // ── Ingresos (todas las reservas activas + completadas, sin recorte) ──
  const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const lastMonthD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthD.getFullYear()}-${lastMonthD.getMonth()}`;
  const paidBookings = resumenReservas.filter(b => b.status === 'active' || b.status === 'completed');
  const revenue = paidBookings.reduce((s, b) => s + (b.total_price || 0), 0);
  const mKey = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${d.getMonth()}`; };
  const monthRevenue     = paidBookings.filter(b => mKey(b.created_at) === thisMonthKey).reduce((s, b) => s + (b.total_price || 0), 0);
  const lastMonthRevenue = paidBookings.filter(b => mKey(b.created_at) === lastMonthKey).reduce((s, b) => s + (b.total_price || 0), 0);
  // Delta ingresos mes vs mes anterior (semántico: verde sube, rojo baja). null si no hay base.
  const deltaPct = lastMonthRevenue > 0 ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : null;
  // Valor promedio por reserva confirmada
  const avgBooking = paidBookings.length ? Math.round(revenue / paidBookings.length) : 0;

  // ── Serie mensual de reservas (últimos 6 meses) ──
  const monthly: { key: string; month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthly.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: MONTHS[d.getMonth()], count: 0 });
  }
  const mIdx = new Map(monthly.map((m, i) => [m.key, i]));
  for (const b of resumenReservas) {
    const d = new Date(b.created_at);
    const idx = mIdx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (idx !== undefined) monthly[idx].count++;
  }
  const maxMonthly = Math.max(1, ...monthly.map(m => m.count));

  // ── Desglose por estado ──
  const statusOrder = ['pending', 'active', 'completed', 'cancelled'];
  const statusLabel: Record<string, string> = { pending: 'Pendientes', active: 'Activas', completed: 'Completadas', cancelled: 'Canceladas' };
  const statusCounts: Record<string, number> = {};
  for (const b of resumenReservas) statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1;
  const statusTotal = resumenReservas.length || 1;

  const fmt$ = (n: number) => `$${n.toLocaleString('es-CL')}`;

  return (
    <View>
      {/* ── Ingresos (hero) ── */}
      <FadeInView delay={0}>
        <View style={styles.revenueCard}>
          <View style={styles.revenueTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.revenueLabel}>Ingresos (reservas confirmadas)</Text>
              <View style={styles.revenueValueRow}>
                <AnimatedNumber value={revenue} format={fmt$} style={styles.revenueValue} />
                {deltaPct !== null && (
                  <View style={[styles.deltaBadge, deltaPct >= 0 ? styles.deltaUp : styles.deltaDown]}>
                    <Ionicons name={deltaPct >= 0 ? 'arrow-up' : 'arrow-down'} size={11} color="#fff" />
                    <Text style={styles.deltaText}>{Math.abs(deltaPct)}%</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.revenueIconBox}><Ionicons name="cash-outline" size={26} color="#fff" /></View>
          </View>
          <View style={styles.revenueChips}>
            <View style={styles.revenueChip}><Text style={styles.revenueChipText}>{fmt$(monthRevenue)} este mes</Text></View>
            <View style={styles.revenueChip}><Text style={styles.revenueChipText}>{activeBookings.length} activas ahora</Text></View>
            <View style={styles.revenueChip}><Text style={styles.revenueChipText}>Prom. {fmt$(avgBooking)}</Text></View>
          </View>
        </View>
      </FadeInView>

      {/* ── KPIs (navegan a su pestaña) ── */}
      <FadeInView delay={60}>
        <View style={styles.statsGrid}>
          {kpis.map(k => (
            <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} color={k.color} onPress={() => k.tab && onTabChange(k.tab)} />
          ))}
        </View>
      </FadeInView>

      {/* ── Actividad: reservas por mes (mes actual enfatizado) ── */}
      <FadeInView delay={120}>
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Reservas — últimos 6 meses</Text>
          <View style={styles.barChart}>
            {monthly.map((m, i) => {
              const isCurrent = i === monthly.length - 1;
              return (
                <View key={m.key} style={styles.barCol}>
                  <Text style={[styles.barValue, isCurrent && styles.barValueActive]}>{m.count || ''}</Text>
                  <View style={[styles.bar, { height: Math.max(4, (m.count / maxMonthly) * 96) }, !isCurrent && styles.barMuted]} />
                  <Text style={[styles.barLabel, isCurrent && styles.barLabelActive]}>{m.month}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </FadeInView>

      {/* ── Reservas por estado ── */}
      <FadeInView delay={180}>
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Reservas por estado</Text>
          {statusOrder.map(s => {
            const count = statusCounts[s] ?? 0;
            return (
              <View key={s} style={styles.statusBarRow}>
                <Text style={styles.statusBarLabel}>{statusLabel[s]}</Text>
                <View style={styles.statusBarTrack}>
                  <View style={[styles.statusBarFill, { width: `${(count / statusTotal) * 100}%`, backgroundColor: STATUS_COLOR[s] }]} />
                </View>
                <Text style={styles.statusBarCount}>{count}</Text>
              </View>
            );
          })}
        </View>
      </FadeInView>

      {/* ── Gestión de servicios (sin pestaña propia) ── */}
      <TouchableOpacity style={styles.servicesHeader} onPress={() => setServicesOpen(o => !o)} activeOpacity={0.7}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="briefcase-outline" size={18} color={colors.accent} />
          <Text style={styles.chartTitle}>Gestión de servicios ({stats.totalSpaces + stats.totalVisitors})</Text>
        </View>
        <Ionicons name={servicesOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
      </TouchableOpacity>
      {servicesOpen && (
        <View style={styles.expandContent}>
          <Text style={styles.servicesSubhead}>🏠 Espacios ({spaces.length})</Text>
          {spaces.length === 0 ? <Text style={styles.expandEmpty}>Sin espacios publicados</Text> : spaces.map(s => (
            <View key={s.id} style={[styles.expandRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
                <Ionicons name="home-outline" size={16} color={colors.accent} style={{ marginRight: 10, marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.expandRowName}>{s.title}</Text>
                  <Text style={styles.expandRowMeta}>{s.location} · ${s.price_per_night.toLocaleString('es-CL')}/noche</Text>
                </View>
              </View>
              <View style={styles.expandRowActions}>
                <TouchableOpacity style={[styles.miniActionBtn, { backgroundColor: s.active ? `${colors.warning}15` : `${colors.accent}15`, borderColor: s.active ? colors.warning : colors.accent }]} onPress={() => onToggleSpace(s.id, s.active)}>
                  <Ionicons name={s.active ? 'pause-circle-outline' : 'play-circle-outline'} size={12} color={s.active ? colors.warning : colors.accent} />
                  <Text style={[styles.miniActionText, { color: s.active ? colors.warning : colors.accent }]}>{s.active ? 'Desactivar' : 'Activar'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.miniActionBtn, { backgroundColor: `${colors.danger}10`, borderColor: colors.danger }]} onPress={() => onDeleteSpace(s.id, s.title)}>
                  <Ionicons name="trash-outline" size={12} color={colors.danger} />
                  <Text style={[styles.miniActionText, { color: colors.danger }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <Text style={[styles.servicesSubhead, { marginTop: 14 }]}>🐾 Visiters ({visiters.length})</Text>
          {visiters.length === 0 ? <Text style={styles.expandEmpty}>Sin visiters publicados</Text> : visiters.map(v => (
            <View key={v.id} style={[styles.expandRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: '100%' }}>
                <Ionicons name="paw-outline" size={16} color={colors.lilac} style={{ marginRight: 10, marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.expandRowName}>{v.name}</Text>
                  <Text style={styles.expandRowMeta}>{v.profession_title} · ${v.price_per_visit.toLocaleString('es-CL')}/visita</Text>
                </View>
              </View>
              <View style={styles.expandRowActions}>
                <TouchableOpacity style={[styles.miniActionBtn, { backgroundColor: v.active ? `${colors.warning}15` : `${colors.accent}15`, borderColor: v.active ? colors.warning : colors.accent }]} onPress={() => onToggleVisiter(v.id, v.active)}>
                  <Ionicons name={v.active ? 'pause-circle-outline' : 'play-circle-outline'} size={12} color={v.active ? colors.warning : colors.accent} />
                  <Text style={[styles.miniActionText, { color: v.active ? colors.warning : colors.accent }]}>{v.active ? 'Desactivar' : 'Activar'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.miniActionBtn, { backgroundColor: `${colors.danger}10`, borderColor: colors.danger }]} onPress={() => onDeleteVisiter(v.id, v.name)}>
                  <Ionicons name="trash-outline" size={12} color={colors.danger} />
                  <Text style={[styles.miniActionText, { color: colors.danger }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const STATUS_COLOR: Record<string, string> = {
  pending: colors.warning,
  active: colors.accent,
  completed: colors.success,
  cancelled: colors.danger,
};

const KYC_LABEL: Record<string, string> = {
  pending: 'Pendiente', under_review: 'En revisión', verified: 'Verificado', rejected: 'Rechazado',
};
const SERVICE_LABEL: Record<string, string> = { space: 'Alojamiento', visiter: 'Visita' };
const svcLabel = (t: string) => SERVICE_LABEL[t] ?? t;

// ─── Users Tab ────────────────────────────────────────────────────────────────

interface UserDetail {
  spaces: Array<{ id: string; title: string; active: boolean; price_per_night: number }>;
  visiters: Array<{ id: string; name: string; active: boolean; price_per_visit: number }>;
  bookings: Array<{ id: string; status: string; total_price: number; start_date: string; service_type: string }>;
  loading: boolean;
}

function UsersTab({ users, search, onSearch, onToggleAdmin, onUpdateKyc, onDeleteProfile, dbError }: {
  users: AdminUser[]; search: string;
  onSearch: (v: string) => void;
  onToggleAdmin: (id: string, current: boolean) => void;
  onUpdateKyc: (id: string, status: string) => void;
  onDeleteProfile: (id: string, name: string) => void;
  dbError?: string | null;
}) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Record<string, UserDetail>>({});

  const toggleUser = async (userId: string) => {
    if (expandedUserId === userId) { setExpandedUserId(null); return; }
    setExpandedUserId(userId);
    if (expandedData[userId] && !expandedData[userId].loading) return;
    setExpandedData(prev => ({ ...prev, [userId]: { spaces: [], visiters: [], bookings: [], loading: true } }));
    const [spacesRes, visitersRes, bookingsRes] = await Promise.all([
      supabase.from('spaces').select('id, title, active, price_per_night').eq('host_id', userId),
      supabase.from('visiters').select('id, name, active, price_per_visit').eq('host_id', userId),
      supabase.from('bookings').select('id, status, total_price, start_date, service_type').eq('owner_id', userId).order('created_at', { ascending: false }).limit(5),
    ]);
    setExpandedData(prev => ({
      ...prev,
      [userId]: {
        spaces: (spacesRes.data ?? []) as UserDetail['spaces'],
        visiters: (visitersRes.data ?? []) as UserDetail['visiters'],
        bookings: (bookingsRes.data ?? []) as UserDetail['bookings'],
        loading: false,
      },
    }));
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>Usuarios Registrados ({users.length})</Text>
      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={onSearch}
        placeholder="Buscar por nombre..."
        placeholderTextColor={colors.textMuted}
      />
      {dbError && (
        <View style={{ backgroundColor: `${colors.danger}15`, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: `${colors.danger}40` }}>
          <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 12, marginBottom: 4 }}>Error SQL:</Text>
          <Text style={{ color: colors.danger, fontSize: 12 }}>{dbError}</Text>
        </View>
      )}
      {users.length === 0 && !dbError && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}><Text style={styles.emptyEmoji}>👥</Text></View>
          <Text style={styles.emptyTitle}>Sin usuarios registrados</Text>
        </View>
      )}
      {users.map(u => {
        const isExpanded = expandedUserId === u.id;
        const detail = expandedData[u.id];
        return (
          <View key={u.id} style={styles.card}>
            {/* Header row — tap to expand */}
            <TouchableOpacity onPress={() => toggleUser(u.id)} activeOpacity={0.75}>
              <View style={styles.cardRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(u.full_name?.[0] ?? u.id?.[0] ?? '?').toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{u.full_name ?? '(sin nombre)'} {u.last_name ?? ''}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                    <View style={[styles.tag, { backgroundColor: u.role === 'host' ? `${colors.accent}20` : `${colors.primary}15`, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <Ionicons
                        name={u.role === 'host' ? 'home-outline' : u.is_admin ? 'settings-outline' : 'paw-outline'}
                        size={11}
                        color={u.role === 'host' ? colors.accent : colors.primary}
                      />
                      <Text style={[styles.tagText, { color: u.role === 'host' ? colors.accent : colors.primary }]}>
                        {u.role === 'host' ? 'Cuidador' : u.is_admin ? 'Admin' : 'Cliente'}
                      </Text>
                    </View>
                    <View style={[styles.tag, { backgroundColor: u.kyc_status === 'verified' ? `${colors.success}20` : `${colors.warning}20`, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <Ionicons
                        name={u.kyc_status === 'verified' ? 'shield-checkmark-outline' : 'time-outline'}
                        size={11}
                        color={u.kyc_status === 'verified' ? colors.success : colors.warning}
                      />
                      <Text style={[styles.tagText, { color: u.kyc_status === 'verified' ? colors.success : colors.warning }]}>
                        {u.kyc_status === 'verified' ? 'Verificado' : 'Pendiente'}
                      </Text>
                    </View>
                    {u.signed_contract_url && (
                      <View style={[styles.tag, { backgroundColor: `${colors.success}20`, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Ionicons name="document-text-outline" size={11} color={colors.success} />
                        <Text style={[styles.tagText, { color: colors.success }]}>Contrato</Text>
                      </View>
                    )}
                  </View>
                  {u.age ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <Text style={styles.cardMeta}>{u.age} años</Text>
                      {u.address ? (
                        <>
                          <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                          <Text style={styles.cardMeta}>{u.address}</Text>
                        </>
                      ) : null}
                    </View>
                  ) : null}
                  {u.bio ? <Text style={styles.cardBio} numberOfLines={2}>{u.bio}</Text> : null}
                  <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                    {!!u.spacesCount && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="home-outline" size={11} color={colors.textMuted} />
                        <Text style={styles.cardMeta}>{u.spacesCount} espacio(s)</Text>
                      </View>
                    )}
                    {!!u.visitersCount && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="paw-outline" size={11} color={colors.textMuted} />
                        <Text style={styles.cardMeta}>{u.visitersCount} visiter(s)</Text>
                      </View>
                    )}
                    {!!u.bookingsCount && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                        <Text style={styles.cardMeta}>{u.bookingsCount} reserva(s)</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textMuted}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
              </View>
            </TouchableOpacity>

            {/* Expandable detail section */}
            {isExpanded && (
              <View style={styles.userDetailSection}>
                {detail?.loading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
                ) : (
                  <>
                    {/* KYC — cédula de identidad (bucket privado, signed URL) */}
                    {(u.kyc_doc_front_url || u.kyc_doc_back_url) ? (
                      <>
                        <Text style={styles.userDetailLabel}>
                          <Ionicons name="card-outline" size={12} color={colors.accent} /> Cédula de identidad
                        </Text>
                        {u.kyc_doc_front_url && <DocViewer url={u.kyc_doc_front_url} label="Ver frente" bucket="kyc-docs" />}
                        {u.kyc_doc_back_url && <DocViewer url={u.kyc_doc_back_url} label="Ver reverso" bucket="kyc-docs" />}
                      </>
                    ) : (
                      <Text style={[styles.userDetailEmpty, { marginBottom: 6 }]}>Sin documento de identidad cargado</Text>
                    )}

                    {/* Decisión de verificación (funciona en web y móvil) */}
                    <Text style={styles.userDetailLabel}>
                      <Ionicons name="shield-checkmark-outline" size={12} color={colors.accent} /> Verificación · {KYC_LABEL[u.kyc_status] ?? u.kyc_status}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                      {u.kyc_status !== 'verified' && (
                        <TouchableOpacity style={[styles.kycDecisionBtn, { backgroundColor: colors.successBg, borderColor: colors.success }]} onPress={() => onUpdateKyc(u.id, 'verified')}>
                          <Ionicons name="checkmark-circle" size={15} color={colors.successText} />
                          <Text style={[styles.kycDecisionText, { color: colors.successText }]}>Verificar</Text>
                        </TouchableOpacity>
                      )}
                      {u.kyc_status !== 'rejected' && (
                        <TouchableOpacity style={[styles.kycDecisionBtn, { backgroundColor: colors.dangerBg, borderColor: colors.danger }]} onPress={() => onUpdateKyc(u.id, 'rejected')}>
                          <Ionicons name="close-circle" size={15} color={colors.dangerText} />
                          <Text style={[styles.kycDecisionText, { color: colors.dangerText }]}>Rechazar</Text>
                        </TouchableOpacity>
                      )}
                      {u.kyc_status !== 'pending' && (
                        <TouchableOpacity style={[styles.kycDecisionBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]} onPress={() => onUpdateKyc(u.id, 'pending')}>
                          <Ionicons name="refresh" size={15} color={colors.textMuted} />
                          <Text style={[styles.kycDecisionText, { color: colors.textMuted }]}>Resetear</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {/* Signed contract (private bucket, signed URL) */}
                    {u.signed_contract_url && (
                      <>
                        <Text style={styles.userDetailLabel}>
                          <Ionicons name="document-text-outline" size={12} color={colors.accent} /> Contrato firmado
                        </Text>
                        <DocViewer url={u.signed_contract_url} label="Ver contrato" bucket="contracts" />
                      </>
                    )}
                    {/* Spaces */}
                    <Text style={styles.userDetailLabel}>
                      <Ionicons name="home-outline" size={12} color={colors.accent} /> Espacios ({detail?.spaces.length ?? 0})
                    </Text>
                    {(detail?.spaces ?? []).length === 0
                      ? <Text style={styles.userDetailEmpty}>Sin espacios</Text>
                      : detail!.spaces.map(s => (
                        <View key={s.id} style={styles.userDetailRow}>
                          <View style={[styles.statusDot, { backgroundColor: s.active ? colors.success : colors.textMuted }]} />
                          <Text style={styles.userDetailText}>{s.title}</Text>
                          <Text style={styles.userDetailMeta}>${s.price_per_night.toLocaleString('es-CL')}/noche</Text>
                        </View>
                      ))
                    }
                    {/* Visiters */}
                    <Text style={[styles.userDetailLabel, { marginTop: 10 }]}>
                      <Ionicons name="paw-outline" size={12} color={colors.lilac} /> Visiters ({detail?.visiters.length ?? 0})
                    </Text>
                    {(detail?.visiters ?? []).length === 0
                      ? <Text style={styles.userDetailEmpty}>Sin visiters</Text>
                      : detail!.visiters.map(v => (
                        <View key={v.id} style={styles.userDetailRow}>
                          <View style={[styles.statusDot, { backgroundColor: v.active ? colors.success : colors.textMuted }]} />
                          <Text style={styles.userDetailText}>{v.name}</Text>
                          <Text style={styles.userDetailMeta}>${v.price_per_visit.toLocaleString('es-CL')}/visita</Text>
                        </View>
                      ))
                    }
                    {/* Bookings */}
                    <Text style={[styles.userDetailLabel, { marginTop: 10 }]}>
                      <Ionicons name="calendar-outline" size={12} color={colors.info} /> Últimas reservas ({detail?.bookings.length ?? 0})
                    </Text>
                    {(detail?.bookings ?? []).length === 0
                      ? <Text style={styles.userDetailEmpty}>Sin reservas</Text>
                      : detail!.bookings.map(b => (
                        <View key={b.id} style={styles.userDetailRow}>
                          <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[b.status] ?? colors.textMuted }]} />
                          <Text style={styles.userDetailText}>{svcLabel(b.service_type)} · {b.start_date}</Text>
                          <Text style={styles.userDetailMeta}>${b.total_price.toLocaleString('es-CL')}</Text>
                        </View>
                      ))
                    }
                  </>
                )}
              </View>
            )}

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, u.is_admin ? styles.actionBtnDanger : styles.actionBtnSecondary]}
                onPress={() => onToggleAdmin(u.id, u.is_admin)}
              >
                <Text style={styles.actionBtnText}>{u.is_admin ? 'Quitar Admin' : 'Hacer Admin'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, u.kyc_status === 'verified' ? styles.actionBtnDanger : styles.actionBtnSuccess]}
                onPress={() => onUpdateKyc(u.id, u.kyc_status === 'verified' ? 'pending' : 'verified')}
              >
                <Ionicons name={u.kyc_status === 'verified' ? 'shield-checkmark-outline' : 'shield-outline'} size={13} color={u.kyc_status === 'verified' ? colors.accent : colors.warning} />
                <Text style={styles.actionBtnText}>{u.kyc_status === 'verified' ? 'Revocar' : 'Verificar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 0, paddingHorizontal: 10, borderColor: `${colors.danger}40`, backgroundColor: `${colors.danger}08` }]}
                onPress={() => onDeleteProfile(u.id, u.full_name ?? 'usuario')}
              >
                <Ionicons name="trash-outline" size={14} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── DocViewer ────────────────────────────────────────────────────────────────

function extractStoragePath(fullUrl: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const alt = `/object/sign/${bucket}/`;
  const idx = fullUrl.indexOf(marker);
  if (idx !== -1) return fullUrl.slice(idx + marker.length).split('?')[0];
  const idx2 = fullUrl.indexOf(alt);
  if (idx2 !== -1) return fullUrl.slice(idx2 + alt.length).split('?')[0];
  return null;
}

function DocViewer({ url, label, bucket = 'kyc-docs' }: { url: string | null | undefined; label: string; bucket?: string }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = async () => {
    if (signedUrl) { setExpanded(e => !e); return; }
    setLoading(true);
    const path = extractStoragePath(url ?? '', bucket);
    if (path) {
      const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (data?.signedUrl) { setSignedUrl(data.signedUrl); setExpanded(true); }
    }
    setLoading(false);
  };

  if (!url) return null;
  const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('application/pdf');

  return (
    <View style={styles.docRow}>
      <TouchableOpacity style={styles.docBtn} onPress={isPdf ? () => { load(); if (signedUrl) Linking.openURL(signedUrl); } : load} activeOpacity={0.75}>
        <Ionicons name={isPdf ? 'document-outline' : 'image-outline'} size={13} color={colors.primary} />
        <Text style={styles.docBtnText}>{label}</Text>
        {loading ? <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} /> : (
          !isPdf && <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textMuted} style={{ marginLeft: 4 }} />
        )}
      </TouchableOpacity>
      {expanded && signedUrl && !isPdf && (
        <TouchableOpacity onPress={() => Linking.openURL(signedUrl)} activeOpacity={0.9}>
          <Image source={{ uri: signedUrl }} style={styles.docImage} resizeMode="contain" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Applications Tab ─────────────────────────────────────────────────────────

function ApplicationsTab({ applications, onApprove, onReject, onRecover }: {
  applications: Application[];
  onApprove: (id: string, userId: string, serviceType: string) => void;
  onReject: (id: string, userId: string, serviceType: string) => void;
  onRecover: (id: string) => void;
}) {
  const pending  = applications.filter(a => a.status === 'pending');
  const approved = applications.filter(a => a.status === 'approved');
  const rejected = applications.filter(a => a.status === 'rejected');

  return (
    <View>
      <Text style={styles.sectionTitle}>Postulaciones Pendientes ({pending.length})</Text>
      {pending.length === 0 && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}><Text style={styles.emptyEmoji}>✅</Text></View>
          <Text style={styles.emptyTitle}>Sin postulaciones pendientes</Text>
        </View>
      )}
      {pending.map(a => {
        const isSpace = a.service_type === 'space';
        return (
          <View key={a.id} style={[styles.card, styles.cardPending]}>
            <Text style={styles.cardName}>
              {a.profiles?.full_name ?? 'Usuario'} {a.profiles?.last_name ?? ''}
            </Text>
            <Text style={styles.cardMeta}>
              {isSpace ? '🏠 Alojamiento' : '🚗 Visita'} · {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('es-CL') : '—'}
            </Text>

            {/* Documents */}
            <View style={styles.docSection}>
              <Text style={styles.docSectionTitle}>Documentos</Text>
              <DocViewer url={a.kyc_doc_url} label="DNI / Cédula" />
              <DocViewer url={a.selfie_url} label="Selfie con documento" />
              <DocViewer url={a.safety_evidence_url} label={isSpace ? 'Foto malla de seguridad' : 'Antecedentes penales'} />
              <DocViewer url={a.evidence_url_2} label={isSpace ? 'Foto rascador' : 'Certificado veterinario'} />
              {!a.kyc_doc_url && !a.selfie_url && !a.safety_evidence_url && !a.evidence_url_2 && (
                <Text style={styles.docMissing}>Sin documentos adjuntos</Text>
              )}
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSuccess]}
                onPress={() => onApprove(a.id, a.applicant_id, a.service_type)}
              >
                <Ionicons name="checkmark-outline" size={14} color={colors.accent} />
                <Text style={styles.actionBtnText}>Aprobar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => onReject(a.id, a.applicant_id, a.service_type)}
              >
                <Ionicons name="close-outline" size={14} color={colors.danger} />
                <Text style={styles.actionBtnText}>Rechazar</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      {approved.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Aprobadas ({approved.length})</Text>
          {approved.map(a => (
            <View key={a.id} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: colors.accent }]}>
              <Text style={styles.cardName}>
                {a.profiles?.full_name ?? 'Usuario'} {a.profiles?.last_name ?? ''}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="checkmark-circle-outline" size={12} color={colors.accent} />
                <Text style={styles.cardMeta}>{a.service_type} · aprobada · {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('es-CL') : '—'}</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {rejected.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Rechazadas ({rejected.length})</Text>
          {rejected.map(a => (
            <View key={a.id} style={[styles.card, { borderLeftWidth: 3, borderLeftColor: colors.danger }]}>
              <Text style={styles.cardName}>
                {a.profiles?.full_name ?? 'Usuario'} {a.profiles?.last_name ?? ''}
              </Text>
              <Text style={styles.cardMeta}>
                {a.service_type} · {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('es-CL') : '—'}
              </Text>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSecondary]}
                  onPress={() => onRecover(a.id)}
                >
                  <Ionicons name="refresh-outline" size={14} color={colors.primary} />
                  <Text style={styles.actionBtnText}>Recuperar postulación</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ payments, onConfirm }: { payments: PendingPayment[]; onConfirm: (id: string) => void }) {
  const fmt = (n: number) => `$${n.toLocaleString('es-CL')}`;
  return (
    <View>
      <Text style={styles.sectionTitle}>Comprobantes Pendientes ({payments.length})</Text>
      {payments.length === 0 && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}><Text style={styles.emptyEmoji}>📋</Text></View>
          <Text style={styles.emptyTitle}>Sin comprobantes pendientes</Text>
        </View>
      )}
      {payments.map(p => (
        <View key={p.id} style={[styles.card, { borderColor: colors.warning, borderWidth: 1.5 }]}>
          <Text style={styles.cardName}>{p.profiles?.full_name ?? 'Usuario'}</Text>
          <Text style={styles.cardMeta}>
            {svcLabel(p.service_type)} · {p.start_date} → {p.end_date}
          </Text>
          <Text style={[styles.cardName, { color: colors.primary, marginTop: 4 }]}>{fmt(p.total_price)}</Text>
          {p.payment_receipt_url ? (
            <View style={{ marginTop: 8 }}>
              <DocViewer url={p.payment_receipt_url} label="Ver comprobante" bucket="receipts" />
            </View>
          ) : null}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSuccess]}
              onPress={() => {
                const msg = `¿Confirmar la transferencia de ${fmt(p.total_price)} de ${p.profiles?.full_name ?? 'este usuario'}?`;
                if (Platform.OS === 'web') {
                  if ((window as any).confirm(msg)) onConfirm(p.id);
                } else {
                  Alert.alert('Confirmar pago', msg, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Confirmar', onPress: () => onConfirm(p.id) },
                  ]);
                }
              }}
            >
              <Ionicons name="checkmark-outline" size={14} color={colors.accent} />
              <Text style={styles.actionBtnText}>Confirmar pago</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Bookings Tab ─────────────────────────────────────────────────────────────

function BookingsTab({ bookings, onUpdateStatus, onConfirmPayment }: {
  bookings: AdminBooking[];
  onUpdateStatus: (id: string, status: string) => void;
  onConfirmPayment: (id: string) => void;
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Reservas Recientes ({bookings.length})</Text>
      {bookings.length === 0 && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}><Text style={styles.emptyEmoji}>📅</Text></View>
          <Text style={styles.emptyTitle}>Sin reservas registradas</Text>
        </View>
      )}
      {bookings.map(b => (
        <View key={b.id} style={styles.card}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{b.profiles?.full_name ?? 'Usuario'}</Text>
              <Text style={styles.cardMeta}>
                {svcLabel(b.service_type)} · {b.start_date} → {b.end_date}
              </Text>
              <Text style={styles.cardMeta}>
                ${b.total_price.toLocaleString('es-CL')} CLP
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[b.status] ?? colors.textMuted}20`, borderColor: STATUS_COLOR[b.status] ?? colors.textMuted }]}>
                <Text style={[styles.statusText, { color: STATUS_COLOR[b.status] ?? colors.textMuted }]}>{b.status}</Text>
              </View>
              {b.status === 'active' && (
                <View style={{ backgroundColor: b.service_phase === 'in_progress' ? colors.successBg : `${colors.primary}10`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: b.service_phase === 'in_progress' ? colors.successBorder : `${colors.primary}30` }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: b.service_phase === 'in_progress' ? colors.successText : colors.primaryDark }}>
                    {b.service_phase === 'in_progress' ? '🟢 EN CURSO' : '⏳ POR INICIAR'}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {/* Comprobante de pago (si el cliente lo subió) — visible antes de confirmar */}
          {b.status === 'pending' && (
            b.payment_receipt_url ? (
              <View style={{ marginTop: 10 }}>
                <DocViewer url={b.payment_receipt_url} label="Ver comprobante de pago" bucket="receipts" />
              </View>
            ) : (
              <View style={styles.noReceiptRow}>
                <Ionicons name="alert-circle-outline" size={15} color={colors.warningText} />
                <Text style={styles.noReceiptText}>El cliente aún no sube comprobante de pago.</Text>
              </View>
            )
          )}
          {(b.status === 'pending' || b.status === 'active') && (
            <View style={[styles.cardActions, { marginTop: 10 }]}>
              {b.status === 'pending' && b.payment_receipt_url && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSuccess]}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      if ((window as any).confirm('¿Confirmaste el comprobante? Se activará la reserva y el pago quedará como confirmado.')) onConfirmPayment(b.id);
                    } else {
                      Alert.alert('Confirmar pago', '¿Confirmaste el comprobante? Se activará la reserva y el pago quedará como confirmado.', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Confirmar', onPress: () => onConfirmPayment(b.id) },
                      ]);
                    }
                  }}
                >
                  <Ionicons name="checkmark-outline" size={14} color={colors.accent} />
                  <Text style={styles.actionBtnText}>Confirmar pago</Text>
                </TouchableOpacity>
              )}
              {b.status === 'active' && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnSuccess]}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      if ((window as any).confirm('¿Marcar esta reserva como completada?')) onUpdateStatus(b.id, 'completed');
                    } else {
                      Alert.alert('Completar reserva', '¿Marcar como completada?', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Completar', onPress: () => onUpdateStatus(b.id, 'completed') },
                      ]);
                    }
                  }}
                >
                  <Ionicons name="checkmark-circle-outline" size={14} color={colors.accent} />
                  <Text style={styles.actionBtnText}>Completar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    if ((window as any).confirm('¿Confirmar la cancelación de esta reserva?')) onUpdateStatus(b.id, 'cancelled');
                  } else {
                    Alert.alert('Cancelar reserva', '¿Confirmar cancelación?', [
                      { text: 'Volver', style: 'cancel' },
                      { text: 'Cancelar', style: 'destructive', onPress: () => onUpdateStatus(b.id, 'cancelled') },
                    ]);
                  }
                }}
              >
                <Ionicons name="close-circle-outline" size={14} color={colors.danger} />
                <Text style={styles.actionBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20,
    backgroundColor: colors.primaryDark ?? colors.primary,
    overflow: 'hidden',
  },
  backBtn: { padding: 8 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerIcon: { fontSize: 28, marginBottom: 4 },
  headerTitle: { fontFamily: fonts.display, fontSize: 21, color: '#fff', letterSpacing: 0.2 },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 2, letterSpacing: 0.3 },

  // Tab pills
  tabBarWrapper: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 10 },
  tabBar: { paddingHorizontal: 14, gap: 8 },
  tabPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background },
  tabPillActive: { backgroundColor: colors.primary },
  tabPillText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  tabPillTextActive: { color: '#fff' },
  tabBadge: { backgroundColor: colors.danger, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: colors.textMain, marginBottom: 12 },

  // Stat grid (2 cols)
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  statCard: {
    width: '47.5%', backgroundColor: colors.surface, borderRadius: 14,
    padding: 16, alignItems: 'flex-start', borderTopWidth: 3, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 28, fontWeight: '900', lineHeight: 32, marginBottom: 4, color: colors.textMain, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },

  // Dashboard rediseñado
  revenueCard: { backgroundColor: colors.primary, borderRadius: 16, padding: 18, marginBottom: 14 },
  revenueTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  revenueLabel: { fontSize: 12, color: '#fff', opacity: 0.85, fontWeight: '700' },
  revenueValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  revenueValue: { fontSize: 30, fontWeight: '900', color: '#fff', fontVariant: ['tabular-nums'] },
  deltaBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  deltaUp: { backgroundColor: colors.success },
  deltaDown: { backgroundColor: colors.danger },
  deltaText: { color: '#fff', fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  revenueIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  revenueChips: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  revenueChip: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  revenueChipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  chartCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginTop: 14, borderWidth: 1, borderColor: colors.border },
  chartTitle: { fontSize: 14, fontWeight: '800', color: colors.textMain },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 130, marginTop: 14, gap: 6 },
  barCol: { flex: 1, alignItems: 'center' },
  barValue: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 4, height: 14, fontVariant: ['tabular-nums'] },
  barValueActive: { color: colors.primary, fontWeight: '900' },
  bar: { width: '62%', backgroundColor: colors.primary, borderRadius: 5, minHeight: 4 },
  barMuted: { backgroundColor: `${colors.primary}2E` },
  barLabel: { fontSize: 10, color: colors.textMuted, marginTop: 6, fontWeight: '600' },
  barLabelActive: { color: colors.textMain, fontWeight: '800' },
  statusBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  statusBarLabel: { fontSize: 12, color: colors.textMain, fontWeight: '600', width: 88 },
  statusBarTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.background, overflow: 'hidden' },
  statusBarFill: { height: 10, borderRadius: 5 },
  statusBarCount: { fontSize: 12, fontWeight: '800', color: colors.textMain, width: 28, textAlign: 'right', fontVariant: ['tabular-nums'] },
  servicesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 4, paddingVertical: 6 },
  servicesSubhead: { fontSize: 13, fontWeight: '800', color: colors.textMain, marginBottom: 6 },

  // Expandable cards
  expandCard: { backgroundColor: colors.surface, borderRadius: 14, marginBottom: 10, borderTopWidth: 3, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  expandCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  expandCardLeft: { flexDirection: 'row', alignItems: 'center' },
  expandCardValue: { fontSize: 22, fontWeight: '800', lineHeight: 26 },
  expandCardLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  expandContent: { borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 14, paddingBottom: 10, paddingTop: 8 },
  expandEmpty: { fontSize: 13, color: colors.textMuted, paddingVertical: 8, textAlign: 'center' },
  expandRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: `${colors.border}80` },
  expandRowName: { fontSize: 13, fontWeight: '700', color: colors.textMain },
  expandRowMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  expandSeeAll: { marginTop: 10, alignItems: 'center' },
  expandSeeAllText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  miniAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  miniAvatarText: { fontSize: 12, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  expandRowActions: { flexDirection: 'row', gap: 6, paddingLeft: 26, paddingTop: 4 },
  miniActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  miniActionText: { fontSize: 11, fontWeight: '700' },

  searchInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, fontSize: 14, color: colors.textMain, marginBottom: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardPending: { borderColor: colors.warning, borderWidth: 1.5 },
  docSection: { marginTop: 10, marginBottom: 4, gap: 4 },
  docSectionTitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  docRow: { gap: 6 },
  docBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${colors.primary}0D`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: `${colors.primary}25`, alignSelf: 'flex-start' },
  docBtnText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  docImage: { width: '100%', height: 220, borderRadius: 10, marginTop: 6, backgroundColor: colors.border },
  docMissing: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.textMain, marginBottom: 2 },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  cardBio: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 },
  actionBtnSuccess: { backgroundColor: `${colors.accent}20`, borderWidth: 1, borderColor: colors.accent },
  actionBtnDanger: { backgroundColor: `${colors.danger}10`, borderWidth: 1, borderColor: colors.danger },
  actionBtnSecondary: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: colors.textMain },
  noReceiptRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10, backgroundColor: colors.warningBg, borderRadius: 8, borderWidth: 1, borderColor: colors.warningBorder, paddingHorizontal: 10, paddingVertical: 8 },
  noReceiptText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.warningText },
  kycDecisionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: 15, borderRadius: 10, borderWidth: 1 },
  kycDecisionText: { fontSize: 13, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyState: { backgroundColor: colors.surface, borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: 8 },
  emptyIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyEmoji: { fontSize: 28 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.textMain, textAlign: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  tagText: { fontSize: 11, fontWeight: '700' },
  userDetailSection: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 10 },
  userDetailLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  userDetailEmpty: { fontSize: 12, color: colors.textMuted, paddingBottom: 4, fontStyle: 'italic' },
  userDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  userDetailText: { flex: 1, fontSize: 13, color: colors.textMain, fontWeight: '600' },
  userDetailMeta: { fontSize: 12, color: colors.textMuted },
});
