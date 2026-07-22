/** Autocompletado de direcciones vía backend (OpenStreetMap, sin key). */

import { request } from './client';

export type GeoResult = {
  /** Dirección legible completa. */
  displayName: string;
  lat: number;
  lng: number;
};

export function geocode(q: string, signal?: AbortSignal): Promise<GeoResult[]> {
  return request<GeoResult[]>(`/geocode?q=${encodeURIComponent(q)}`, { signal });
}

/** Dirección de una coordenada (cuando se mueve el pin en el mapa). */
export function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<GeoResult> {
  return request<GeoResult>(`/reverse-geocode?lat=${lat}&lng=${lng}`, { signal });
}
