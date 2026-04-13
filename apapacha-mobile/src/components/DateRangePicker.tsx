import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';

interface DateRangePickerProps {
  checkIn: Date | null;
  checkOut: Date | null;
  onChangeCheckIn: (date: Date) => void;
  onChangeCheckOut: (date: Date) => void;
}

type ActivePicker = 'checkIn' | 'checkOut' | null;

const fmt = (d: Date | null) =>
  d ? d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Añadir fecha';

export function DateRangePicker({ checkIn, checkOut, onChangeCheckIn, onChangeCheckOut }: DateRangePickerProps) {
  const [active, setActive] = useState<ActivePicker>(null);
  const [tempDate, setTempDate] = useState(new Date());

  const minCheckOut = checkIn ? new Date(checkIn.getTime() + 86400000) : new Date();

  const openPicker = (field: ActivePicker) => {
    setTempDate(field === 'checkIn' ? (checkIn ?? new Date()) : (checkOut ?? minCheckOut));
    setActive(field);
  };

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setActive(null);
    if (!selected) return;
    if (active === 'checkIn') {
      onChangeCheckIn(selected);
      if (checkOut && selected >= checkOut) onChangeCheckOut(new Date(selected.getTime() + 86400000));
    } else if (active === 'checkOut') {
      onChangeCheckOut(selected);
    }
  };

  const handleConfirmIOS = () => {
    if (active === 'checkIn') onChangeCheckIn(tempDate);
    else if (active === 'checkOut') onChangeCheckOut(tempDate);
    setActive(null);
  };

  return (
    <View>
      <View style={styles.dateRow}>
        <TouchableOpacity style={[styles.dateBox, active === 'checkIn' && styles.dateBoxActive]} onPress={() => openPicker('checkIn')}>
          <Text style={styles.dateLabel}>Llegada</Text>
          <Text style={[styles.dateValue, !checkIn && styles.datePlaceholder]}>{fmt(checkIn)}</Text>
        </TouchableOpacity>
        <View style={styles.dateSeparator}><Text style={styles.dateSeparatorText}>→</Text></View>
        <TouchableOpacity style={[styles.dateBox, active === 'checkOut' && styles.dateBoxActive]} onPress={() => openPicker('checkOut')}>
          <Text style={styles.dateLabel}>Salida</Text>
          <Text style={[styles.dateValue, !checkOut && styles.datePlaceholder]}>{fmt(checkOut)}</Text>
        </TouchableOpacity>
      </View>

      {/* Android: picker inline */}
      {Platform.OS === 'android' && active !== null && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          minimumDate={active === 'checkOut' ? minCheckOut : new Date()}
          onChange={handleChange}
        />
      )}

      {/* iOS: modal con picker */}
      {Platform.OS === 'ios' && (
        <Modal visible={active !== null} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setActive(null)}>
                  <Text style={styles.modalCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{active === 'checkIn' ? 'Fecha de Llegada' : 'Fecha de Salida'}</Text>
                <TouchableOpacity onPress={handleConfirmIOS}>
                  <Text style={styles.modalConfirm}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                minimumDate={active === 'checkOut' ? minCheckOut : new Date()}
                onChange={(_, d) => d && setTempDate(d)}
                locale="es-CL"
                style={styles.iosPicker}
              />
            </View>
          </View>
        </Modal>
      )}

      {checkIn && checkOut && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000)} noche(s)
          </Text>
        </View>
      )}
    </View>
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.textMain },
  modalCancel: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  modalConfirm: { fontSize: 15, color: colors.primary, fontWeight: '800' },
  iosPicker: { height: 200 },
});
