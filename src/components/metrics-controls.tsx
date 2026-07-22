/**
 * Controles reutilizables para capturar los datos físicos del perfil, tanto en
 * el onboarding como en la edición desde Perfil. Todo con "toggles circulares":
 * los selectores marcan la opción con un aro de acento.
 */

import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import {
  ACTIVITY_HINT,
  ACTIVITY_LABEL,
  ACTIVITY_OPTIONS,
  GOAL_IMAGE,
  SEX_LABEL,
  SEX_OPTIONS,
  SKINFOLD_SITES,
  bodyComposition,
  goalTargets,
  basalMetabolicRate,
  totalDailyEnergy,
  type GoalKey,
  type Metrics,
  type Skinfolds,
  type SkinfoldField,
  type SkinfoldValues,
} from '@/data/nutrition';
import type { ActivityLevel, Sex } from '@/data/workouts';
import { useTheme } from '@/hooks/use-theme';

/** Ícono representativo de cada sexo. */
const SEX_ICON: Record<Sex, keyof typeof Feather.glyphMap> = {
  male: 'user',
  female: 'user',
};

// ---------------------------------------------------------------------
// Selector de sexo: dos toggles circulares grandes.
// ---------------------------------------------------------------------

export function SexSelector({
  value,
  onChange,
}: {
  value: Sex | null;
  onChange: (s: Sex) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.sexRow}>
      {SEX_OPTIONS.map((sex) => {
        const active = value === sex;
        return (
          <Pressable key={sex} onPress={() => onChange(sex)} style={styles.sexItem}>
            <View
              style={[
                styles.sexCircle,
                { backgroundColor: theme.backgroundElement, borderColor: 'transparent' },
                active && { borderColor: Accent, backgroundColor: theme.backgroundSelected },
              ]}>
              <Feather
                name={SEX_ICON[sex]}
                size={30}
                color={active ? Accent : theme.textSecondary}
              />
            </View>
            <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
              {SEX_LABEL[sex]}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------
// Stepper numérico: − [valor editable] +
// ---------------------------------------------------------------------

export function NumberStepper({
  label,
  unit,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
}: {
  label: string;
  unit: string;
  value: number | null;
  onChange: (n: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const theme = useTheme();

  function clamp(n: number) {
    return Math.min(max, Math.max(min, n));
  }
  function bump(delta: number) {
    onChange(clamp((value ?? min) + delta));
  }

  return (
    <View style={styles.stepperWrap}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.stepperRow}>
        <RoundButton icon="minus" onPress={() => bump(-step)} disabled={(value ?? min) <= min} />

        <ThemedView type="backgroundElement" style={styles.stepperValue}>
          <TextInput
            value={value === null ? '' : String(value)}
            onChangeText={(t) => {
              if (t.trim() === '') return onChange(null);
              const n = Number(t.replace(',', '.'));
              if (!Number.isNaN(n)) onChange(n);
            }}
            onBlur={() => value !== null && onChange(clamp(value))}
            keyboardType="numeric"
            style={[styles.stepperInput, { color: theme.text }]}
          />
          <ThemedText type="small" themeColor="textSecondary" style={styles.stepperUnit}>
            {unit}
          </ThemedText>
        </ThemedView>

        <RoundButton icon="plus" onPress={() => bump(step)} disabled={(value ?? min) >= max} />
      </View>
    </View>
  );
}

function RoundButton({
  icon,
  onPress,
  disabled,
}: {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.roundBtn,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Feather name={icon} size={20} color={theme.text} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------
// Pliegues Jackson-Pollock 7: una fila por sitio, con input compacto en mm.
// ---------------------------------------------------------------------

export function SkinfoldInputs({
  values,
  onChange,
}: {
  values: SkinfoldValues;
  onChange: (key: SkinfoldField, value: number | null) => void;
}) {
  return (
    <View style={styles.skinfoldList}>
      {SKINFOLD_SITES.map(({ key, label, hint }) => (
        <SkinfoldRow
          key={key}
          label={label}
          hint={hint}
          value={values[key]}
          onChange={(n) => onChange(key, n)}
        />
      ))}
    </View>
  );
}

/**
 * Una fila de pliegue. Toda la caja de la derecha enfoca el input (ref +
 * Pressable): en Android el TextInput solo era un blanco de pocos píxeles y el
 * teclado no abría al tocar al lado del número.
 */
function SkinfoldRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
}) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  return (
    <View style={styles.skinfoldRow}>
      <View style={styles.skinfoldText}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      </View>
      <Pressable onPress={() => inputRef.current?.focus()}>
        <ThemedView type="backgroundElement" style={styles.skinfoldInputWrap}>
          <TextInput
            ref={inputRef}
            value={value == null ? '' : String(value)}
            onChangeText={(t) => {
              if (t.trim() === '') return onChange(null);
              const n = Number(t.replace(',', '.'));
              if (!Number.isNaN(n)) onChange(n);
            }}
            keyboardType="numeric"
            placeholder="—"
            placeholderTextColor={theme.textSecondary}
            style={[styles.skinfoldInput, { color: theme.text }]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            mm
          </ThemedText>
        </ThemedView>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------
// Composición corporal: % de grasa, masa grasa y masa magra (JP7 + Siri).
// Solo tiene sentido con los siete pliegues; el llamador decide cuándo mostrarlo.
// ---------------------------------------------------------------------

export function BodyCompositionPreview({
  sex,
  age,
  weightKg,
  folds,
}: {
  sex: Sex;
  age: number;
  weightKg: number;
  folds: Skinfolds;
}) {
  const comp = bodyComposition(sex, age, weightKg, folds);
  return (
    <View style={styles.compWrap}>
      <View style={styles.compHero}>
        <ThemedText type="title" style={styles.compPct}>
          {comp.bodyFatPct}%
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          grasa corporal
        </ThemedText>
      </View>
      <View style={styles.compSplit}>
        <CompStat label="Masa magra" value={`${comp.leanMassKg} kg`} />
        <CompStat label="Masa grasa" value={`${comp.fatMassKg} kg`} />
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.compFoot}>
        Masa magra = todo lo que no es grasa (músculo, hueso, agua); masa grasa =
        los kg de pura grasa. Estimación Jackson-Pollock 7 + Siri: no afecta tus
        calorías (siguen con Mifflin-St Jeor).
      </ThemedText>
    </View>
  );
}

function CompStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.compStat}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

// ---------------------------------------------------------------------
// Selector de actividad: filas con radio circular + descripción.
// ---------------------------------------------------------------------

export function ActivitySelector({
  value,
  onChange,
}: {
  value: ActivityLevel | null;
  onChange: (a: ActivityLevel) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.activityList}>
      {ACTIVITY_OPTIONS.map((level) => {
        const active = value === level;
        return (
          <Pressable
            key={level}
            onPress={() => onChange(level)}
            style={({ pressed }) => [pressed && styles.pressed]}>
            <ThemedView
              type={active ? 'backgroundSelected' : 'backgroundElement'}
              style={[styles.activityRow, active && { borderColor: Accent }]}>
              <View
                style={[
                  styles.radio,
                  { borderColor: active ? Accent : theme.textSecondary },
                ]}>
                {active && <View style={styles.radioDot} />}
              </View>
              <View style={styles.activityText}>
                <ThemedText type="smallBold" themeColor={active ? 'text' : 'text'}>
                  {ACTIVITY_LABEL[level]}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {ACTIVITY_HINT[level]}
                </ThemedText>
              </View>
            </ThemedView>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------
// Vista previa de objetivos: BMR/TDEE + las tres columnas del PoC.
// ---------------------------------------------------------------------

const GOAL_ICON = { maintenance: 'minus', hypertrophy: 'trending-up', cut: 'trending-down' } as const;

export function TargetsPreview({
  metrics,
  selected,
  onSelect,
}: {
  metrics: Metrics;
  /** Objetivo elegido (resalta su tarjeta). */
  selected?: GoalKey | null;
  /** Si se pasa, las tarjetas se vuelven presionables para elegir objetivo. */
  onSelect?: (goal: GoalKey) => void;
}) {
  const theme = useTheme();
  const bmr = basalMetabolicRate(metrics);
  const tdee = totalDailyEnergy(metrics);
  const goals = goalTargets(metrics);
  const selectable = !!onSelect;

  return (
    <View style={styles.previewWrap}>
      <View style={styles.previewMeta}>
        <ThemedText type="small" themeColor="textSecondary">
          BMR <ThemedText type="smallBold">{bmr}</ThemedText> kcal
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          TDEE <ThemedText type="smallBold">{tdee}</ThemedText> kcal
        </ThemedText>
      </View>

      <View style={styles.goalRow}>
        {goals.map((goal) => {
          const active = selected === goal.key;
          const card = (
            <ThemedView
              type={active ? 'backgroundSelected' : 'backgroundElement'}
              style={[styles.goalCard, active && { borderColor: Accent }]}>
              <Image
                source={GOAL_IMAGE[goal.key]}
                style={styles.goalImage}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.goalHead}>
                <Feather
                  name={active ? 'check-circle' : GOAL_ICON[goal.key]}
                  size={13}
                  color={active ? Accent : theme.text}
                />
                {/* adjustsFontSizeToFit evita que "Mantenimiento" se parta a mitad
                    de palabra en la columna angosta del teléfono. */}
                <ThemedText
                  type="smallBold"
                  style={styles.goalLabel}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}>
                  {goal.label}
                </ThemedText>
              </View>
              <ThemedText
                type="title"
                style={styles.goalKcal}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}>
                {goal.kcal}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                kcal / día
              </ThemedText>
              <View style={styles.macroList}>
                <MacroLine label="Proteína" grams={goal.macros.protein} />
                <MacroLine label="Carbos" grams={goal.macros.carbs} />
                <MacroLine label="Grasa" grams={goal.macros.fat} />
              </View>
            </ThemedView>
          );

          return selectable ? (
            <Pressable
              key={goal.key}
              onPress={() => onSelect!(goal.key)}
              style={({ pressed }) => [styles.goalPress, pressed && styles.pressed]}>
              {card}
            </Pressable>
          ) : (
            <View key={goal.key} style={styles.goalPress}>
              {card}
            </View>
          );
        })}
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.previewFoot}>
        {selectable
          ? 'Toca un objetivo para elegirlo. Proteína y grasa se fijan por g/kg; los carbohidratos cuadran las calorías.'
          : 'Proteína y grasa fijadas por g/kg; los carbohidratos cuadran las calorías restantes.'}
      </ThemedText>
    </View>
  );
}

function MacroLine({ label, grams }: { label: string; grams: number }) {
  return (
    <View style={styles.macroLine}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{grams} g</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  sexRow: { flexDirection: 'row', gap: Spacing.four, justifyContent: 'center' },
  sexItem: { alignItems: 'center', gap: Spacing.two },
  sexCircle: {
    width: 92,
    height: 92,
    borderRadius: 9999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepperWrap: { gap: Spacing.two },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  roundBtn: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.two,
  },
  stepperInput: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 64,
    padding: 0,
  },
  stepperUnit: { paddingBottom: 2 },

  skinfoldList: { gap: Spacing.two },
  skinfoldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  skinfoldText: { flex: 1, gap: Spacing.half },
  skinfoldInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 48,
    minWidth: 96,
    justifyContent: 'center',
  },
  skinfoldInput: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 40,
    height: 48,
    padding: 0,
  },

  compWrap: { gap: Spacing.three, alignItems: 'stretch' },
  compHero: { alignItems: 'center', gap: Spacing.half },
  compPct: { fontSize: 40, lineHeight: 46 },
  compSplit: { flexDirection: 'row', gap: Spacing.two },
  compStat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.two,
  },
  compFoot: { textAlign: 'center' },

  activityList: { gap: Spacing.two },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 9999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 9999,
    backgroundColor: Accent,
  },
  activityText: { flex: 1, gap: Spacing.half },

  previewWrap: { gap: Spacing.three },
  previewMeta: { flexDirection: 'row', gap: Spacing.four, justifyContent: 'center' },
  goalRow: { flexDirection: 'row', gap: Spacing.two },
  goalPress: { flex: 1 },
  goalCard: {
    flex: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  goalImage: {
    width: '100%',
    height: 64,
    borderRadius: Spacing.two,
    marginBottom: Spacing.one,
    backgroundColor: 'rgba(127,127,127,0.15)',
  },
  goalHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  goalLabel: { flexShrink: 1 },
  goalKcal: { fontSize: 28, lineHeight: 34 },
  macroList: { marginTop: Spacing.two, gap: Spacing.half },
  macroLine: { flexDirection: 'row', justifyContent: 'space-between' },
  previewFoot: { textAlign: 'center' },

  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
});
