import type { Melody, NoteEvent } from '@lib/components/Chart';
import { settings } from '@lib/store';

import * as errorTrackingEngine from './errorTrackingEngine';
import * as playbackEngine from './playbackEngine';
import * as waitForUserEngine from './waitForUserEngine';

/**
 * Get the appropriate engine based on current playback mode
 */
function getEngine() {
  switch (settings.playbackMode) {
    case 'waitForUser':
      return waitForUserEngine;
    case 'errorTracking':
      return errorTrackingEngine;
    case 'normal':
    default:
      return playbackEngine;
  }
}

/**
 * Start or resume playback
 */
export function play(input?: Melody | NoteEvent[]): void {
  const engine = getEngine();
  engine.play(input);
}

/**
 * Pause playback at current position
 */
export function pause(): void {
  const engine = getEngine();
  engine.pause();
}

/**
 * Stop playback and reset to beginning
 */
export function stop(): void {
  const engine = getEngine();
  engine.stop();
}

/**
 * Toggle between play and pause
 */
export function toggle(melody?: Melody | NoteEvent[]): void {
  const engine = getEngine();
  engine.toggle(melody);
}

/**
 * Set the tempo (BPM)
 */
export function setTempo(tempo: number): void {
  playbackEngine.setTempo(tempo);
}

/**
 * Seek to a specific note index
 */
export function seek(noteIndex: number, delayMs: number = 0): void {
  const engine = getEngine();
  engine.seek(noteIndex, delayMs);
}
