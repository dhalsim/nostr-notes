import { createStore } from 'solid-js/store';

import type { NoteEvent } from './components/Chart';

export interface UserInputEvent {
  note: string;
  pressTime: number; // timestamp in ms
  releaseTime: number | null; // null if still pressed
}

export interface PlaybackError {
  type: 'WRONG_NOTE' | 'TOO_EARLY' | 'TOO_LATE' | 'WRONG_DURATION' | 'MISSED_NOTE';
  noteIndex: number;
  expectedNote: string;
  actualNote?: string;
  timingError?: number; // ms
  durationError?: number; // ms
  timestamp: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentNoteIndex: number; // -1 when stopped/not started
  lastCompletedNoteIndex: number; // last note that fully finished (-1 initial)
  melody: NoteEvent[];
  startAfterTs: number | null; // timestamp (ms) to delay playback start; null means no delay
  expectedNoteIndex: number; // Index of note user should play (for wait-for-user mode)
  userInputEvents: UserInputEvent[]; // Array of user key press/release events
  errors: PlaybackError[]; // Array of detected errors
  nextNoteToPlay: string | null; // Note that should be played next (for piano highlighting)
}

const DEFAULT_PLAYBACK_STATE: PlaybackState = {
  isPlaying: false,
  currentNoteIndex: -1,
  lastCompletedNoteIndex: -1,
  melody: [],
  startAfterTs: null,
  expectedNoteIndex: -1,
  userInputEvents: [],
  errors: [],
  nextNoteToPlay: null,
};

export const [playback, setPlayback] = createStore<PlaybackState>(DEFAULT_PLAYBACK_STATE);
