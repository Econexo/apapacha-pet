import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import {
  Availability, WEEKDAY_LABELS, WEEKDAY_ORDER, toISODate,
} from '../lib/availability';

const HOURS = Array.from({ length: 18 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`); // 06:00–23:00
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_HEAD = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0,0,0,0); return c; };

interface Props {
  value: Availability;
  onChange: (a: Availability) => void;
  hourLabels?: { from: string; to: string };
}

export function AvailabilityEditor({ value, onChange, hourLabels }: Props) {
  const labels = hourLabels ?? { from: 'Desde', to: 'Hasta' };
  const [viewDate, setViewDate] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const today = startOfDay(new Date());

  const toggleWeekday = (wd: number) => {
    const set = new Set(value.weekdays);
    set.has(wd) ? set.delete(wd) : set.add(wd);
    onChange({ ...value, weekdays: [...set].sort((a, b) => a - b) });
  };

  const setHour = (field: 'from' | 'to', h: string) => {
    onChange({ ...value, [field]: value[field] === h ? undefined : h });
  };

  const toggleBlocked = (iso: string) => {
    const set = new Set(value.blocked_dates);
    set.has(iso) ? set.delete(iso) : set.add(iso);
    onChange({ ...value, blocked_dates: [...set].sort() });
  };

  // Grilla del mes (Lunes primero)
  const y = viewDate.getFullYear(), m = viewDate.getMonth();
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.wrap}>
      {/* Días de la semana */}
      <Text style={styles.label}>Días que aceptas</Text>
      <View style={styles.weekRow}>
        {WEEKDAY_ORDER.map(wd => {
          const on = value.weekdays.includes(wd);
          return (
            <TouchableOpacity key={wd} style={[styles.dayChip, on && styles.dayChipOn]} onPress={() => toggleWeekday(wd)} activeOpacity={0.7}>
              <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{WEEKDAY_LABELS[wd]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Presets de jornada */}
      <Text style={styles.label}>Jornada</Text>
      <View style={styles.presetRow}>
        {([
          { label: 'Todo el día', from: '06:00', to: '21:00' },
          { label: 'Solo AM',     from: '06:00', to: '12:00' },
          { label: 'Solo PM',     from: '13:00', to: '21:00' },
        ] as const).map(p => {
          const on = value.from === p.from && value.to === p.to;
          return (
            <TouchableOpacity
              key={p.label}
              style={[styles.presetChip, on && styles.presetChipOn]}
              onPress={() => onChange({ ...value, from: p.from, to: p.to })}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetText, on && styles.presetTextOn]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Horario */}
      <Text style={styles.label}>{labels.from}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourRow}>
        {HOURS.map(h => (
          <TouchableOpacity key={h} style={[styles.hourChip, value.from === h && styles.hourChipOn]} onPress={() => setHour('from', h)} activeOpacity={0.7}>
            <Text style={[styles.hourText, value.from === h && styles.hourTextOn]}>{h}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={styles.label}>{labels.to}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourRow}>
        {HOURS.map(h => (
          <TouchableOpacity key={h} style={[styles.hourChip, value.to === h && styles.hourChipOn]} onPress={() => setHour('to', h)} activeOpacity={0.7}>
            <Text style={[styles.hourText, value.to === h && styles.hourTextOn]}>{h}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Fechas bloqueadas */}
      <Text style={styles.label}>Bloquear fechas puntuales</Text>
      <Text style={styles.sublabel}>Toca los días en que NO estarás disponible (vacaciones, etc).</Text>
      <View style={styles.calCard}>
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.arrow} onPress={() => setViewDate(new Date(y, m - 1, 1))}><Text style={styles.arrowText}>‹</Text></TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[m]} {y}</Text>
          <TouchableOpacity style={styles.arrow} onPress={() => setViewDate(new Date(y, m + 1, 1))}><Text style={styles.arrowText}>›</Text></TouchableOpacity>
        </View>
        <View style={styles.headRow}>
          {DAY_HEAD.map(d => <Text key={d} style={styles.headCell}>{d}</Text>)}
        </View>
        <View style={styles.grid}>
          {cells.map((day, idx) => {
            if (!day) return <View key={idx} style={styles.cell} />;
            const past = startOfDay(day) < today;
            const iso = toISODate(day);
            const blocked = value.blocked_dates.includes(iso);
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.cell, blocked && styles.cellBlocked]}
                disabled={past}
                onPress={() => toggleBlocked(iso)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cellText, past && styles.cellPast, blocked && styles.cellTextBlocked]}>{day.getDate()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {value.blocked_dates.length > 0 && (
          <Text style={styles.blockedCount}>{value.blocked_dates.length} fecha(s) bloqueada(s)</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  label: { fontSize: 14, fontWeight: '700', color: colors.textMain, marginBottom: 6, marginTop: 16 },
  sublabel: { fontSize: 12, color: colors.textMuted, marginBottom: 10, marginTop: -2 },
  weekRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  dayChipOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  dayChipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  dayChipTextOn: { color: colors.primaryDark, fontWeight: '800' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  presetChipOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  presetText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  presetTextOn: { color: colors.primaryDark, fontWeight: '800' },
  hourRow: { gap: 8, paddingVertical: 2 },
  hourChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  hourChipOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  hourText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  hourTextOn: { color: colors.primaryDark, fontWeight: '800' },
  calCard: { backgroundColor: colors.background, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 10, marginTop: 4 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6 },
  arrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  arrowText: { fontSize: 22, color: colors.primary, fontWeight: '700', lineHeight: 26 },
  monthLabel: { fontSize: 15, fontWeight: '800', color: colors.textMain },
  headRow: { flexDirection: 'row', marginTop: 4, marginBottom: 2 },
  headCell: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellBlocked: { backgroundColor: colors.danger, borderRadius: 100 },
  cellText: { fontSize: 13, fontWeight: '600', color: colors.textMain },
  cellPast: { color: colors.border },
  cellTextBlocked: { color: '#fff', fontWeight: '800', textDecorationLine: 'line-through' },
  blockedCount: { fontSize: 12, fontWeight: '700', color: colors.danger, textAlign: 'center', marginTop: 8 },
});
