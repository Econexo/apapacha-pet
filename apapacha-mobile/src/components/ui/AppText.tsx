import React from 'react';
import { Text, TextProps } from 'react-native';
import { type } from '../../theme/typography';
import { colors } from '../../theme/colors';

type Variant = keyof typeof type;

export function AppText({ variant = 'body', color, style, ...rest }: TextProps & { variant?: Variant; color?: string }) {
  return <Text {...rest} style={[type[variant], { color: color ?? colors.textMain }, style]} />;
}
