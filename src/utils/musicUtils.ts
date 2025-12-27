// Simple helper to darken/lighten hex color
const adjustBrightness = (hex: string, percent: number): string => {
  // Strip the hash if it exists
  const cleanHex = hex.replace('#', '');

  // Parse r, g, b
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Adjust by percent (positive = lighter, negative = darker)
  // We want to scale towards 0 (black) if percent < 0, or towards 255 (white) if percent > 0.

  const adjust = (val: number) => {
    let newVal = val;
    if (percent < 0) {
      // Darken: move towards 0
      newVal = val * (1 + percent);
    } else {
      // Lighten: move towards 255
      newVal = val + (255 - val) * percent;
    }
    return Math.min(255, Math.max(0, Math.round(newVal)));
  };

  const newR = adjust(r);
  const newG = adjust(g);
  const newB = adjust(b);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
};

export const getNoteColor = (note: string, baseColors: Record<string, string>): string => {
  // note format: "C4", "F#5", etc.
  // Extract note name (letters) and octave (number)
  const match = note.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) {
    return '#ffffff';
  }

  const noteName = match[1]; // e.g. "C", "F#"
  const octave = parseInt(match[2], 10);

  // Handle black keys: they usually don't have a distinct base color in the settings provided (which has C, D, E...).
  // Typically black keys are sharps of the previous note.
  // If we want to color black keys, we can use the base note's color but darkened/desaturated, or just keep them black?
  // The plan said "Matches the color with the key".
  // If the user selected "Yes, color the piano keys", we probably want black keys to be colored too.
  // Let's use the base note name (e.g. C# uses C's color) but maybe darker or different?
  // Or just return null/black if the user wants standard black keys.
  // But assuming we want to color them:

  const baseName = noteName.replace('#', ''); // C# -> C
  const baseColor = baseColors[baseName] || '#888888';

  // Octave adjustment
  // Base octave is around 4.
  // Octave 1: -60% brightness
  // Octave 2: -40%
  // Octave 3: -20%
  // Octave 4: 0%
  // Octave 5: +20%
  // Octave 6: +40%
  // Octave 7: +60%

  const octaveDiff = octave - 4;
  const brightnessAdjustment = octaveDiff * 0.15; // 15% per octave
  // Cap it reasonably so it doesn't go full white or black
  const clampedAdjustment = Math.max(-0.8, Math.min(0.8, brightnessAdjustment));

  let color = adjustBrightness(baseColor, clampedAdjustment);

  // If it's a sharp note, maybe darken it a bit more to distinguish from natural?
  if (noteName.includes('#')) {
    color = adjustBrightness(color, -0.3);
  }

  return color;
};

export const getNoteContrastColor = (
  note: string,
  contrastColors: Record<string, string>,
): string => {
  const match = note.match(/^([A-G]#?)(-?\d+)$/);
  if (!match) {
    return '#ffffff';
  }

  const noteName = match[1]; // e.g. "C", "F#"
  const baseName = noteName.replace('#', '');

  return contrastColors[baseName] || '#ffffff';
};

export const SOLFEGE_MAP: Record<string, string> = {
  C: 'Do',
  'C#': 'Di',
  D: 'Re',
  'D#': 'Ri',
  E: 'Mi',
  F: 'Fa',
  'F#': 'Fi',
  G: 'Sol',
  'G#': 'Si',
  A: 'La',
  'A#': 'Li',
  B: 'Ti', // or Si
};

export const getSolfege = (note: string): string => {
  // note is "C4" etc.
  const noteName = note.replace(/-?\d+$/, '');
  return SOLFEGE_MAP[noteName] || noteName;
};
