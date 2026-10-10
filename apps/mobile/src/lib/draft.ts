import type { EntrySource, FoodItem } from './types';

/**
 * In-memory hand-off from the "add" screen to the review screen, so large
 * objects don't travel through route params. Nothing here is persisted.
 */
export type Draft = {
  day: string;
  title: string;
  photoUri: string | null;
  source: EntrySource;
  items: FoodItem[];
};

let current: Draft | null = null;

export function setDraft(d: Draft | null) {
  current = d;
}

export function getDraft(): Draft | null {
  return current;
}
