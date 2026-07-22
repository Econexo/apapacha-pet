import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { radii } from '../theme/design';
import { Availability, isDayAvailable, toISODate } from '../lib/availability';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAY_HEAD = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0,0,0,0); return c; };
const hourOf = (hhmm?: string) => (hhmm ? parseInt(hhmm.split(':')[0], 10) : NaN);

export type TimeBlock = 'am' | 'pm';

// Bloques horarios en que el cuidador puede asistir. La hora exacta la coordinan
// cliente y cuidador por chat.
export const BLOCKS: { key: TimeBlock; title: string; range: string; icon: 'sunny-outline' | 'partly-sunny-outline' }[] = [
  { key: 'am', title: 'AM · Mañana', range: '06:00 a 12:00', icon: 'sunny-outline' },
  { key: 'pm', title: 'PM · Tarde',  range: '13:00 a 21:00', icon: 'partly-sunny-outline' },
];

// Un bloque se ofrece si cae dentro de la jornada declarada por el cuidador.
export function blockOffered(av: Availability, key: TimeBlock): boolean {
  const from = Number.isNaN(hourOf(av.from)) ? 6 : hourOf(av.from);
  const to   = Number.isNaN(hourOf(av.to)) ? 21 : hourOf(av.to);
  return key === 'am' ? from <= 12 : to >= 13;
}

interface Props {
  availability: Availability;
  selectedDates: string[];              // ISO 'YYYY-MM-DD'
  selectedBlock: TimeBlock | null;
  onChangeDates: (d: string[]) => void;
  onChangeBlock: (b: TimeBlock | null) => void;
}

export function VisitScheduler({ availability, selectedDates, selectedBlock, onChangeDates, onChangeBlock }: Props) {
  const [viewDate, setViewDate] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const today = startOfDay(new Date());
  const blocks = BLOCKS.filter(b => blockOffered(availability, b.key));

  const toggleDate = (iso: string) => {
    const set = new Set(selectedDates);
    set.has(iso) ? set.delete(iso) : set.add(iso);
    onChangeDates([...set].sort());
  };

  const y = viewDate.getFullYear(), m = viewDate.getMonth();
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View>
      <Text style={styles.label}>Elige la(s) fecha(s) de visita</Text>
      <Text style={styles.hint}>Puedes seleccionar varios días (por ejemplo, día por medio).</Text>

      <View style={styles.calCard}>
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.arrow} onPress={() => setViewDate(new Date(y, m - 1, 1))}><Text style={styles.arrowText}>‹</Text></TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTHS[m]} {y}</Text>
          <TouchableOpacity style={styles.arrow} onPress={() => setViewDate(new Date(y, m + 1, 1))}><Text style={styles.arrowText}>›</Text></TouchableOpacity>
        </View>
        <View style={styles.headRow}>{DAY_HEAD.map(d => <Text key={d} style={styles.headCell}>{d}</Text>)}</View>
        <View style={styles.grid}>
          {cells.map((day, idx) => {
            if (!day) return <View key={idx} style={styles.cell} />;
            const iso = toISODate(day);
            const past = startOfDay(day) < today;
            const unavailable = !isDayAvailable(availability, day);
            const disabled = past || unavailable;
            const on = selectedDates.includes(iso);
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.cell, on && styles.cellOn]}
                disabled={disabled}
                onPress={() => toggleDate(iso)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cellText, disabled && styles.cellDisabled, on && styles.cellTextOn]}>{day.getDate()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {selectedDates.length > 0 && (
        <View style={styles.summary}>
          <Ionicons name="calendar-outline" size={14} color={colors.primaryDark} />
          <Text style={styles.summaryText}>
            {selectedDates.length} visita{selectedDates.length > 1 ? 's' : ''} seleccionada{selectedDates.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <Text style={styles.label}>Rango horario</Text>
      <Text style={styles.hint}>Elige el tramo en que el cuidador puede asistir. La hora exacta la coordinan por chat.</Text>

      <View style={styles.blockList}>
        {blocks.map(b => {
          const on = selectedBlock === b.key;
          return (
            <TouchableOpacity
              key={b.key}
              style={[styles.block, on && styles.blockOn]}
              onPress={() => onChangeBlock(on ? null : b.key)}
              activeOpacity={0.8}
            >
              <View style={[styles.blockIcon, on && styles.blockIconOn]}>
                <Ionicons name={b.icon} size={18} color={on ? '#fff' : colors.primary} />
              </View>
              <View style={{ flex: 1 }} pointerEvents="none">
                <Text style={[styles.blockTitle, on && styles.blockTitleOn]}>{b.title}</Text>
                <Text style={styles.blockRange}>{b.range}</Text>
              </View>
              <Ionicons
                name={on ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={on ? colors.primary : colors.border}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {blocks.length === 0 && (
        <Text style={styles.noSlots}>Este cuidador no tiene una jornada declarada. Contáctalo antes de reservar.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700', color: colors.textMain, marginTop: 16, marginBottom: 4 },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: 10 },
  calCard: { backgroundColor: colors.background, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: 10 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6 },
  arrow: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  arrowText: { fontSize: 22, color: colors.primary, fontWeight: '700', lineHeight: 26 },
  monthLabel: { fontSize: 15, fontWeight: '800', color: colors.textMain },
  headRow: { flexDirection: 'row', marginTop: 4, marginBottom: 2 },
  headCell: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellOn: { backgroundColor: colors.primary, borderRadius: 100 },
  cellText: { fontSize: 13, fontWeight: '600', color: colors.textMain },
  cellTextOn: { color: '#fff', fontWeight: '800' },
  cellDisabled: { color: colors.border },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryLight, borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10 },
  summaryText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  blockList: { gap: 10 },
  block: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background,
    borderRadius: radii.md, paddingHorizontal: 14, paddingVertical: 13,
  },
  blockOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  blockIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  blockIconOn: { backgroundColor: colors.primary },
  blockTitle: { fontSize: 14.5, fontWeight: '800', color: colors.textMain },
  blockTitleOn: { color: colors.primaryDark },
  blockRange: { fontSize: 12.5, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  noSlots: { fontSize: 12.5, color: colors.danger, fontWeight: '600', marginTop: 8 },
});
