/**
 * Cálculos derivados para la pantalla de inicio: qué toca hoy, racha semanal
 * y estadísticas. Todo se deriva de los `Workout` que ya trae el store, sin
 * endpoints nuevos.
 */

import type { WorkoutSession } from './history';
import { totalSets, type Workout } from './workouts';

/** Lunes a domingo, como se ordenan las barritas de la racha. */
export const DIAS_SEMANA = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
] as const;

/** Segundos que se asumen de ejecución por serie, aparte del descanso. */
const SEGUNDOS_POR_SERIE = 40;
const DESCANSO_POR_DEFECTO = 90;

/** "Jueves 17 de Jul", para la cabecera. */
export function todayLabel(now = new Date()): string {
  const dia = now.toLocaleDateString('es-CL', { weekday: 'long' });
  const mes = now.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');
  const capitalizado = dia.charAt(0).toUpperCase() + dia.slice(1);
  return `${capitalizado} ${now.getDate()} de ${mes.charAt(0).toUpperCase()}${mes.slice(1)}`;
}

/** Nombre del día de la semana en minúsculas y sin tildes, para comparar. */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    // Rango de diacríticos combinantes: separa la tilde de la letra y la borra,
    // así "miércoles" y "miercoles" comparan igual.
    .replace(/[̀-ͯ]/g, '');
}

/** Índice 0-6 (lunes = 0) del día de una fecha. `getDay()` usa domingo = 0. */
function indiceDia(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** ¿Dos fechas caen el mismo día calendario? */
function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * El workout que toca HOY, según el nombre del día en `Workout.day` (texto libre:
 * "Lunes - Empuje", "Día de pierna Viernes"). Devuelve `undefined` si ninguna
 * rutina corresponde a hoy: NO cae a "la más reciente" —si hoy no toca entrenar,
 * el Inicio no muestra tarjeta (era confuso ver el viernes en un martes).
 */
export function findTodaysWorkout(workouts: Workout[], now = new Date()): Workout | undefined {
  const hoy = DIAS_SEMANA[indiceDia(now)];
  return workouts.find((w) => w.day && normalizar(w.day).includes(normalizar(hoy)));
}

/** ¿La tarjeta de hoy es un match real por día, o solo el más reciente? */
export function esDeHoy(workout: Workout, now = new Date()): boolean {
  const hoy = DIAS_SEMANA[indiceDia(now)];
  return !!workout.day && normalizar(workout.day).includes(normalizar(hoy));
}

/**
 * Estado de cada barrita de la racha:
 * - `done`   → el workout de ese día está completado (verde)
 * - `missed` → el día ya llegó, tenía rutina y no se completó (gris claro)
 * - `future` → el día tiene rutina pero aún no llega (gris oscuro)
 * - `rest`   → ese día NO hay rutina registrada (descanso): no cuenta ni rompe racha
 */
export type DayStatus = 'done' | 'missed' | 'future' | 'rest';

/** El workout asignado a un día de la semana, según el texto de `Workout.day`. */
export function workoutForWeekday(workouts: Workout[], diaIndex: number): Workout | undefined {
  const dia = DIAS_SEMANA[diaIndex];
  return workouts.find((w) => w.day && normalizar(w.day).includes(normalizar(dia)));
}

/**
 * Un workout cuenta como hecho cuando **todas** sus series están marcadas.
 * Se exige al menos una serie para que una rutina vacía no cuente como completada.
 */
export function isWorkoutDone(workout: Workout): boolean {
  const sets = workout.exercises.flatMap((we) => we.sets);
  return sets.length > 0 && sets.every((s) => s.done);
}

/**
 * Estado de los siete días (lunes→domingo) de la semana en curso, derivado de
 * los `done` de las series. Marcar o desmarcar una serie en el detalle cambia
 * estos estados al instante, porque el store actualiza el workout en memoria.
 *
 * OJO: `done` es un booleano en la fila del set, no un registro con fecha. Es
 * el estado *actual*, no un historial — por eso la semana es lo máximo que se
 * puede reconstruir. Un historial real necesita una tabla de sesiones.
 */
export function weekStatuses(workouts: Workout[], now = new Date()): DayStatus[] {
  const hoy = indiceDia(now);

  return DIAS_SEMANA.map((_, i) => {
    const workout = workoutForWeekday(workouts, i);
    // Sin rutina ese día → descanso: no rompe la racha ni cuenta como fallado.
    if (!workout) return 'rest';
    if (i > hoy) return 'future';
    return isWorkoutDone(workout) ? 'done' : 'missed';
  });
}

/** Cuántos días de la semana tienen una rutina registrada (Lun/Mié/Vie = 3). */
export function trainingDaysPerWeek(workouts: Workout[]): number {
  return DIAS_SEMANA.reduce((n, _, i) => (workoutForWeekday(workouts, i) ? n + 1 : n), 0);
}

/**
 * Racha: días consecutivos completados contando hacia atrás desde hoy.
 *
 * Si hoy todavía no está completado no se rompe la racha — se empieza a contar
 * desde ayer, porque el día aún está en curso.
 */
export function streakDays(workouts: Workout[], now = new Date()): number {
  const estados = weekStatuses(workouts, now);
  const hoy = indiceDia(now);

  // Hoy en curso: si es un día de entreno aún no hecho ('missed'), no rompe la
  // racha —se empieza a contar desde ayer.
  let i = estados[hoy] === 'missed' ? hoy - 1 : hoy;
  let racha = 0;
  for (; i >= 0; i--) {
    const e = estados[i];
    if (e === 'done') racha += 1;
    else if (e === 'rest' || e === 'future') continue; // descanso/futuro no rompen
    else break; // un 'missed' pasado (día de rutina saltado) sí rompe la racha
  }
  return racha;
}

/** Días completados en la semana (numerador del aro de progreso). */
export function weekCount(workouts: Workout[], now = new Date()): number {
  return weekStatuses(workouts, now).filter((s) => s === 'done').length;
}

/** Entrenamientos creados en el mes en curso. */
export function monthCount(workouts: Workout[], now = new Date()): number {
  return workouts.filter((w) => {
    const d = new Date(w.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
}

/**
 * Cuántas semanas (filas lunes→domingo de un calendario) tiene el mes en curso.
 * Depende de en qué día cae el 1° y de cuántos días tiene: 4, 5 o 6.
 */
export function weeksInMonth(now = new Date()): number {
  const y = now.getFullYear();
  const m = now.getMonth();
  const diasDelMes = new Date(y, m + 1, 0).getDate();
  const offsetPrimero = (new Date(y, m, 1).getDay() + 6) % 7; // 0 = lunes
  return Math.ceil((diasDelMes + offsetPrimero) / 7);
}

/** Objetivo de entrenos del mes = días de rutina/semana × semanas del mes. */
export function monthlyGoal(workouts: Workout[], now = new Date()): number {
  return trainingDaysPerWeek(workouts) * weeksInMonth(now);
}

/**
 * Entrenos COMPLETADOS en el mes: los archivados en el historial (WorkoutSession)
 * más las rutinas completadas en la semana en curso (que aún no se archivan).
 */
export function workoutsDoneThisMonth(
  sessions: WorkoutSession[],
  workouts: Workout[],
  now = new Date()
): number {
  const y = now.getFullYear();
  const m = now.getMonth();
  const delHistorial = sessions.filter((s) => {
    const d = new Date(s.completedAt);
    return d.getFullYear() === y && d.getMonth() === m;
  }).length;
  // La semana en curso todavía no está archivada: se suman las rutinas ya hechas.
  const deEstaSemana = workouts.filter(isWorkoutDone).length;
  return delHistorial + deEstaSemana;
}

/** Duración estimada en minutos: descanso + ejecución de cada serie. */
export function estimateMinutes(workout: Workout): number {
  const segundos = workout.exercises.reduce(
    (acc, we) =>
      acc +
      we.sets.reduce(
        (s, set) => s + (set.restSeconds ?? DESCANSO_POR_DEFECTO) + SEGUNDOS_POR_SERIE,
        0
      ),
    0
  );
  return Math.round(segundos / 60);
}

/**
 * Calorías quemadas en una rutina: suma del `caloriesBurned` de sus series
 * hechas. Es la acumulación por rutina que alimenta la estadística. Las series
 * sin hacer aportan 0 (su `caloriesBurned` es null).
 */
export function workoutCalories(workout: Workout): number {
  return workout.exercises.reduce(
    (acc, we) => acc + we.sets.reduce((s, set) => s + (set.caloriesBurned ?? 0), 0),
    0
  );
}

/** Calorías quemadas en todas las rutinas: la estadística acumulada del usuario. */
export function totalCalories(workouts: Workout[]): number {
  return workouts.reduce((acc, w) => acc + workoutCalories(w), 0);
}

/** Formatea calorías para las tarjetas: 1.240 → "1.2k", 640 → "640". */
export function formatKcal(kcal: number): string {
  const n = Math.round(kcal);
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// =====================================================================
// Historial (derivado de las WorkoutSession archivadas)
// =====================================================================

/** Etiqueta corta de fecha para el eje X: "13 jul". */
function shortDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
    .replace('.', '');
}

/** Punto de un gráfico de barras. */
export type ChartPoint = { label: string; value: number };

/** Calorías quemadas por semana (barras), cronológico, últimas `max` semanas. */
export function caloriesByWeek(sessions: WorkoutSession[], max = 8): ChartPoint[] {
  const porSemana = new Map<string, number>();
  for (const s of sessions) {
    porSemana.set(s.weekStart, (porSemana.get(s.weekStart) ?? 0) + s.totalCalories);
  }
  return [...porSemana.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-max)
    .map(([week, kcal]) => ({ label: shortDate(week), value: Math.round(kcal) }));
}

/**
 * Progresión de un ejercicio en el tiempo: peso tope por sesión (o total de reps
 * si es peso corporal). Cronológico, últimas `max` sesiones que lo incluyeron.
 */
export function exerciseProgression(
  sessions: WorkoutSession[],
  exerciseId: string,
  max = 8
): ChartPoint[] {
  const puntos: { date: string; value: number }[] = [];
  for (const s of sessions) {
    const sets = s.sets.filter((x) => x.exerciseId === exerciseId);
    if (sets.length === 0) continue;
    const pesoTope = Math.max(0, ...sets.map((x) => x.weightKg ?? 0));
    const totalReps = sets.reduce((a, x) => a + x.reps, 0);
    puntos.push({ date: s.completedAt, value: pesoTope > 0 ? pesoTope : totalReps });
  }
  return puntos
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-max)
    .map((p) => ({ label: shortDate(p.date), value: Math.round(p.value * 10) / 10 }));
}

/** ¿La progresión de este ejercicio está en kg o en reps (peso corporal)? */
export function progressionUnit(sessions: WorkoutSession[], exerciseId: string): 'kg' | 'reps' {
  for (const s of sessions) {
    for (const x of s.sets) {
      if (x.exerciseId === exerciseId && (x.weightKg ?? 0) > 0) return 'kg';
    }
  }
  return 'reps';
}

/** Resumen de una rutina para la meta-línea: "5 ejercicios · ~52 min · 18 series". */
export function workoutSummary(workout: Workout): {
  exercises: number;
  minutes: number;
  sets: number;
} {
  return {
    exercises: workout.exercises.length,
    minutes: estimateMinutes(workout),
    sets: totalSets(workout),
  };
}

/** Iniciales para el avatar: "Alex Ruiz" → "AR". */
export function initials(name: string | null, email?: string): string {
  const base = name?.trim() || email?.split('@')[0] || '';
  const partes = base.split(/[\s._-]+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

/** Primer nombre para el saludo. */
export function firstName(name: string | null, email?: string): string {
  const base = name?.trim() || email?.split('@')[0] || '';
  return base.split(/[\s._-]+/)[0] || 'atleta';
}
