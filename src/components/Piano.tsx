import { For, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js';
import type { Component } from 'solid-js';

import { playNote, stopNote } from '@lib/audio/audioEngine';
import { playback } from '@lib/playbackStore';
import { setSettings, settings } from '@lib/store';
import { getNoteColor, getNoteContrastColor } from '@lib/utils/musicUtils';

// Helper to generate keys dynamically
const generateKeys = (startOctave: number, count: number) => {
  const whiteKeys: string[] = [];
  const blackKeys: { note: string; pos: number }[] = [];

  // Notes in an octave
  const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const sharps = [
    { name: 'C#', pos: 1 },
    { name: 'D#', pos: 2 },
    // No E#
    { name: 'F#', pos: 4 },
    { name: 'G#', pos: 5 },
    { name: 'A#', pos: 6 },
    // No B#
  ];

  for (let o = 0; o < count; o++) {
    const octave = startOctave + o;

    // Add White Keys
    notes.forEach((n) => {
      whiteKeys.push(`${n}${octave}`);
    });

    // Add Black Keys
    sharps.forEach((s) => {
      // Pos is relative to the start of the octave (0-6 scale roughly)
      // Global position calculation:
      // One octave has 7 white keys.
      // Pos 1 (C#) is between 1st (0) and 2nd (1) white key of the octave.
      // Global offset = (octave_index * 7) + pos
      blackKeys.push({
        note: `${s.name}${octave}`,
        pos: o * 7 + s.pos,
      });
    });
  }

  // Add final C (High C) to complete the range visually if desired?
  // Original code had one extra C at the end (C5).
  // Let's add the first note of the next octave to close it off nicely.
  const finalOctave = startOctave + count;
  whiteKeys.push(`C${finalOctave}`);

  return { whiteKeys, blackKeys };
};

// Keyboard Mappings
// OCTAVE 1 (LEFT)
// White: Q W E R T Y U
// Black: 2 3 5 6 7
const OCTAVE_1_MAPPING = {
  white: ['q', 'w', 'e', 'r', 't', 'y', 'u'],
  black: ['2', '3', '5', '6', '7'],
};

// OCTAVE 2 (RIGHT)
// White: V B N M , . /
// Black: G H K L ;
const OCTAVE_2_MAPPING = {
  white: ['v', 'b', 'n', 'm', ',', '.', '/'],
  black: ['g', 'h', 'k', 'l', ';'],
};

const Piano: Component = () => {
  const [activeKeys, setActiveKeys] = createSignal<Set<string>>(new Set());
  const [desktopCapable, setDesktopCapable] = createSignal(false);

  // Computed Keys based on settings
  const keys = () => generateKeys(settings.baseOctave, settings.octaveCount);

  // Currently playing note from playback (for highlighting)
  const playbackNote = createMemo(() => {
    const { melody, currentNoteIndex, isPlaying } = playback;
    if (!isPlaying || currentNoteIndex < 0 || currentNoteIndex >= melody.length) {
      return null;
    }
    return melody[currentNoteIndex].note;
  });

  // Dynamic Map
  const currentMap = () => {
    const map: Record<string, string> = {};
    const keyList = keys();

    // Octave 1 (Always present)
    // Maps to the first octave of the generated keys (index 0)
    const mapping1 = OCTAVE_1_MAPPING;

    // Map Octave 1 White Keys
    mapping1.white.forEach((k, idx) => {
      const globalIndex = idx; // 0-6
      if (globalIndex < keyList.whiteKeys.length) {
        map[k] = keyList.whiteKeys[globalIndex];
      }
    });

    // Map Octave 1 Black Keys
    mapping1.black.forEach((k, idx) => {
      const globalIndex = idx; // 0-4
      if (globalIndex < keyList.blackKeys.length) {
        map[k] = keyList.blackKeys[globalIndex].note;
      }
    });

    // If Octave Count is 2, map the second octave
    if (settings.octaveCount === 2) {
      const mapping2 = OCTAVE_2_MAPPING;

      // Map Octave 2 White Keys
      // They start after the first 7 keys
      mapping2.white.forEach((k, idx) => {
        const globalIndex = 7 + idx;
        if (globalIndex < keyList.whiteKeys.length) {
          map[k] = keyList.whiteKeys[globalIndex];
        }
      });

      // Map Octave 2 Black Keys
      // They start after the first 5 black keys
      mapping2.black.forEach((k, idx) => {
        const globalIndex = 5 + idx;
        if (globalIndex < keyList.blackKeys.length) {
          map[k] = keyList.blackKeys[globalIndex].note;
        }
      });

      // Try to map high C of Octave 2?
      // White Keys length for 2 octaves is 15 (7+7+1).
      // The last key (index 14) is C(Base+2).
      // Let's map it to the key after '/' which is usually Shift? Or maybe 'i' or something unused?
      // User didn't specify, so we leave it unmapped or maybe map to 'Shift'?
    }

    // High C mapping logic (always the last key)
    // If Octave 1: Last key is index 7 (C5). Mapped to 'i' (next to u)?
    // If Octave 2: Last key is index 14 (C6). Mapped to 'Shift'?

    // Simple "Next Key" heuristic for High C
    const highCIndex = keyList.whiteKeys.length - 1;
    const highCNote = keyList.whiteKeys[highCIndex];

    if (settings.octaveCount === 1) {
      map['i'] = highCNote; // After u
    } else if (settings.octaveCount === 2) {
      // After / is Right Shift, hard to map.
      // Maybe 'Quote' (')?
      map["'"] = highCNote;
    }

    return map;
  };

  const getKeyLabel = (note: string) => {
    const map = currentMap();

    // Reverse lookup
    return (
      Object.keys(map)
        .find((k) => map[k] === note)
        ?.toUpperCase() || ''
    );
  };

  const handleNoteStart = (note: string) => {
    playNote(note);

    setActiveKeys((prev) => new Set(prev).add(note));
  };

  const handleNoteEnd = (note: string) => {
    stopNote(note);

    setActiveKeys((prev) => {
      const next = new Set(prev);
      next.delete(note);
      return next;
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) {
      return;
    }

    // Arrow Keys for Octave Shift
    if (e.key === 'ArrowRight') {
      setSettings('baseOctave', Math.min(settings.baseOctave + 1, 7));
      return;
    }
    if (e.key === 'ArrowLeft') {
      setSettings('baseOctave', Math.max(settings.baseOctave - 1, 1));
      return;
    }

    const note = currentMap()[e.key.toLowerCase()];
    if (note) {
      handleNoteStart(note);
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    const note = currentMap()[e.key.toLowerCase()];
    if (note) {
      handleNoteEnd(note);
    }
  };

  onMount(() => {
    // Detect whether the device supports a "fine" pointer (i.e., mouse or trackpad, typical of desktops/laptops)
    const mql = window.matchMedia?.('(pointer: fine)');

    if (mql) {
      const update = () => setDesktopCapable(mql.matches);
      update();
      // Safari < 14 uses addListener/removeListener.
      if (mql.addEventListener) {
        mql.addEventListener('change', update);
      } else {
        mql.addListener(update);
      }
      onCleanup(() => {
        if (mql.removeEventListener) {
          mql.removeEventListener('change', update);
        } else {
          mql.removeListener(update);
        }
      });
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  });

  const totalWhiteKeys = () => keys().whiteKeys.length;
  const whiteKeyWidth = () => 100 / totalWhiteKeys(); // percent
  const showShortcuts = () => settings.showShortcuts && desktopCapable();
  const shouldShowOctaveControls = () => settings.showOctaveControls && desktopCapable();

  return (
    <div class="flex flex-col items-center gap-3 w-full max-w-full relative flex-1 min-h-0">
      <div
        class="relative w-full flex-1 min-h-0 max-h-[520px] select-none bg-gray-900 pt-2 px-2 sm:pt-3 sm:px-3 rounded-xl shadow-2xl overflow-hidden z-10 flex flex-col gap-0"
        classList={{ 'pb-3': !shouldShowOctaveControls() }}
      >
        {/* Keys Container */}
        <div class="relative w-full flex-1 min-h-0 flex items-stretch">
          {/* White Keys */}
          <For each={keys().whiteKeys}>
            {(note) => {
              const color = settings.showKeyColors
                ? getNoteColor(note, settings.noteColors)
                : undefined;

              const isActive = () => activeKeys().has(note);
              const isPlaybackHighlight = () => playbackNote() === note;
              const contrastColor = () =>
                settings.showKeyColors
                  ? getNoteContrastColor(note, settings.contrastColors)
                  : '#3b82f6';

              return (
                <div
                  class={`relative bg-white border border-gray-300 rounded-b-lg mx-[1px] first:ml-0 last:mr-0 z-10 active:bg-gray-200 transition-all origin-top cursor-pointer flex flex-col justify-end items-center pb-4 ${
                    isActive()
                      ? '!bg-gray-200 shadow-inner scale-y-[0.99] border-b-0'
                      : 'shadow-md border-b-4'
                  }`}
                  style={{
                    width: `${whiteKeyWidth()}%`,
                    ...(color
                      ? {
                          'background-color': color,
                          'border-color': isActive() ? color : undefined,
                          filter: isActive() ? 'brightness(1.1)' : 'brightness(1)',
                        }
                      : {}),
                  }}
                  onMouseDown={() => handleNoteStart(note)}
                  onMouseUp={() => handleNoteEnd(note)}
                  onMouseLeave={() => handleNoteEnd(note)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleNoteStart(note);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleNoteEnd(note);
                  }}
                >
                  {isPlaybackHighlight() && (
                    <div class="pointer-events-none absolute inset-x-0 bottom-[10px] flex justify-center z-30">
                      <div
                        class="w-8 h-8 rounded-full animate-pulse aspect-square"
                        style={{
                          'background-color': contrastColor(),
                          'box-shadow': `0 0 15px ${contrastColor()}`,
                          opacity: 0.8,
                        }}
                      />
                    </div>
                  )}
                  {settings.showNotes && (
                    <span
                      class={`text-[10px] sm:text-xs font-bold mb-1 truncate w-full text-center relative z-40 ${color ? 'drop-shadow-md' : 'text-gray-400'}`}
                      style={color ? { color: contrastColor() } : {}}
                    >
                      {note}
                    </span>
                  )}
                  {showShortcuts() && (
                    <span
                      class={`text-[9px] sm:text-[10px] font-bold border px-1 rounded ${color ? 'border-white/50' : 'text-corvu-400 border-corvu-200'}`}
                      style={
                        color
                          ? { color: contrastColor(), 'border-color': contrastColor() }
                          : {}
                      }
                    >
                      {getKeyLabel(note)}
                    </span>
                  )}
                </div>
              );
            }}
          </For>

          {/* Black Keys */}
          <For each={keys().blackKeys}>
            {(item) => {
              // Adjust width based on octave count
              // 1 Octave: 7 keys. 4.5% is too thick (since keys are huge).
              // 2 Octaves: 14 keys. 4.5% is fine.
              // Original logic: roughly whiteKeyWidth() * 0.7;
              // If 1 octave: white ~ 12.5%. Black ~ 8.75%.
              // If 2 octaves: white ~ 6.25%. Black ~ 4.375%.

              // Let's make 1 octave keys slightly narrower relative to white keys for better aesthetics
              const ratio = settings.octaveCount === 1 ? 0.6 : 0.7;
              const finalWidth = whiteKeyWidth() * ratio;

              const left = `calc(${item.pos * whiteKeyWidth()}% - ${finalWidth / 2}%)`;

              const color = settings.showKeyColors
                ? getNoteColor(item.note, settings.noteColors)
                : undefined;
              const isActive = () => activeKeys().has(item.note);
              const isPlaybackHighlight = () => playbackNote() === item.note;
              const contrastColor = () =>
                settings.showKeyColors
                  ? getNoteContrastColor(item.note, settings.contrastColors)
                  : '#3b82f6';

              return (
                <div
                  class={`absolute top-0 h-[60%] bg-black border-x border-b border-gray-800 rounded-b-md z-20 cursor-pointer transition-transform origin-top flex flex-col justify-end items-center pb-2 ${
                    isActive() ? 'bg-gray-800 scale-y-[0.98]' : 'shadow-lg'
                  }`}
                  style={{
                    left: left,
                    width: `${finalWidth}%`,
                    ...(color
                      ? {
                          'background-color': color,
                          'border-color': 'rgba(0,0,0,0.3)', // keep slight border
                          filter: isActive() ? 'brightness(1.2)' : 'brightness(0.9)', // Darker than white keys by default if colored
                        }
                      : {}),
                  }}
                  onMouseDown={() => handleNoteStart(item.note)}
                  onMouseUp={() => handleNoteEnd(item.note)}
                  onMouseLeave={() => handleNoteEnd(item.note)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleNoteStart(item.note);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleNoteEnd(item.note);
                  }}
                >
                  {isPlaybackHighlight() && (
                    <div class="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center z-30">
                      <div
                        class="w-9 h-9 rounded-full animate-pulse aspect-square"
                        style={{
                          'background-color': contrastColor(),
                          'box-shadow': `0 0 10px ${contrastColor()}`,
                          opacity: 0.8,
                        }}
                      />
                    </div>
                  )}
                  {settings.showNotes && (
                    <span
                      class={`text-[8px] sm:text-[9px] font-bold mb-0.5 truncate w-full text-center relative z-40 ${color ? 'drop-shadow-sm' : 'text-gray-300'}`}
                      style={color ? { color: contrastColor() } : {}}
                    >
                      {item.note}
                    </span>
                  )}
                  {showShortcuts() && (
                    <span
                      class={`text-[8px] font-bold border px-0.5 rounded ${color ? 'border-white/50 bg-black/20' : 'text-corvu-300 border-gray-600 bg-gray-900/80'}`}
                      style={
                        color
                          ? { color: contrastColor(), 'border-color': contrastColor() }
                          : {}
                      }
                    >
                      {getKeyLabel(item.note)}
                    </span>
                  )}
                </div>
              );
            }}
          </For>
        </div>

        {/* Octave Controls */}
        <Show when={shouldShowOctaveControls()}>
          <div class="shrink-0 flex items-center justify-center gap-2">
            <button
              class="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
              onClick={() => setSettings('baseOctave', Math.max(settings.baseOctave - 1, 1))}
              disabled={settings.baseOctave <= 1}
            >
              ◀
            </button>
            <span class="font-mono font-bold text-xs text-gray-500 text-center uppercase tracking-wider min-w-[3rem]">
              Oct {settings.baseOctave}
            </span>
            <button
              class="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
              onClick={() => setSettings('baseOctave', Math.min(settings.baseOctave + 1, 7))}
              disabled={settings.baseOctave >= 7}
            >
              ▶
            </button>
            <button
              class="ml-3 text-gray-500 hover:text-white transition-colors text-sm"
              aria-label="Hide octave controls"
              title="Hide octave controls"
              onClick={() => setSettings('showOctaveControls', false)}
            >
              ×
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
};

export default Piano;
