import React from 'react';
import { Text, TextProps } from 'react-native';
import { type } from '../../theme/typography';
import { colors } from '../../theme/colors';

type Variant = keyof typeof type;

export function AppText({ variant = 'body', color, style, ...rest }: TextProps & { variant?: Variant; color?: string }) {
  // selectable={false} por defecto: en RN Web el texto seleccionable inicia una
  // selección al tocar y cancela el gesto del Touchable padre (el primer toque
  // se "pierde" en tarjetas). Se puede sobrescribir por prop.
  return <Text selectable={false} {...rest} style={[type[variant], { color: color ?? colors.textMain }, style]} />;
}
