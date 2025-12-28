/**
 * Calculates the duration of a note in milliseconds based on tempo
 */
export function getNoteDurationMs(duration: number, tempo: number): number {
  const msPerBeat = 60000 / tempo;
  return duration * msPerBeat;
}
