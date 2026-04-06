import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

interface ChecklistRowProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
}

export function ChecklistRow({ label, checked, onToggle }: ChecklistRowProps) {
  return (
    <TouchableOpacity 
      style={[styles.container, checked && styles.containerChecked]} 
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <View style={styles.checkmark} />}
      </View>
      <Text style={[styles.label, checked && styles.labelChecked]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  containerChecked: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`, // Tint ligero de fondo
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textMuted,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkmark: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: colors.surface,
  },
  label: {
    fontSize: 16,
    color: colors.textMain,
    fontWeight: '500',
    flexShrink: 1, // Para prevenir recorte en textos largos
  },
  labelChecked: {
    color: colors.primaryDark,
  }
});
