import type { PlaybackError } from '@lib/playbackStore';

/**
 * Check if two notes match (case-insensitive, octave-agnostic)
 */
export function checkNoteMatchAnyOctave(expectedNote: string, userNote: string): boolean {
  // Extract note name without octave (e.g., "C4" -> "C", "F#5" -> "F#")
  const expectedNoteName = expectedNote.replace(/-?\d+$/, '');
  const userNoteName = userNote.replace(/-?\d+$/, '');

  return expectedNoteName.toLowerCase() === userNoteName.toLowerCase();
}

/**
 * Calculate timing error in milliseconds
 * Positive = late, Negative = early
 */
export function calculateTimingError(expectedTime: number, actualTime: number): number {
  return actualTime - expectedTime;
}

/**
 * Check if duration matches within tolerance
 */
export function checkDurationMatch(
  expectedDuration: number,
  actualDuration: number,
  tolerance: number = 100, // ms tolerance
): boolean {
  return Math.abs(expectedDuration - actualDuration) <= tolerance;
}

/**
 * Create an error object
 */
export function createError(
  type: PlaybackError['type'],
  noteIndex: number,
  details: {
    expectedNote: string;
    actualNote?: string;
    timingError?: number;
    durationError?: number;
  },
): PlaybackError {
  return {
    type,
    noteIndex,
    expectedNote: details.expectedNote,
    actualNote: details.actualNote,
    timingError: details.timingError,
    durationError: details.durationError,
    timestamp: Date.now(),
  };
}

/**
 * Error type constants
 */
export const ERROR_TYPES = {
  WRONG_NOTE: 'WRONG_NOTE' as const,
  TOO_EARLY: 'TOO_EARLY' as const,
  TOO_LATE: 'TOO_LATE' as const,
  WRONG_DURATION: 'WRONG_DURATION' as const,
  MISSED_NOTE: 'MISSED_NOTE' as const,
};
