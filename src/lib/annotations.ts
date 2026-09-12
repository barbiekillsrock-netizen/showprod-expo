import AsyncStorage from '@react-native-async-storage/async-storage';

export type Point = { x: number; y: number };
export type Stroke = { color: string; width: number; points: Point[] };

const KEY = (songId: string) => `annotations:${songId}`;

export async function loadAnnotations(songId: string): Promise<Stroke[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY(songId));
    if (!raw) return [];
    return JSON.parse(raw) as Stroke[];
  } catch { return []; }
}

export async function saveAnnotations(songId: string, strokes: Stroke[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY(songId), JSON.stringify(strokes));
  } catch {}
}

export async function clearAnnotations(songId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY(songId));
  } catch {}
}
