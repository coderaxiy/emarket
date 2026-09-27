// Yandex Maps JS API v3 (ymaps3), loaded once on demand, and the address search used by
// the pickup-point picker (Geosuggest + HTTP Geocoder). Keys are public browser keys from
// `astro:env/client`; restrict them to the site's domains in the Yandex developer console.
// Coordinates in ymaps3 are [longitude, latitude].

import { PUBLIC_YANDEX_MAPS_API_KEY, PUBLIC_YANDEX_SUGGEST_API_KEY } from 'astro:env/client';
import type { Locale } from '@/i18n';

export type LngLat = [number, number];

/** The slice of ymaps3 the picker uses. */
export interface YMapLocation {
  center: LngLat;
  zoom: number;
  duration?: number;
}
export interface YMapEntity {
  update(props: Record<string, unknown>): void;
}
export interface YMapInstance extends YMapEntity {
  addChild(child: YMapEntity): YMapInstance;
  removeChild(child: YMapEntity): YMapInstance;
  destroy(): void;
  readonly center: LngLat;
  readonly zoom: number;
}
export interface Ymaps3 {
  ready: Promise<void>;
  YMap: new (element: HTMLElement, props: { location: YMapLocation; mode?: 'vector' | 'raster' }) => YMapInstance;
  YMapDefaultSchemeLayer: new (props: { theme?: 'light' | 'dark' }) => YMapEntity;
  YMapDefaultFeaturesLayer: new (props: Record<string, never>) => YMapEntity;
  YMapMarker: new (props: { coordinates: LngLat; zIndex?: number }, element: HTMLElement) => YMapEntity;
  YMapListener: new (props: { onActionEnd?: (event: { location?: { center: LngLat; zoom: number } }) => void }) => YMapEntity;
}

declare global {
  interface Window {
    ymaps3?: Ymaps3;
  }
}

const YMAPS_LANG: Record<Locale, string> = { uz: 'uz_UZ', ru: 'ru_RU', en: 'en_US' };

/** Tashkent: the map's start when nothing better is known. */
export const DEFAULT_CENTER: LngLat = [69.2797, 41.3111];

export const hasMapsKey = Boolean(PUBLIC_YANDEX_MAPS_API_KEY);
export const hasSuggestKey = Boolean(PUBLIC_YANDEX_SUGGEST_API_KEY);

let loading: Promise<Ymaps3> | undefined;

/** Loads ymaps3 once per page session. Rejects without a key or when the script fails. */
export function loadYmaps3(locale: Locale): Promise<Ymaps3> {
  if (!hasMapsKey) return Promise.reject(new Error('No Yandex Maps key'));
  loading ??= new Promise<Ymaps3>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(PUBLIC_YANDEX_MAPS_API_KEY!)}&lang=${YMAPS_LANG[locale]}`;
    script.async = true;
    script.onload = () => {
      const api = window.ymaps3;
      if (!api) {
        reject(new Error('ymaps3 missing after load'));
        return;
      }
      api.ready.then(() => resolve(api), reject);
    };
    script.onerror = () => reject(new Error('Yandex Maps failed to load'));
    document.head.append(script);
  }).catch((error: unknown) => {
    loading = undefined; // allow a retry on the next open
    throw error;
  });
  return loading;
}

export interface AddressSuggestion {
  title: string;
  subtitle?: string;
  /** Yandex object URI, resolved to coordinates by `geocodeUri`. */
  uri?: string;
}

/** Address suggestions (Geosuggest), biased to Uzbekistan. */
export async function suggestAddresses(text: string, locale: Locale, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  if (!hasSuggestKey) return [];
  const params = new URLSearchParams({
    apikey: PUBLIC_YANDEX_SUGGEST_API_KEY!,
    text,
    lang: YMAPS_LANG[locale],
    results: '6',
    attrs: 'uri',
    // Rough bounding box of Uzbekistan (lng,lat~lng,lat), a hint, not a filter.
    bbox: '55.9,37.1~73.2,45.6',
  });
  const response = await fetch(`https://suggest-maps.yandex.ru/v1/suggest?${params}`, { signal });
  if (!response.ok) throw new Error(`Suggest ${response.status}`);
  const body = (await response.json()) as { results?: { title?: { text?: string }; subtitle?: { text?: string }; uri?: string }[] };
  return (body.results ?? [])
    .filter((result) => result.title?.text)
    .map((result) => ({ title: result.title!.text!, subtitle: result.subtitle?.text, uri: result.uri }));
}

/** Coordinates of a suggestion (HTTP Geocoder, same key as the JS API). */
export async function geocodeUri(uri: string, locale: Locale, signal?: AbortSignal): Promise<LngLat | undefined> {
  if (!hasMapsKey) return undefined;
  const params = new URLSearchParams({ apikey: PUBLIC_YANDEX_MAPS_API_KEY!, uri, format: 'json', lang: YMAPS_LANG[locale], results: '1' });
  const response = await fetch(`https://geocode-maps.yandex.ru/1.x/?${params}`, { signal });
  if (!response.ok) throw new Error(`Geocoder ${response.status}`);
  const body = (await response.json()) as {
    response?: { GeoObjectCollection?: { featureMember?: { GeoObject?: { Point?: { pos?: string } } }[] } };
  };
  const pos = body.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
  if (!pos) return undefined;
  const [lng, lat] = pos.split(' ').map(Number);
  return lng !== undefined && lat !== undefined && Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : undefined;
}
