import { supabase } from '../../supabase';

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  host_id: string;
  rating: number;
  comment: string | null;
  tip_amount: number;
  created_at: string;
  // joined
  reviewer_name?: string;
  booking_start?: string;
  booking_end?: string;
  booking_service_type?: string;
  pet_name?: string;
}

export interface HostStats {
  totalReviews: number;
  avgRating: number;
  totalTips: number;
  totalPoints: number;
  level: HostLevel;
}

export interface HostLevel {
  name: string;
  emoji: string;
  min: number;
  next: number | null;
  color: string;
}

const LEVELS: HostLevel[] = [
  { name: 'Novato',    emoji: '🌱', min: 0,   next: 15,  color: '#7DC67E' },
  { name: 'Confiable', emoji: '⭐', min: 15,  next: 40,  color: '#F59E0B' },
  { name: 'Experto',   emoji: '🌟', min: 40,  next: 80,  color: '#6B35A0' },
  { name: 'Elite',     emoji: '💎', min: 80,  next: 150, color: '#4A9DB5' },
  { name: 'Maestro',   emoji: '🏆', min: 150, next: null, color: '#DC2626' },
];

export function getLevelFromPoints(points: number): HostLevel {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].min) return LEVELS[i];
  }
  return LEVELS[0];
}

export function getProgressToNextLevel(points: number): number {
  const level = getLevelFromPoints(points);
  if (!level.next) return 1;
  const range = level.next - level.min;
  const progress = points - level.min;
  return Math.min(progress / range, 1);
}

export async function getHostReviews(hostId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      profiles!reviewer_id(full_name, last_name),
      bookings!booking_id(start_date, end_date, service_type, pets(name))
    `)
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    reviewer_name: r.profiles
      ? `${r.profiles.full_name ?? ''} ${r.profiles.last_name ?? ''}`.trim()
      : 'Cliente',
    booking_start: r.bookings?.start_date,
    booking_end: r.bookings?.end_date,
    booking_service_type: r.bookings?.service_type,
    pet_name: r.bookings?.pets?.name,
  }));
}

export async function getHostStats(hostId: string): Promise<HostStats> {
  const reviews = await getHostReviews(hostId);
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / totalReviews
    : 0;
  const totalTips = reviews.reduce((s, r) => s + r.tip_amount, 0);
  const ratingPoints = reviews.reduce((s, r) => s + r.rating, 0);
  const tipPoints = Math.floor(totalTips / 1000);
  const totalPoints = ratingPoints + tipPoints;
  return {
    totalReviews,
    avgRating,
    totalTips,
    totalPoints,
    level: getLevelFromPoints(totalPoints),
  };
}

export async function getMyReviewForBooking(bookingId: string): Promise<Review | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('booking_id', bookingId)
    .eq('reviewer_id', user.id)
    .maybeSingle();
  return data ?? null;
}

export async function createReview(input: {
  booking_id: string;
  host_id: string;
  rating: number;
  comment?: string;
  tip_amount?: number;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('reviews').insert({
    booking_id: input.booking_id,
    host_id: input.host_id,
    reviewer_id: user.id,
    rating: input.rating,
    comment: input.comment ?? null,
    tip_amount: input.tip_amount ?? 0,
  });
  if (error) throw error;
}

export interface MonthlyEarning {
  month: string;   // 'Ene', 'Feb', etc.
  year: number;
  earnings: number;
  cares: number;
}

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export async function getMonthlyEarnings(hostId: string): Promise<MonthlyEarning[]> {
  // Get bookings for this host's spaces/visiters
  const { data: spaces } = await supabase.from('spaces').select('id').eq('host_id', hostId);
  const { data: visiters } = await supabase.from('visiters').select('id').eq('host_id', hostId);
  const serviceIds = [
    ...(spaces ?? []).map((s: any) => s.id),
    ...(visiters ?? []).map((v: any) => v.id),
  ];
  if (serviceIds.length === 0) return [];

  const { data: bookings } = await supabase
    .from('bookings')
    .select('total_price, created_at, status')
    .in('service_id', serviceIds)
    .in('status', ['completed', 'active'])
    .order('created_at', { ascending: true });

  const map = new Map<string, MonthlyEarning>();
  for (const b of bookings ?? []) {
    const d = new Date(b.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!map.has(key)) {
      map.set(key, { month: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), earnings: 0, cares: 0 });
    }
    const entry = map.get(key)!;
    entry.earnings += b.total_price;
    entry.cares += 1;
  }
  return Array.from(map.values()).slice(-6); // last 6 months
}
