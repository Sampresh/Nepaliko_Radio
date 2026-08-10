import { Text as RNText, StyleSheet, type TextProps } from 'react-native';

import { Colors, FontFamily, FontSize, fontFor } from '@/theme';
import type { ContentLanguage } from '@/types/firestore';

type Variant = 'display' | 'title' | 'body' | 'small' | 'caption';
type Weight = 'regular' | 'semibold' | 'bold';

interface Props extends TextProps {
  variant?: Variant;
  weight?: Weight;
  color?: string;
  /** Switches to the Devanagari face for Nepali content. */
  lang?: ContentLanguage;
}

export function AppText({
  variant = 'body',
  weight = 'regular',
  color,
  lang,
  style,
  ...rest
}: Props) {
  const family = lang === 'np' ? fontFor(lang, weight === 'regular' ? 'regular' : 'bold') : null;

  return (
    <RNText
      style={[
        styles[variant],
        family ?? { fontFamily: FontFamily[weight] },
        color ? { color } : null,
        style,
      ]}
      {...rest}
    />
  );
}

const base = { color: Colors.textPrimary };

const styles = StyleSheet.create({
  display: { ...base, fontSize: FontSize.display, lineHeight: FontSize.display * 1.25 },
  title: { ...base, fontSize: FontSize.title, lineHeight: FontSize.title * 1.35 },
  body: { ...base, fontSize: FontSize.body, lineHeight: FontSize.body * 1.55 },
  small: { ...base, fontSize: FontSize.small, lineHeight: FontSize.small * 1.5 },
  caption: { ...base, fontSize: FontSize.caption, lineHeight: FontSize.caption * 1.4 },
});
