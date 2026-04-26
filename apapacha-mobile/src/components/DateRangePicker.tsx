import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { colors } from '../theme/colors';

const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const startOfDay = (d: Date) => {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
};

interface DateRangePickerProps {
  checkIn: Date | null;
  checkOut: Date | null;
  onChangeCheckIn: (d: Date) => void;
  onChangeCheckOut: (d: Date) => void;
}

type ActivePicker = 'checkIn' | 'checkOut' | null;

const fmt = (d: Date | null) =>
  d ? d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Añadir fecha';

export function DateRangePicker({ checkIn, checkOut, onChangeCheckIn, onChangeCheckOut }: DateRangePickerProps) {
  const [active, setActive] = useState<ActivePicker>(null);
  const [viewDate, setViewDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const today = startOfDay(new Date());

  const openPicker = (field: ActivePicker) => {
    if (field === 'checkIn') {
      const base = checkIn ?? new Date();
      setViewDate(new Date(base.getFullYear(), base.getMonth(), 1));
    } else {
      const base = checkOut ?? (checkIn ? new Date(checkIn.getTime() + 86400000) : new Date());
      setViewDate(new Date(base.getFullYear(), base.getMonth(), 1));
    }
    setActive(field);
  };

  const prevMonth = () => setViewDate(v => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(v => new Date(v.getFullYear(), v.getMonth() + 1, 1));

  const handleDayPress = (day: Date) => {
    if (active === 'checkIn') {
      onChangeCheckIn(day);
      if (checkOut && day >= checkOut) {
        onChangeCheckOut(new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1));
      }
      setActive(null);
    } else if (active === 'checkOut') {
      onChangeCheckOut(day);
      setActive(null);
    }
  };

  const buildCells = (): (Date | null)[] => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // Mon=0, Sun=6
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (Date | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const minDate = active === 'checkOut' && checkIn
    ? startOfDay(new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate() + 1))
    : today;

  const W = Dimensions.get('window').width;
  const CELL = Math.floor((W - 48) / 7);

  const cells = buildCells();

  return (
    <>
      <View style={styles.dateRow}>
        <TouchableOpacity
          style={[styles.dateBox, active === 'checkIn' && styles.dateBoxActive]}
          onPress={() => openPicker('checkIn')}
          activeOpacity={0.7}
        >
          <Text style={styles.dateLabel}>Llegada</Text>
          <Text style={[styles.dateValue, !checkIn && styles.datePlaceholder]}>{fmt(checkIn)}</Text>
        </TouchableOpacity>
        <View style={styles.dateSeparator}><Text style={styles.dateSeparatorText}>→</Text></View>
        <TouchableOpacity
          style={[styles.dateBox, active === 'checkOut' && styles.dateBoxActive]}
          onPress={() => openPicker('checkOut')}
          activeOpacity={0.7}
        >
          <Text style={styles.dateLabel}>Salida</Text>
          <Text style={[styles.dateValue, !checkOut && styles.datePlaceholder]}>{fmt(checkOut)}</Text>
        </TouchableOpacity>
      </View>

      {checkIn && checkOut && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000)} noche(s) seleccionadas
          </Text>
        </View>
      )}

      <Modal
        visible={active !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActive(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <TouchableOpacity
                onPress={() => setActive(null)}
                hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>
                {active === 'checkIn' ? 'Fecha de llegada' : 'Fecha de salida'}
              </Text>
              <View style={{ width: 64 }} />
            </View>

            {/* Month navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.monthArrow} onPress={prevMonth}>
                <Text style={styles.monthArrowText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.monthLabel}>
                {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
              </Text>
              <TouchableOpacity style={styles.monthArrow} onPress={nextMonth}>
                <Text style={styles.monthArrowText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day name headers */}
            <View style={styles.dayNamesRow}>
              {DAY_NAMES.map(d => (
                <Text key={d} style={[styles.dayName, { width: CELL }]}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.grid}>
              {cells.map((day, idx) => {
                if (!day) return <View key={idx} style={{ width: CELL, height: CELL }} />;
                const disabled = startOfDay(day) < minDate;
                const isStart = checkIn ? sameDay(day, checkIn) : false;
                const isEnd = checkOut ? sameDay(day, checkOut) : false;
                const inRange = !!(checkIn && checkOut && day > checkIn && day < checkOut);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' },
                      inRange && styles.cellInRange,
                      (isStart || isEnd) && [styles.cellSelected, { borderRadius: CELL / 2 }],
                    ]}
                    onPress={() => !disabled && handleDayPress(day)}
                    activeOpacity={disabled ? 1 : 0.7}
                    disabled={disabled}
                  >
                    <Text style={[
                      styles.cellText,
                      disabled && styles.cellTextDisabled,
                      (isStart || isEnd) && styles.cellTextSelected,
                    ]}>
                      {day.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Close button */}
            <View style={styles.sheetFooter}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setActive(null)} activeOpacity={0.8}>
                <Text style={styles.closeBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dateBox: { flex: 1, backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 14 },
  dateBoxActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}08` },
  dateLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  dateValue: { fontSize: 15, color: colors.textMain, fontWeight: '700' },
  datePlaceholder: { color: colors.textMuted, fontWeight: '500' },
  dateSeparator: { paddingHorizontal: 10 },
  dateSeparatorText: { color: colors.textMuted, fontSize: 18 },
  summaryRow: { backgroundColor: `${colors.primary}10`, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginBottom: 8 },
  summaryText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: colors.textMain },
  cancelText: { fontSize: 15, color: colors.textMuted, fontWeight: '600', width: 64 },

  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  monthArrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: colors.background },
  monthArrowText: { fontSize: 24, color: colors.primary, fontWeight: '700', lineHeight: 28 },
  monthLabel: { fontSize: 16, fontWeight: '800', color: colors.textMain },

  dayNamesRow: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4 },
  dayName: { textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 8 },
  cellInRange: { backgroundColor: `${colors.primary}20`, borderRadius: 0 },
  cellSelected: { backgroundColor: colors.primary },
  cellText: { fontSize: 14, fontWeight: '600', color: colors.textMain },
  cellTextDisabled: { color: colors.border },
  cellTextSelected: { color: colors.surface, fontWeight: '800' },

  sheetFooter: { paddingHorizontal: 20, paddingTop: 8 },
  closeBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { color: colors.surface, fontWeight: '800', fontSize: 15 },
});
