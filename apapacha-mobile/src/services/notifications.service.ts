import { supabase } from '../../supabase';
import type { Notification } from '../types/database';

export async function getMyNotifications(): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) { console.error('[notifications] getMyNotifications:', error.message); return []; }
  return data ?? [];
}

export async function getUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
}

export async function markAllAsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
}

export async function insertNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({ user_id: userId, type, title, body, data: data ?? null });
  if (error) console.error('[notifications] insertNotification:', error.message);
}

export async function insertNotificationsForAdmins(
  type: string,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  const { data: admins, error } = await supabase
    .from('public_profiles')
    .select('id')
    .eq('is_admin', true);
  if (error || !admins?.length) return;
  const rows = admins.map((a: { id: string }) => ({ user_id: a.id, type, title, body, data: data ?? null }));
  const { error: insertErr } = await supabase.from('notifications').insert(rows);
  if (insertErr) console.error('[notifications] insertNotificationsForAdmins:', insertErr.message);
}
