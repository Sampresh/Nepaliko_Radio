import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { DOB_MIN_YEAR, DOB_PATTERN, toIso, todayIso } from '@/features/account/fields';
import { Colors, MinTouchTarget, Radius, Spacing } from '@/theme';

/**
 * A calendar in the station's own palette.
 *
 * Built rather than borrowed. `@expo/ui` ships a Material 3 picker and it is
 * fully colour-themeable, but its layout and type stay Material — and the ask
 * here was a calendar that matches the rest of the app. This also keeps the
 * signup screen free of a native view, so it behaves the same on both platforms
 * and needs no rebuild of the dev client.
 *
 * The drill-down is year → month → day rather than day-first paging. For a date
 * of birth that ordering is the whole point: reaching 1998 from today by paging
 * months is 300-odd taps.
 */

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Rows are fixed height so the year list can be scrolled to the selection. */
const YEAR_ROW_HEIGHT = 52;
const YEAR_COLUMNS = 4;

type Mode = 'year' | 'month' | 'day';

interface Cursor {
  year: number;
  /** 0-indexed, as in `Date`. */
  month: number;
}

export function Calendar({
  value,
  onSelect,
  minYear = DOB_MIN_YEAR,
  maxDate = todayIso(),
}: {
  /** `YYYY-MM-DD`, or empty when nothing is chosen yet. */
  value: string;
  onSelect: (next: string) => void;
  minYear?: number;
  /** Inclusive upper bound, `YYYY-MM-DD`. Later dates render disabled. */
  maxDate?: string;
}) {
  const selected = DOB_PATTERN.test(value) ? value : '';
  const maxYear = Number(maxDate.slice(0, 4));

  const [cursor, setCursor] = useState<Cursor>(() => {
    if (selected) {
      return { year: Number(selected.slice(0, 4)), month: Number(selected.slice(5, 7)) - 1 };
    }
    // Opening on a month grid with nothing chosen would strand someone in the
    // current decade, so an empty field starts at the year list instead.
    return { year: maxYear, month: 0 };
  });

  // Same reasoning: the first thing to pick is the year unless one is already
  // known, in which case the day grid is where the user expects to land.
  const [mode, setMode] = useState<Mode>(selected ? 'day' : 'year');

  const years = useMemo(() => {
    const list: number[] = [];
    for (let year = maxYear; year >= minYear; year -= 1) list.push(year);
    return list;
  }, [minYear, maxYear]);

  if (mode === 'year') {
    const selectedIndex = years.indexOf(cursor.year);
    const offsetRow = selectedIndex >= 0 ? Math.floor(selectedIndex / YEAR_COLUMNS) : 0;

    return (
      <View style={styles.root}>
        <Header label="Select year" />
        <ScrollView
          style={styles.yearScroll}
          contentContainerStyle={styles.yearGrid}
          showsVerticalScrollIndicator={false}
          // Lands on the current selection rather than the top of a 100-row list.
          contentOffset={{ x: 0, y: Math.max(0, (offsetRow - 2) * YEAR_ROW_HEIGHT) }}>
          {years.map((year) => (
            <Cell
              key={year}
              label={String(year)}
              selected={year === cursor.year}
              onPress={() => {
                setCursor((current) => ({ ...current, year }));
                setMode('month');
              }}
              style={styles.yearCell}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (mode === 'month') {
    return (
      <View style={styles.root}>
        <Header
          label={String(cursor.year)}
          onPress={() => setMode('year')}
          hint="Change year"
        />
        <View style={styles.monthGrid}>
          {MONTHS.map((month, index) => {
            // A month later this year than today cannot hold a birthday.
            const disabled = cursor.year === maxYear && index > Number(maxDate.slice(5, 7)) - 1;
            return (
              <Cell
                key={month}
                label={month.slice(0, 3)}
                selected={index === cursor.month}
                disabled={disabled}
                onPress={() => {
                  setCursor((current) => ({ ...current, month: index }));
                  setMode('day');
                }}
                style={styles.monthCell}
              />
            );
          })}
        </View>
      </View>
    );
  }

  const { year, month } = cursor;
  const leading = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const step = (delta: number) => {
    setCursor((current) => {
      const next = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  };

  const atStart = year === minYear && month === 0;
  const atEnd = toIso(year, month, 1) >= maxDate.slice(0, 8) + '01';

  return (
    <View style={styles.root}>
      <View style={styles.dayHeader}>
        <Arrow icon="chevron-back" label="Previous month" disabled={atStart} onPress={() => step(-1)} />
        <Pressable
          onPress={() => setMode('year')}
          accessibilityRole="button"
          accessibilityLabel={`${MONTHS[month]} ${year}. Change year`}
          hitSlop={8}
          style={({ pressed }) => [styles.headerLabel, pressed && styles.pressed]}>
          <AppText variant="body" weight="semibold">
            {MONTHS[month]} {year}
          </AppText>
          <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
        </Pressable>
        <Arrow icon="chevron-forward" label="Next month" disabled={atEnd} onPress={() => step(1)} />
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((day, index) => (
          <View key={index} style={styles.dayCell}>
            <AppText variant="caption" color={Colors.textSecondary}>
              {day}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.dayGrid}>
        {Array.from({ length: leading }, (_, index) => (
          <View key={`blank-${index}`} style={styles.dayCell} />
        ))}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const iso = toIso(year, month, day);
          return (
            <Cell
              key={iso}
              label={String(day)}
              selected={iso === selected}
              disabled={iso > maxDate}
              onPress={() => onSelect(iso)}
              style={styles.dayCell}
              round
            />
          );
        })}
      </View>
    </View>
  );
}

function Header({ label, onPress, hint }: { label: string; onPress?: () => void; hint?: string }) {
  if (!onPress) {
    return (
      <View style={styles.plainHeader}>
        <AppText variant="body" weight="semibold">
          {label}
        </AppText>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      style={({ pressed }) => [styles.plainHeader, pressed && styles.pressed]}>
      <AppText variant="body" weight="semibold">
        {label}
      </AppText>
      <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
    </Pressable>
  );
}

function Arrow({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
      <Ionicons
        name={icon}
        size={18}
        color={disabled ? Colors.border : Colors.textPrimary}
      />
    </Pressable>
  );
}

function Cell({
  label,
  selected,
  disabled = false,
  onPress,
  style,
  round = false,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
  style: object;
  round?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        style,
        styles.cell,
        round && styles.cellRound,
        selected && styles.cellSelected,
        pressed && !disabled && styles.pressed,
      ]}>
      <AppText
        variant="small"
        weight={selected ? 'bold' : 'regular'}
        color={disabled ? Colors.border : Colors.textPrimary}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.sm,
  },
  plainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: MinTouchTarget,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: MinTouchTarget,
  },
  headerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  arrow: {
    width: MinTouchTarget,
    height: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
  },
  weekRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearScroll: {
    maxHeight: YEAR_ROW_HEIGHT * 5,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  yearCell: {
    width: `${100 / YEAR_COLUMNS}%`,
    height: YEAR_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCell: {
    width: '33.333%',
    height: YEAR_ROW_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellRound: {
    borderRadius: Radius.full,
  },
  cellSelected: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  pressed: {
    opacity: 0.6,
  },
});
