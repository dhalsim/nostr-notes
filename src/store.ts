import { createEffect } from 'solid-js';
import { createStore } from 'solid-js/store';

export type Waveform = 'triangle' | 'sine' | 'square' | 'sawtooth';
export type ChartType = 'bar' | 'sheet';

interface Settings {
  waveform: Waveform;
  volume: number;
  showNotes: boolean;
  showShortcuts: boolean;
  octaveCount: number; // 1 or 2
  baseOctave: number; // e.g., 3, 4, 5
  chartType: ChartType;
  showKeyColors: boolean;
  showOctaveControls: boolean;
  showInstructions: boolean;
  noteColors: Record<string, string>;
  tempo: number;
}

const SETTINGS_VERSION = 4;
const STORAGE_KEY = 'solid-piano-settings';

export const DEFAULT_NOTE_COLORS: Record<string, string> = {
  C: '#ef4444', // Red (Do)
  D: '#f97316', // Orange (Re)
  E: '#eab308', // Yellow (Mi)
  F: '#22c55e', // Green (Fa)
  G: '#3b82f6', // Blue (Sol)
  A: '#a855f7', // Purple (La)
  B: '#ec4899', // Pink (Si)
};

const isDesktopLikeDevice = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }

  try {
    return !window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return true;
  }
};

const DEFAULT_SETTINGS: Settings = {
  waveform: 'triangle',
  volume: 0.5,
  showNotes: true,
  showShortcuts: true,
  octaveCount: 1,
  baseOctave: 4,
  chartType: 'bar',
  showKeyColors: true,
  showOctaveControls: isDesktopLikeDevice(),
  showInstructions: true,
  noteColors: DEFAULT_NOTE_COLORS,
  tempo: 120,
};

// Load from LocalStorage
const loadSettings = (): Settings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.version === SETTINGS_VERSION && parsed.data) {
        return { ...DEFAULT_SETTINGS, ...parsed.data };
      } else if (parsed.version < SETTINGS_VERSION && parsed.data) {
        // Migration logic if needed (simple merge for now)
        return { ...DEFAULT_SETTINGS, ...parsed.data };
      }
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
};

export const [settings, setSettings] = createStore<Settings>(loadSettings());

// Save to LocalStorage on change
createEffect(() => {
  const data = JSON.stringify({
    version: SETTINGS_VERSION,
    data: settings,
  });

  localStorage.setItem(STORAGE_KEY, data);
});
