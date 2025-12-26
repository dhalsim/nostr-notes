import { createStore } from 'solid-js/store';

import type { NoteEvent } from './components/Chart';

export interface PlaybackState {
  isPlaying: boolean;
  currentNoteIndex: number; // -1 when stopped/not started
  lastCompletedNoteIndex: number; // last note that fully finished (-1 initial)
  melody: NoteEvent[];
  startAfterTs: number | null; // timestamp (ms) to delay playback start; null means no delay
}

const DEFAULT_PLAYBACK_STATE: PlaybackState = {
  isPlaying: false,
  currentNoteIndex: -1,
  lastCompletedNoteIndex: -1,
  melody: [],
  startAfterTs: null,
};

export const [playback, setPlayback] = createStore<PlaybackState>(DEFAULT_PLAYBACK_STATE);
