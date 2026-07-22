/** Catálogos globales de nutrición: planes y alimentos. Ver backend routes. */

import { request } from './client';
import type { Food, NutritionPlan } from '@/data/nutrition';

export function listNutritionPlans(signal?: AbortSignal): Promise<NutritionPlan[]> {
  return request<NutritionPlan[]>('/nutrition-plans', { signal });
}

export function fetchNutritionPlan(id: string, signal?: AbortSignal): Promise<NutritionPlan> {
  return request<NutritionPlan>(`/nutrition-plans/${id}`, { signal });
}

export function listFoods(signal?: AbortSignal): Promise<Food[]> {
  return request<Food[]>('/foods', { signal });
}

// =====================================================================
// Plan del día
// =====================================================================

/** El aporte de un ingrediente en UNA porción del plato. */
export type MealIngredient = {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

/** Un plato concreto. Los macros son de UNA porción, no de la receta entera. */
export type PlanMeal = {
  externalId: number;
  title: string;
  imageUrl: string | null;
  servings: number;
  weightPerServing: number | null;
  readyInMinutes: number | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Ingredientes de UNA porción (vacío si el plato aún no se descompuso). */
  ingredients: MealIngredient[];
};

export type PlanTarget = {
  kcal: number;
  macros: { protein: number; carbs: number; fat: number };
};

/** Una ranura del día (desayuno, almuerzo, once, cena) con el plato que salió. */
export type PlannedSlot = {
  slot: { key: string; label: string; share: number; type: string };
  asked: PlanTarget;
  /** null cuando la ventana de macros no devolvió ningún plato. */
  meal: PlanMeal | null;
  /** Porciones a servir: 1 = la porción tal cual, 1.5 = una y media. */
  portions: number;
  /** El peso a servir en gramos, cuando la receta informa cuánto pesa. */
  grams: number | null;
  /** Macros YA escalados por `portions`. Es lo que hay que mostrar y sumar. */
  served: PlanTarget;
  source: 'cache' | 'api' | null;
};

export type DayPlan = {
  goal: string;
  target: PlanTarget;
  meals: PlannedSlot[];
  totals: PlanTarget;
  /** Real − objetivo. Negativo = el día quedó corto. */
  diff: PlanTarget;
};

/**
 * Arma el plan del día para el usuario autenticado.
 *
 * El backend reparte el target entre las cuatro comidas y elige un plato del
 * catálogo local para cada una. No consulta APIs externas ni consume cuota.
 */
export function fetchDailyPlan(goal?: string, signal?: AbortSignal): Promise<DayPlan> {
  const query = goal ? `?goal=${encodeURIComponent(goal)}` : '';
  return request<DayPlan>(`/nutrition/daily-plan${query}`, { signal });
}
