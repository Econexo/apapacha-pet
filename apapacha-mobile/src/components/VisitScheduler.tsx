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

// Jornada por defecto: AM 06:00–12:00 · PM 13:00–21:00
export const DAY_START = 6;
export const DAY_END = 21;
export const PM_START = 13;

// Slots horarios dentro de la ventana declarada por el cuidador.
export function buildSlots(av: Availability): string[] {
  const from = Number.isNaN(hourOf(av.from)) ? DAY_START : hourOf(av.from);
  const to   = Number.isNaN(hourOf(av.to)) ? DAY_END : hourOf(av.to);
  const out: string[] = [];
  for (let h = from; h <= to; h++) out.push(`${String(h).padStart(2, '0')}:00`);
  return out;
}

interface Props {
  availability: Availability;
  selectedDates: string[];              // ISO 'YYYY-MM-DD'
  selectedTime: string | null;          // 'HH:MM'
  takenSlots: Set<string>;              // 'YYYY-MM-DD|HH:MM'
  onChangeDates: (d: string[]) => void;
  onChangeTime: (t: string | null) => void;
}

export function VisitScheduler({ availability, selectedDates, selectedTime, takenSlots, onChangeDates, onChangeTime }: Props) {
  const [viewDate, setViewDate] = useState<Date>(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const today = startOfDay(new Date());
  const slots = buildSlots(availability);
  const amSlots = slots.filter(t => hourOf(t) < PM_START);   // 06:00 – 12:00
  const pmSlots = slots.filter(t => hourOf(t) >= PM_START);  // 13:00 – 21:00

  const toggleDate = (iso: string) => {
    const set = new Set(selectedDates);
    set.has(iso) ? set.delete(iso) : set.add(iso);
    onChangeDates([...set].sort());
  };

  // Un slot no sirve si está tomado en ALGUNA de las fechas elegidas
  const slotTaken = (t: string) => selectedDates.some(d => takenSlots.has(`${d}|${t}`));

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

      <Text style={styles.label}>Hora de la visita</Text>
      <Text style={styles.hint}>
        {availability.from || availability.to
          ? `El cuidador atiende de ${availability.from ?? '06:00'} a ${availability.to ?? '21:00'}.`
          : 'Elige el horario que prefieras.'}
      </Text>

      {([
        { key: 'am', title: 'AM · Mañana', range: '06:00 – 12:00', items: amSlots },
        { key: 'pm', title: 'PM · Tarde',  range: '13:00 – 21:00', items: pmSlots },
      ] as const).map(group => (
        group.items.length > 0 && (
          <View key={group.key} style={styles.group}>
            <View style={styles.groupHead}>
              <Ionicons name={group.key === 'am' ? 'sunny-outline' : 'partly-sunny-outline'} size={14} color={colors.textMuted} />
              <Text style={styles.groupTitle}>{group.title}</Text>
              <Text style={styles.groupRange}>{group.range}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotRow}>
              {group.items.map(t => {
                const taken = slotTaken(t);
                const on = selectedTime === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.slot, on && styles.slotOn, taken && styles.slotTaken]}
                    disabled={taken}
                    onPress={() => onChangeTime(on ? null : t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.slotText, on && styles.slotTextOn, taken && styles.slotTextTaken]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )
      ))}

      {selectedDates.length > 0 && slots.length > 0 && slots.every(slotTaken) && (
        <Text style={styles.noSlots}>No quedan horarios libres en esas fechas. Prueba con otro día.</Text>
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
  group: { marginTop: 10 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  groupTitle: { fontSize: 12.5, fontWeight: '800', color: colors.textMain },
  groupRange: { fontSize: 11.5, color: colors.textMuted, fontWeight: '600' },
  slotRow: { gap: 8, paddingVertical: 2 },
  slot: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  slotOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  slotTaken: { opacity: 0.4 },
  slotText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  slotTextOn: { color: colors.primaryDark, fontWeight: '800' },
  slotTextTaken: { textDecorationLine: 'line-through' },
  noSlots: { fontSize: 12.5, color: colors.danger, fontWeight: '600', marginTop: 8 },
});
