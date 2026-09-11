import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

export const VALID_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm',
];

export const GENRES = [
  'Rock', 'Pop', 'Rock Pop', 'Pop Rock', 'Sertanejo', 'Pagode', 'Samba',
  'MPB', 'Forró', 'Gospel', 'Blues', 'Jazz', 'Soul/Funk', 'R&B',
  'Hip-Hop', 'Eletrônico', 'Reggae', 'Clássico', 'Bossa Nova', 'Axé',
  'Funk', 'Metal', 'Outro',
];

export function normalizeKey(raw: string): string {
  const trimmed = raw.trim();
  const found = VALID_KEYS.find(k => k.toLowerCase() === trimmed.toLowerCase());
  return found ?? trimmed;
}

export function isValidKey(raw: string): boolean {
  if (!raw.trim()) return true;
  return VALID_KEYS.some(k => k.toLowerCase() === raw.trim().toLowerCase());
}

export type Song = {
  id: string;
  title: string;
  artist: string;
  key: string;
  genre?: string;
  bpm?: number;
  lyrics?: string;
  hasPdf?: boolean;
  pdfUri?: string;
  pdfName?: string;
};

const STORAGE_KEY = 'songs:v1';
const listeners = new Set<() => void>();
let state: Song[] = [];
let hydrated = false;

function emit() {
  for (const l of listeners) l();
}

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function load() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Song[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function persist(songs: Song[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
  } catch {}
}

export const songsStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  async hydrate() {
    if (hydrated) return;
    state = await load();
    hydrated = true;
    emit();
  },
  async add(song: Omit<Song, 'id' | 'hasPdf'>): Promise<Song> {
    const entry: Song = {
      id: makeId(),
      ...song,
      key: normalizeKey(song.key || ''),
      hasPdf: !!song.pdfUri,
    };
    state = [entry, ...state];
    await persist(state);
    emit();
    return entry;
  },
  async remove(id: string) {
    state = state.filter(s => s.id !== id);
    await persist(state);
    emit();
  },
  async update(id: string, patch: Partial<Omit<Song, 'id'>>) {
    state = state.map(s => s.id === id ? {
      ...s, ...patch,
      key: patch.key !== undefined ? normalizeKey(patch.key) : s.key,
      hasPdf: patch.pdfUri !== undefined ? !!patch.pdfUri : s.hasPdf,
    } : s);
    await persist(state);
    emit();
  },
};

export function useSongs(): Song[] {
  const [songs, setSongs] = useState<Song[]>(state);

  useEffect(() => {
    songsStore.hydrate();
    const unsub = songsStore.subscribe(() => setSongs([...songsStore.get()]));
    setSongs([...songsStore.get()]);
    return unsub;
  }, []);

  return songs;
}
