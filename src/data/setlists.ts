import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

export type Setlist = {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
};

const STORAGE_KEY = 'setlists:v1';
const listeners = new Set<() => void>();
let state: Setlist[] = [];
let hydrated = false;

function emit() {
  for (const l of listeners) l();
}

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function load(): Promise<Setlist[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Setlist[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function persist(items: Setlist[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export const setlistsStore = {
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
  async create(name: string): Promise<Setlist> {
    const item: Setlist = {
      id: makeId(),
      name: name.trim() || 'Novo setlist',
      songIds: [],
      createdAt: Date.now(),
    };
    state = [item, ...state];
    await persist(state);
    emit();
    return item;
  },
  async rename(id: string, name: string) {
    state = state.map(s => s.id === id ? { ...s, name } : s);
    await persist(state);
    emit();
  },
  async remove(id: string) {
    state = state.filter(s => s.id !== id);
    await persist(state);
    emit();
  },
  async setSongs(id: string, songIds: string[]) {
    state = state.map(s => s.id === id ? { ...s, songIds } : s);
    await persist(state);
    emit();
  },
};

export function useSetlists(): Setlist[] {
  const [setlists, setSetlists] = useState<Setlist[]>(state);

  useEffect(() => {
    setlistsStore.hydrate();
    const unsub = setlistsStore.subscribe(() => setSetlists([...setlistsStore.get()]));
    setSetlists([...setlistsStore.get()]);
    return unsub;
  }, []);

  return setlists;
}
