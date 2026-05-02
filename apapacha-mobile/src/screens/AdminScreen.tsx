import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { supabase } from '../../supabase';
import { useAuth } from '../context/AuthContext';
import { confirmBookingPayment } from '../services/bookings.service';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, IoniconName> = {
  dashboard:    'stats-chart-outline',
  users:        'people-outline',
  applications: 'document-text-outline',
  payments:     'card-outline',
  bookings:     'calendar-outline',
};

const SUPABASE_FUNCTIONS_URL = 'https://mzqvkzjxubuqpdnznigy.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cXZremp4dWJ1cXBkbnpuaWd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzY2NTAsImV4cCI6MjA5MTE1MjY1MH0.t4TBnmyyKDPqTZiFOwXbko-Qa4pdund9lr6fydeRdfQ';

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
  signed_contract_url: string | null;
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
  submitted_at: string;
  welcome_email_sent: boolean;
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

interface PendingPayment {
  id: string;
  total_price: number;
  payment_receipt_url: string | null;
  start_date: string;
  end_date: string;
  service_type: string;
  created_at: string;
  profiles: { full_name: string } | null;
}

export function AdminScreen() {
  const navigation = useNavigation();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [spaces, setSpaces] = useState<AdminSpace[]>([]);
  const [visiters, setVisiters] = useState<AdminVisiter[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
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
    await Promise.all([
      loadStats(), loadUsers(), loadSpaces(), loadVisiters(),
      loadApplications(), loadBookings(), loadPendingPayments(),
    ]);
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
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, last_name, age, address, bio, role, kyc_status, is_admin, signed_contract_url, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[AdminScreen] loadUsers query error:', error.message);
      return setUsers([]);
    }
    if (!profiles || profiles.length === 0) return setUsers([]);

    try {
      const enriched = await Promise.all(profiles.map(async (p) => {
        const [s, v, b] = await Promise.all([
          supabase.from('spaces').select('id', { count: 'exact', head: true }).eq('host_id', p.id),
          supabase.from('visiters').select('id', { count: 'exact', head: true }).eq('host_id', p.id),
          supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('owner_id', p.id),
        ]);
        return { ...p, spacesCount: s.count ?? 0, visitersCount: v.count ?? 0, bookingsCount: b.count ?? 0 };
      }));
      setUsers(enriched);
    } catch (e) {
      console.error('[AdminScreen] loadUsers enrichment error:', e);
      setUsers(profiles.map(p => ({ ...p, spacesCount: 0, visitersCount: 0, bookingsCount: 0 })));
    }
  }

  async function loadSpaces() {
    const { data } = await supabase
      .from('spaces')
      .select('id, title, location, price_per_night, active')
      .order('created_at', { ascending: false });
    setSpaces((data ?? []) as AdminSpace[]);
  }

  async function loadVisiters() {
    const { data } = await supabase
      .from('visiters')
      .select('id, name, profession_title, price_per_visit, active')
      .order('created_at', { ascending: false });
    setVisiters((data ?? []) as AdminVisiter[]);
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

  async function loadPendingPayments() {
    const { data } = await supabase
      .from('bookings')
      .select('id, total_price, payment_receipt_url, start_date, end_date, service_type, created_at, profiles(full_name)')
      .eq('payment_status', 'receipt_submitted')
      .order('created_at', { ascending: false });
    setPendingPayments((data ?? []) as unknown as PendingPayment[]);
  }

  async function handleConfirmPayment(bookingId: string) {
    try {
      await confirmBookingPayment(bookingId);
      Alert.alert('✅ Pago confirmado', 'La reserva está ahora activa.');
      loadPendingPayments();
      loadStats();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function approveApplication(id: string, userId: string, serviceType: string) {
    const { error } = await supabase.rpc('approve_host', { target_user_id: userId });
    if (error) { Alert.alert('Error', error.message); return; }
    await supabase.from('host_applications').update({ status: 'approved' }).eq('id', id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${SUPABASE_FUNCTIONS_URL}/send-approval-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ applicant_id: userId, application_id: id, service_type: serviceType }),
      });
      Alert.alert('✅ Aprobado', 'El cuidador fue aprobado y se envió el correo de bienvenida con el contrato.');
    } catch {
      Alert.alert('✅ Aprobado', 'El cuidador fue aprobado. No se pudo enviar el correo automáticamente.');
    }
    loadApplications();
    loadStats();
  }

  async function rejectApplication(id: string) {
    await supabase.from('host_applications').update({ status: 'rejected' }).eq('id', id);
    Alert.alert('Rechazado', 'La postulación fue rechazada.');
    loadApplications();
    loadStats();
  }

  async function recoverApplication(id: string) {
    await supabase.from('host_applications').update({ status: 'pending' }).eq('id', id);
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
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Panel Admin</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabBar}>
        {(['dashboard', 'users', 'applications', 'payments', 'bookings'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={TAB_ICONS[tab]}
              size={20}
              color={activeTab === tab ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'dashboard' ? 'Stats' : tab === 'users' ? 'Usuarios' : tab === 'applications' ? 'Postul.' : tab === 'payments' ? 'Pagos' : 'Reservas'}
            </Text>
            {tab === 'applications' && (stats?.pendingApplications ?? 0) > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{stats?.pendingApplications}</Text></View>
            )}
            {tab === 'payments' && pendingPayments.length > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{pendingPayments.length}</Text></View>
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
        {activeTab === 'dashboard' && (
          <DashboardTab
            stats={stats}
            users={users}
            spaces={spaces}
            visiters={visiters}
            bookings={bookings}
            applications={applications}
            onTabChange={setActiveTab}
          />
        )}
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
            onApprove={(id, userId, serviceType) => approveApplication(id, userId, serviceType)}
            onReject={rejectApplication}
            onRecover={recoverApplication}
          />
        )}
        {activeTab === 'payments' && (
          <PaymentsTab payments={pendingPayments} onConfirm={handleConfirmPayment} />
        )}
        {activeTab === 'bookings' && <BookingsTab bookings={bookings} />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

type CardKey = 'users' | 'spaces' | 'visiters' | 'bookings' | 'active' | 'pending';

function DashboardTab({ stats, users, spaces, visiters, bookings, applications, onTabChange }: {
  stats: Stats | null;
  users: AdminUser[];
  spaces: AdminSpace[];
  visiters: AdminVisiter[];
  bookings: AdminBooking[];
  applications: Application[];
  onTabChange: (tab: Tab) => void;
}) {
  const [expanded, setExpanded] = useState<CardKey | null>(null);

  if (!stats) return null;

  const toggle = (key: CardKey) => setExpanded(prev => prev === key ? null : key);

  const activeBookings = bookings.filter(b => b.status === 'active');
  const pendingApps = applications.filter(a => a.status === 'pending');

  const cards: { key: CardKey; label: string; value: number; icon: IoniconName; color: string }[] = [
    { key: 'users',    label: 'Usuarios',   value: stats.totalUsers,          icon: 'people-outline',           color: colors.primary  },
    { key: 'spaces',   label: 'Espacios',   value: stats.totalSpaces,         icon: 'home-outline',             color: colors.accent   },
    { key: 'visiters', label: 'Visiters',   value: stats.totalVisitors,       icon: 'paw-outline',              color: colors.lilac    },
    { key: 'bookings', label: 'Reservas',   value: stats.totalBookings,       icon: 'calendar-outline',         color: colors.info     },
    { key: 'active',   label: 'Activas',    value: stats.activeBookings,      icon: 'checkmark-circle-outline', color: colors.success  },
    { key: 'pending',  label: 'Pendientes', value: stats.pendingApplications, icon: 'time-outline',             color: colors.warning  },
  ];

  return (
    <View>
      <Text style={styles.sectionTitle}>Resumen General</Text>
      {cards.map(c => {
        const isOpen = expanded === c.key;
        return (
          <View key={c.key} style={[styles.expandCard, { borderTopColor: c.color }]}>
            <TouchableOpacity
              style={styles.expandCardHeader}
              onPress={() => toggle(c.key)}
              activeOpacity={0.7}
            >
              <View style={styles.expandCardLeft}>
                <Ionicons name={c.icon} size={22} color={c.color} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.expandCardValue, { color: c.color }]}>{c.value}</Text>
                  <Text style={styles.expandCardLabel}>{c.label}</Text>
                </View>
              </View>
              <Ionicons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textMuted}
              />
            </TouchableOpacity>

            {isOpen && (
              <View style={styles.expandContent}>
                {c.key === 'users' && (
                  users.length === 0
                    ? <Text style={styles.expandEmpty}>Sin usuarios registrados</Text>
                    : users.map(u => (
                      <View key={u.id} style={styles.expandRow}>
                        <View style={[styles.miniAvatar, { backgroundColor: u.role === 'host' ? `${colors.accent}30` : `${colors.primary}20` }]}>
                          <Text style={[styles.miniAvatarText, { color: u.role === 'host' ? colors.accent : colors.primary }]}>
                            {(u.full_name?.[0] ?? '?').toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.expandRowName}>{u.full_name ?? '(sin nombre)'} {u.last_name ?? ''}</Text>
                          <Text style={styles.expandRowMeta}>{u.role === 'host' ? 'Cuidador' : u.is_admin ? 'Admin' : 'Cliente'} · KYC: {u.kyc_status}</Text>
                        </View>
                      </View>
                    ))
                )}

                {c.key === 'spaces' && (
                  spaces.length === 0
                    ? <Text style={styles.expandEmpty}>Sin espacios publicados</Text>
                    : spaces.map(s => (
                      <View key={s.id} style={styles.expandRow}>
                        <Ionicons name="home-outline" size={16} color={colors.accent} style={{ marginRight: 10, marginTop: 1 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.expandRowName}>{s.title}</Text>
                          <Text style={styles.expandRowMeta}>{s.location} · ${s.price_per_night.toLocaleString('es-CL')}/noche · {s.active ? 'Activo' : 'Inactivo'}</Text>
                        </View>
                      </View>
                    ))
                )}

                {c.key === 'visiters' && (
                  visiters.length === 0
                    ? <Text style={styles.expandEmpty}>Sin visiters publicados</Text>
                    : visiters.map(v => (
                      <View key={v.id} style={styles.expandRow}>
                        <Ionicons name="paw-outline" size={16} color={colors.lilac} style={{ marginRight: 10, marginTop: 1 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.expandRowName}>{v.name}</Text>
                          <Text style={styles.expandRowMeta}>{v.profession_title} · ${v.price_per_visit.toLocaleString('es-CL')}/visita · {v.active ? 'Activo' : 'Inactivo'}</Text>
                        </View>
                      </View>
                    ))
                )}

                {c.key === 'bookings' && (
                  bookings.length === 0
                    ? <Text style={styles.expandEmpty}>Sin reservas</Text>
                    : bookings.slice(0, 10).map(b => (
                      <View key={b.id} style={styles.expandRow}>
                        <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[b.status] ?? colors.textMuted, marginRight: 10, marginTop: 5 }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.expandRowName}>{b.profiles?.full_name ?? 'Usuario'}</Text>
                          <Text style={styles.expandRowMeta}>{b.service_type} · {b.start_date} → {b.end_date} · ${b.total_price.toLocaleString('es-CL')}</Text>
                        </View>
                      </View>
                    ))
                )}

                {c.key === 'active' && (
                  activeBookings.length === 0
                    ? <Text style={styles.expandEmpty}>Sin reservas activas en este momento</Text>
                    : activeBookings.map(b => (
                      <View key={b.id} style={styles.expandRow}>
                        <View style={[styles.statusDot, { backgroundColor: colors.success, marginRight: 10, marginTop: 5 }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.expandRowName}>{b.profiles?.full_name ?? 'Usuario'}</Text>
                          <Text style={styles.expandRowMeta}>{b.service_type} · {b.start_date} → {b.end_date}</Text>
                        </View>
                      </View>
                    ))
                )}

                {c.key === 'pending' && (
                  pendingApps.length === 0
                    ? <Text style={styles.expandEmpty}>Sin postulaciones pendientes</Text>
                    : pendingApps.map(a => (
                      <View key={a.id} style={styles.expandRow}>
                        <Ionicons name="time-outline" size={16} color={colors.warning} style={{ marginRight: 10, marginTop: 1 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.expandRowName}>{a.profiles?.full_name ?? 'Usuario'} {a.profiles?.last_name ?? ''}</Text>
                          <Text style={styles.expandRowMeta}>{a.service_type} · {new Date(a.submitted_at).toLocaleDateString('es-CL')}</Text>
                        </View>
                      </View>
                    ))
                )}

                {(c.key === 'users' || c.key === 'bookings' || c.key === 'pending') && (
                  <TouchableOpacity
                    style={styles.expandSeeAll}
                    onPress={() => {
                      setExpanded(null);
                      onTabChange(c.key === 'users' ? 'users' : c.key === 'pending' ? 'applications' : 'bookings');
                    }}
                  >
                    <Text style={styles.expandSeeAllText}>Ver todos en pestaña →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const STATUS_COLOR: Record<string, string> = {
  pending: colors.warning,
  active: colors.accent,
  completed: colors.success,
  cancelled: colors.danger,
};

// ─── Users Tab ────────────────────────────────────────────────────────────────

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
      {users.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>Sin usuarios registrados</Text>
        </View>
      )}
      {users.map(u => (
        <View key={u.id} style={styles.card}>
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

// ─── Applications Tab ─────────────────────────────────────────────────────────

function ApplicationsTab({ applications, onApprove, onReject, onRecover }: {
  applications: Application[];
  onApprove: (id: string, userId: string, serviceType: string) => void;
  onReject: (id: string) => void;
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
          <Ionicons name="checkmark-circle-outline" size={32} color={colors.accent} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>Sin postulaciones pendientes</Text>
        </View>
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
              onPress={() => onApprove(a.id, a.applicant_id, a.service_type)}
            >
              <Ionicons name="checkmark-outline" size={14} color={colors.accent} />
              <Text style={styles.actionBtnText}>Aprobar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={() => onReject(a.id)}
            >
              <Ionicons name="close-outline" size={14} color={colors.danger} />
              <Text style={styles.actionBtnText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

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
                <Text style={styles.cardMeta}>{a.service_type} · aprobada · {new Date(a.submitted_at).toLocaleDateString('es-CL')}</Text>
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
                {a.service_type} · {new Date(a.submitted_at).toLocaleDateString('es-CL')}
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
          <Ionicons name="checkmark-circle-outline" size={32} color={colors.accent} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>Sin comprobantes pendientes</Text>
        </View>
      )}
      {payments.map(p => (
        <View key={p.id} style={[styles.card, { borderColor: colors.warning, borderWidth: 1.5 }]}>
          <Text style={styles.cardName}>{p.profiles?.full_name ?? 'Usuario'}</Text>
          <Text style={styles.cardMeta}>
            {p.service_type} · {p.start_date} → {p.end_date}
          </Text>
          <Text style={[styles.cardName, { color: colors.primary, marginTop: 4 }]}>{fmt(p.total_price)}</Text>
          {p.payment_receipt_url ? (
            <TouchableOpacity
              style={{ marginTop: 8, backgroundColor: `${colors.primary}10`, borderRadius: 8, padding: 8, borderWidth: 1, borderColor: `${colors.primary}30`, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              onPress={() => Alert.alert('Comprobante', p.payment_receipt_url ?? '')}
            >
              <Ionicons name="attach-outline" size={14} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Ver comprobante</Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSuccess]}
              onPress={() => Alert.alert(
                'Confirmar pago',
                `¿Confirmar la transferencia de ${fmt(p.total_price)} de ${p.profiles?.full_name ?? 'este usuario'}?`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Confirmar', onPress: () => onConfirm(p.id) },
                ]
              )}
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

function BookingsTab({ bookings }: { bookings: AdminBooking[] }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Reservas Recientes ({bookings.length})</Text>
      {bookings.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
          <Text style={styles.emptyText}>Sin reservas registradas</Text>
        </View>
      )}
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
            <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[b.status] ?? colors.textMuted}20`, borderColor: STATUS_COLOR[b.status] ?? colors.textMuted }]}>
              <Text style={[styles.statusText, { color: STATUS_COLOR[b.status] ?? colors.textMuted }]}>{b.status}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  tabLabelActive: { color: colors.primary },
  badge: { position: 'absolute', top: 6, right: 8, backgroundColor: colors.danger, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textMain, marginBottom: 16 },

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
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 },
  actionBtnSuccess: { backgroundColor: `${colors.accent}20`, borderWidth: 1, borderColor: colors.accent },
  actionBtnDanger: { backgroundColor: `${colors.danger}10`, borderWidth: 1, borderColor: colors.danger },
  actionBtnSecondary: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: colors.textMain },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyState: { backgroundColor: colors.surface, borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  emptyText: { color: colors.textMuted, fontSize: 14 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  tagText: { fontSize: 11, fontWeight: '700' },
});
