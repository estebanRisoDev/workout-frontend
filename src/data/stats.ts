/**
 * Cálculos derivados para la pantalla de inicio: qué toca hoy, racha semanal
 * y estadísticas. Todo se deriva de los `Workout` que ya trae el store, sin
 * endpoints nuevos.
 */

import { totalSets, totalVolume, type Workout } from './workouts';

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
 * El workout que toca hoy.
 *
 * `Workout.day` es texto libre ("Día de empuje", "Lunes - Empuje"), así que se
 * busca el nombre del día de hoy dentro de ese texto. Si ninguno lo menciona,
 * se cae al más reciente para no dejar la tarjeta vacía.
 */
export function findTodaysWorkout(workouts: Workout[], now = new Date()): Workout | undefined {
  if (workouts.length === 0) return undefined;

  const hoy = DIAS_SEMANA[indiceDia(now)];
  const coincide = workouts.find((w) => w.day && normalizar(w.day).includes(normalizar(hoy)));
  if (coincide) return coincide;

  return [...workouts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
}

/** ¿La tarjeta de hoy es un match real por día, o solo el más reciente? */
export function esDeHoy(workout: Workout, now = new Date()): boolean {
  const hoy = DIAS_SEMANA[indiceDia(now)];
  return !!workout.day && normalizar(workout.day).includes(normalizar(hoy));
}

/**
 * Estado de cada barrita de la racha:
 * - `done`   → el workout de ese día está completado (verde)
 * - `missed` → el día ya llegó y no está completado (gris claro)
 * - `future` → el día aún no llega (gris oscuro)
 */
export type DayStatus = 'done' | 'missed' | 'future';

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
    if (i > hoy) return 'future';
    const workout = workoutForWeekday(workouts, i);
    return workout && isWorkoutDone(workout) ? 'done' : 'missed';
  });
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

  let i = estados[hoy] === 'done' ? hoy : hoy - 1;
  let racha = 0;
  while (i >= 0 && estados[i] === 'done') {
    racha += 1;
    i -= 1;
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

/** Volumen acumulado de todas las rutinas, formateado ("32.4t", "850kg"). */
export function formatTotalVolume(workouts: Workout[]): string {
  const kg = workouts.reduce((acc, w) => acc + totalVolume(w), 0);
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)}kg`;
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
