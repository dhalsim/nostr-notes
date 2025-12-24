import { Component, createSignal, For, onCleanup, onMount } from 'solid-js';
import { playNote, stopNote } from '../audio/audioEngine';
import { settings } from '../store';

const WHITE_KEYS = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
const BLACK_KEYS = [
    { note: 'C#4', pos: 1 }, { note: 'D#4', pos: 2 },
    { note: 'F#4', pos: 4 }, { note: 'G#4', pos: 5 }, { note: 'A#4', pos: 6 }
];

const KEY_MAP: Record<string, string> = {
    'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4',
    'f': 'F4', 't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4',
    'u': 'A#4', 'j': 'B4', 'k': 'C5'
};

// Inverse map to find shortcut for a note
const NOTE_TO_KEY: Record<string, string> = Object.entries(KEY_MAP).reduce((acc, [key, note]) => {
    acc[note] = key.toUpperCase();
    return acc;
}, {} as Record<string, string>);

const Piano: Component = () => {
  const [activeKeys, setActiveKeys] = createSignal<Set<string>>(new Set());

  const handleNoteStart = (note: string) => {
    playNote(note);
    setActiveKeys(prev => new Set(prev).add(note));
  };

  const handleNoteEnd = (note: string) => {
    stopNote(note);
    setActiveKeys(prev => {
        const next = new Set(prev);
        next.delete(note);
        return next;
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const note = KEY_MAP[e.key.toLowerCase()];
    if (note) handleNoteStart(note);
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    const note = KEY_MAP[e.key.toLowerCase()];
    if (note) handleNoteEnd(note);
  };

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  });

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  });

  return (
    <div class="relative w-full max-w-4xl h-64 sm:h-80 select-none bg-gray-900 p-4 rounded-xl shadow-2xl">
      <div class="relative w-full h-full flex">
        {/* White Keys */}
        <For each={WHITE_KEYS}>
          {(note) => (
            <div
              class={`relative flex-1 bg-white border border-gray-300 rounded-b-lg mx-[1px] first:ml-0 last:mr-0 z-10 active:bg-gray-200 transition-all origin-top cursor-pointer flex flex-col justify-end items-center pb-4 ${
                activeKeys().has(note) ? '!bg-gray-200 shadow-inner scale-y-[0.99] border-b-0' : 'shadow-md border-b-4'
              }`}
              onMouseDown={() => handleNoteStart(note)}
              onMouseUp={() => handleNoteEnd(note)}
              onMouseLeave={() => handleNoteEnd(note)}
              onTouchStart={(e) => { e.preventDefault(); handleNoteStart(note); }}
              onTouchEnd={(e) => { e.preventDefault(); handleNoteEnd(note); }}
            >
                {settings.showNotes && (
                  <span class="text-xs font-bold text-gray-400 mb-1">{note}</span>
                )}
                {settings.showShortcuts && (
                  <span class="text-[10px] font-bold text-corvu-400 border border-corvu-200 px-1 rounded">
                    {NOTE_TO_KEY[note]}
                  </span>
                )}
            </div>
          )}
        </For>

        {/* Black Keys */}
        <For each={BLACK_KEYS}>
          {(item) => {
             // Increased width to 4.5% (approx 1.5x original)
             // Adjusted offset to half of width (2.25%)
             const left = `calc(${item.pos * (100/8)}% - 2.25%)`;

             return (
              <div
                class={`absolute top-0 w-[4.5%] h-[60%] bg-black border-x border-b border-gray-800 rounded-b-md z-20 cursor-pointer transition-transform origin-top flex flex-col justify-end items-center pb-2 ${
                     activeKeys().has(item.note) ? 'bg-gray-800 scale-y-[0.98]' : 'shadow-lg'
                }`}
                style={{ left: left }}
                onMouseDown={() => handleNoteStart(item.note)}
                onMouseUp={() => handleNoteEnd(item.note)}
                onMouseLeave={() => handleNoteEnd(item.note)}
                onTouchStart={(e) => { e.preventDefault(); handleNoteStart(item.note); }}
                onTouchEnd={(e) => { e.preventDefault(); handleNoteEnd(item.note); }}
              >
                 {settings.showNotes && (
                   <span class="text-[10px] font-bold text-gray-300 mb-0.5">{item.note}</span>
                 )}
                 {settings.showShortcuts && (
                   <span class="text-[9px] font-bold text-corvu-300 border border-gray-600 px-0.5 rounded bg-gray-900/80">
                     {NOTE_TO_KEY[item.note]}
                   </span>
                 )}
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export default Piano;
