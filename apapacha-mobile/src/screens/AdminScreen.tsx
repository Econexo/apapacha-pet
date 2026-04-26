import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { supabase } from '../../supabase';
import { useAuth } from '../context/AuthContext';

type Tab = 'dashboard' | 'users' | 'applications' | 'bookings';

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
  created_at: string;
}

interface Application {
  id: string;
  applicant_id: string;
  service_type: string;
  status: string;
  submitted_at: string;
  profiles: { full_name: string; last_name: string | null } | null;
}

interface AdminBooking {
  id: string;
  service_type: string;
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
  created_at: string;
  profiles: { full_name: string } | null;
}

export function AdminScreen() {
  const navigation = useNavigation();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!profile?.is_admin) {
      navigation.goBack();
      return;
    }
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadUsers(), loadApplications(), loadBookings()]);
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
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
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, last_name, age, address, bio, role, kyc_status, is_admin, created_at')
      .order('created_at', { ascending: false });
    setUsers(data ?? []);
  }

  async function loadApplications() {
    const { data } = await supabase
      .from('host_applications')
      .select('id, applicant_id, service_type, status, submitted_at, profiles(full_name, last_name)')
      .order('submitted_at', { ascending: false });
    setApplications((data ?? []) as unknown as Application[]);
  }

  async function loadBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('id, service_type, start_date, end_date, status, total_price, created_at, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(50);
    setBookings((data ?? []) as unknown as AdminBooking[]);
  }

  async function approveApplication(id: string, userId: string) {
    const { error } = await supabase.rpc('approve_host', { target_user_id: userId });
    if (error) { Alert.alert('Error', error.message); return; }
    await supabase.from('host_applications').update({ status: 'approved' }).eq('id', id);
    Alert.alert('✅ Aprobado', 'El cuidador fue aprobado.');
    loadApplications();
    loadStats();
  }

  async function rejectApplication(id: string) {
    await supabase.from('host_applications').update({ status: 'rejected' }).eq('id', id);
    Alert.alert('Rechazado', 'La postulación fue rechazada.');
    loadApplications();
    loadStats();
  }

  async function toggleAdmin(userId: string, current: boolean) {
    await supabase.from('profiles').update({ is_admin: !current }).eq('id', userId);
    loadUsers();
  }

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Panel Admin</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['dashboard', 'users', 'applications', 'bookings'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'dashboard' ? '📊' : tab === 'users' ? '👥' : tab === 'applications' ? '📝' : '📅'}
            </Text>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'dashboard' ? 'Stats' : tab === 'users' ? 'Usuarios' : tab === 'applications' ? 'Postulaciones' : 'Reservas'}
            </Text>
            {tab === 'applications' && (stats?.pendingApplications ?? 0) > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{stats?.pendingApplications}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
        {activeTab === 'users' && (
          <UsersTab
            users={filteredUsers}
            search={search}
            onSearch={setSearch}
            onToggleAdmin={toggleAdmin}
          />
        )}
        {activeTab === 'applications' && (
          <ApplicationsTab
            applications={applications}
            onApprove={approveApplication}
            onReject={rejectApplication}
          />
        )}
        {activeTab === 'bookings' && <BookingsTab bookings={bookings} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function DashboardTab({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  const cards = [
    { label: 'Usuarios', value: stats.totalUsers, icon: '👥', color: colors.primary },
    { label: 'Espacios', value: stats.totalSpaces, icon: '🏠', color: colors.accent },
    { label: 'Visiters', value: stats.totalVisitors, icon: '🐾', color: colors.lilac },
    { label: 'Reservas', value: stats.totalBookings, icon: '📅', color: colors.info },
    { label: 'Activas', value: stats.activeBookings, icon: '✅', color: colors.success },
    { label: 'Pendientes', value: stats.pendingApplications, icon: '⏳', color: colors.warning },
  ];
  return (
    <View>
      <Text style={styles.sectionTitle}>Resumen General</Text>
      <View style={styles.statsGrid}>
        {cards.map(c => (
          <View key={c.label} style={[styles.statCard, { borderTopColor: c.color }]}>
            <Text style={styles.statIcon}>{c.icon}</Text>
            <Text style={[styles.statValue, { color: c.color }]}>{c.value}</Text>
            <Text style={styles.statLabel}>{c.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function UsersTab({ users, search, onSearch, onToggleAdmin }: {
  users: AdminUser[]; search: string;
  onSearch: (v: string) => void;
  onToggleAdmin: (id: string, current: boolean) => void;
}) {
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
      {users.map(u => (
        <View key={u.id} style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(u.full_name?.[0] ?? '?').toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{u.full_name} {u.last_name ?? ''}</Text>
              <Text style={styles.cardMeta}>
                {u.role} · {u.kyc_status}
                {u.age ? ` · ${u.age} años` : ''}
              </Text>
              {u.address ? <Text style={styles.cardMeta}>📍 {u.address}</Text> : null}
              {u.bio ? <Text style={styles.cardBio} numberOfLines={2}>{u.bio}</Text> : null}
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, u.is_admin ? styles.actionBtnDanger : styles.actionBtnSecondary]}
              onPress={() => onToggleAdmin(u.id, u.is_admin)}
            >
              <Text style={styles.actionBtnText}>{u.is_admin ? 'Quitar Admin' : 'Hacer Admin'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

function ApplicationsTab({ applications, onApprove, onReject }: {
  applications: Application[];
  onApprove: (id: string, userId: string) => void;
  onReject: (id: string) => void;
}) {
  const pending = applications.filter(a => a.status === 'pending');
  const rest = applications.filter(a => a.status !== 'pending');
  return (
    <View>
      <Text style={styles.sectionTitle}>
        Postulaciones Pendientes ({pending.length})
      </Text>
      {pending.length === 0 && (
        <View style={styles.emptyState}><Text style={styles.emptyText}>Sin postulaciones pendientes ✅</Text></View>
      )}
      {pending.map(a => (
        <View key={a.id} style={[styles.card, styles.cardPending]}>
          <Text style={styles.cardName}>
            {a.profiles?.full_name ?? 'Usuario'} {a.profiles?.last_name ?? ''}
          </Text>
          <Text style={styles.cardMeta}>
            Tipo: {a.service_type} · {new Date(a.submitted_at).toLocaleDateString('es-CL')}
          </Text>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSuccess]}
              onPress={() => onApprove(a.id, a.applicant_id)}
            >
              <Text style={styles.actionBtnText}>✅ Aprobar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={() => onReject(a.id)}
            >
              <Text style={styles.actionBtnText}>❌ Rechazar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {rest.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Historial</Text>
          {rest.map(a => (
            <View key={a.id} style={styles.card}>
              <Text style={styles.cardName}>
                {a.profiles?.full_name ?? 'Usuario'} {a.profiles?.last_name ?? ''}
              </Text>
              <Text style={styles.cardMeta}>
                {a.service_type} · {a.status} · {new Date(a.submitted_at).toLocaleDateString('es-CL')}
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function BookingsTab({ bookings }: { bookings: AdminBooking[] }) {
  const STATUS_COLOR: Record<string, string> = {
    pending: colors.warning,
    active: colors.accent,
    completed: colors.success,
    cancelled: colors.danger,
  };
  return (
    <View>
      <Text style={styles.sectionTitle}>Reservas Recientes ({bookings.length})</Text>
      {bookings.map(b => (
        <View key={b.id} style={styles.card}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{b.profiles?.full_name ?? 'Usuario'}</Text>
              <Text style={styles.cardMeta}>
                {b.service_type} · {b.start_date} → {b.end_date}
              </Text>
              <Text style={styles.cardMeta}>
                ${b.total_price.toLocaleString('es-CL')} CLP
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[b.status]}20`, borderColor: STATUS_COLOR[b.status] }]}>
              <Text style={[styles.statusText, { color: STATUS_COLOR[b.status] }]}>{b.status}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 24, color: colors.primary },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 18, opacity: 0.4 },
  tabTextActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  tabLabelActive: { color: colors.primary },
  badge: { position: 'absolute', top: 6, right: 8, backgroundColor: colors.danger, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '30%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 14, alignItems: 'center', borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statIcon: { fontSize: 24, marginBottom: 6 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  searchInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, fontSize: 14, color: colors.textMain, marginBottom: 16 },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardPending: { borderColor: colors.warning, borderWidth: 1.5 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardName: { fontSize: 15, fontWeight: '700', color: colors.textMain, marginBottom: 2 },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  cardBio: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionBtnSuccess: { backgroundColor: `${colors.accent}20`, borderWidth: 1, borderColor: colors.accent },
  actionBtnDanger: { backgroundColor: `${colors.danger}10`, borderWidth: 1, borderColor: colors.danger },
  actionBtnSecondary: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: colors.textMain },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyState: { backgroundColor: colors.surface, borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
