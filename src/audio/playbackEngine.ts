import type { NoteEvent } from '@lib/components/Chart';
import { playback, setPlayback } from '@lib/playbackStore';

import { playNote, stopNote } from './audioEngine';

let playbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
let currentlyPlayingNote: string | null = null;

/**
 * Calculates the duration of a note in milliseconds based on tempo
 */
function getNoteDurationMs(duration: number, tempo: number): number {
  const msPerBeat = 60000 / tempo;
  return duration * msPerBeat;
}

/**
 * Schedules and plays notes sequentially
 */
function scheduleNextNote(noteIndex: number): void {
  const { melody, tempo, isPlaying } = playback;

  // Stop if not playing or reached end
  if (!isPlaying || noteIndex >= melody.length) {
    stop();
    return;
  }

  const note = melody[noteIndex];

  // Stop the previous note if any
  if (currentlyPlayingNote) {
    stopNote(currentlyPlayingNote);
  }

  // Update current note index in store
  setPlayback('currentNoteIndex', noteIndex);

  // Play the current note
  playNote(note.note);
  currentlyPlayingNote = note.note;

  // Schedule the next note
  const durationMs = getNoteDurationMs(note.duration, tempo);
  playbackTimeoutId = setTimeout(() => {
    scheduleNextNote(noteIndex + 1);
  }, durationMs);
}

/**
 * Start or resume playback
 */
export function play(melody?: NoteEvent[]): void {
  // If melody is provided, set it and start from beginning
  if (melody) {
    setPlayback('melody', melody);
    setPlayback('currentNoteIndex', -1);
  }

  // Don't start if no melody
  if (playback.melody.length === 0) {
    return;
  }

  setPlayback('isPlaying', true);

  // Start from current position or beginning
  const startIndex = playback.currentNoteIndex < 0 ? 0 : playback.currentNoteIndex;
  scheduleNextNote(startIndex);
}

/**
 * Pause playback at current position
 */
export function pause(): void {
  setPlayback('isPlaying', false);

  if (playbackTimeoutId) {
    clearTimeout(playbackTimeoutId);
    playbackTimeoutId = null;
  }

  if (currentlyPlayingNote) {
    stopNote(currentlyPlayingNote);
    currentlyPlayingNote = null;
  }
}

/**
 * Stop playback and reset to beginning
 */
export function stop(): void {
  setPlayback('isPlaying', false);
  setPlayback('currentNoteIndex', -1);

  if (playbackTimeoutId) {
    clearTimeout(playbackTimeoutId);
    playbackTimeoutId = null;
  }

  if (currentlyPlayingNote) {
    stopNote(currentlyPlayingNote);
    currentlyPlayingNote = null;
  }
}

/**
 * Toggle between play and pause
 */
export function toggle(melody?: NoteEvent[]): void {
  if (playback.isPlaying) {
    pause();
  } else {
    play(melody);
  }
}

/**
 * Set the tempo (BPM)
 */
export function setTempo(tempo: number): void {
  setPlayback('tempo', Math.max(20, Math.min(300, tempo)));
}

/**
 * Seek to a specific note index
 */
export function seek(noteIndex: number): void {
  const wasPlaying = playback.isPlaying;

  // Stop current playback
  if (playbackTimeoutId) {
    clearTimeout(playbackTimeoutId);
    playbackTimeoutId = null;
  }

  if (currentlyPlayingNote) {
    stopNote(currentlyPlayingNote);
    currentlyPlayingNote = null;
  }

  // Set the new position
  const clampedIndex = Math.max(-1, Math.min(noteIndex, playback.melody.length - 1));
  setPlayback('currentNoteIndex', clampedIndex);

  // Resume if was playing
  if (wasPlaying && clampedIndex >= 0) {
    scheduleNextNote(clampedIndex);
  }
}
