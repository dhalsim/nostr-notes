import { Component, createEffect, createSignal, For, onCleanup, onMount } from 'solid-js';
import { playNote, stopNote } from '../audio/audioEngine';
import { settings, setSettings } from '../store';

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
        { name: 'A#', pos: 6 }
        // No B#
    ];

    for (let o = 0; o < count; o++) {
        const octave = startOctave + o;
        
        // Add White Keys
        notes.forEach(n => {
            whiteKeys.push(`${n}${octave}`);
        });

        // Add Black Keys
        sharps.forEach(s => {
            // Pos is relative to the start of the octave (0-6 scale roughly)
            // Global position calculation: 
            // One octave has 7 white keys.
            // Pos 1 (C#) is between 1st (0) and 2nd (1) white key of the octave.
            // Global offset = (octave_index * 7) + pos
            blackKeys.push({
                note: `${s.name}${octave}`,
                pos: (o * 7) + s.pos
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
    black: ['2', '3', '5', '6', '7']
};

// OCTAVE 2 (RIGHT)
// White: V B N M , . /
// Black: G H K L ;
const OCTAVE_2_MAPPING = {
    white: ['v', 'b', 'n', 'm', ',', '.', '/'],
    black: ['g', 'h', 'k', 'l', ';']
};

const Piano: Component = () => {
  const [activeKeys, setActiveKeys] = createSignal<Set<string>>(new Set());
  const [desktopCapable, setDesktopCapable] = createSignal(false);
  
  // Computed Keys based on settings
  const keys = () => generateKeys(settings.baseOctave, settings.octaveCount);
  
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
      return Object.keys(map).find(k => map[k] === note)?.toUpperCase() || '';
  };

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
    if (note) handleNoteStart(note);
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    const note = currentMap()[e.key.toLowerCase()];
    if (note) handleNoteEnd(note);
  };

  onMount(() => {
    // Detect whether the device supports a "fine" pointer (i.e., mouse or trackpad, typical of desktops/laptops)
    const mql = window.matchMedia?.('(pointer: fine)');
    
    if (mql) {
      const update = () => setDesktopCapable(mql.matches);
      update();
      // Safari < 14 uses addListener/removeListener.
      if (mql.addEventListener) mql.addEventListener('change', update);
      else mql.addListener(update);
      onCleanup(() => {
        if (mql.removeEventListener) mql.removeEventListener('change', update);
        else mql.removeListener(update);
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

  return (
    <div class="flex flex-col items-center gap-4 w-full max-w-full relative">
        <div class="relative w-full h-[55vh] sm:h-[60vh] max-h-[420px] min-h-[220px] select-none bg-gray-900 pt-3 sm:pt-4 pb-10 sm:pb-12 px-2 sm:px-4 rounded-xl shadow-2xl overflow-hidden z-10">
          {/* Octave Controls - Bottom Centered */}
          <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50">
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
          </div>

          <div class="relative w-full h-full flex">
            {/* White Keys */}
            <For each={keys().whiteKeys}>
              {(note, i) => (
                <div
                  class={`relative bg-white border border-gray-300 rounded-b-lg mx-[1px] first:ml-0 last:mr-0 z-10 active:bg-gray-200 transition-all origin-top cursor-pointer flex flex-col justify-end items-center pb-4 ${
                    activeKeys().has(note) ? '!bg-gray-200 shadow-inner scale-y-[0.99] border-b-0' : 'shadow-md border-b-4'
                  }`}
                  style={{ width: `${whiteKeyWidth()}%` }}
                  onMouseDown={() => handleNoteStart(note)}
                  onMouseUp={() => handleNoteEnd(note)}
                  onMouseLeave={() => handleNoteEnd(note)}
                  onTouchStart={(e) => { e.preventDefault(); handleNoteStart(note); }}
                  onTouchEnd={(e) => { e.preventDefault(); handleNoteEnd(note); }}
                >
                    {settings.showNotes && (
                      <span class="text-[10px] sm:text-xs font-bold text-gray-400 mb-1 truncate w-full text-center">{note}</span>
                    )}
                    {showShortcuts() && (
                      <span class="text-[9px] sm:text-[10px] font-bold text-corvu-400 border border-corvu-200 px-1 rounded">
                        {getKeyLabel(note)}
                      </span>
                    )}
                </div>
              )}
            </For>
    
            {/* Black Keys */}
            <For each={keys().blackKeys}>
              {(item) => {
                 // Adjust width based on octave count
                 // 1 Octave: 7 keys. 4.5% is too thick (since keys are huge).
                 // 2 Octaves: 14 keys. 4.5% is fine.
                 const baseWidth = settings.octaveCount === 1 ? 6 : 4.5;
                 const widthPct = whiteKeyWidth() * (baseWidth / 10); // Scale relative to white key width?
                 // Or just fixed % of total width?
                 // Original logic: widthPct = whiteKeyWidth() * 0.7;
                 // If 1 octave: white ~ 12.5%. Black ~ 8.75%.
                 // If 2 octaves: white ~ 6.25%. Black ~ 4.375%.
                 
                 // Let's make 1 octave keys slightly narrower relative to white keys for better aesthetics
                 const ratio = settings.octaveCount === 1 ? 0.6 : 0.7;
                 const finalWidth = whiteKeyWidth() * ratio;
                 
                 const left = `calc(${item.pos * whiteKeyWidth()}% - ${finalWidth/2}%)`;
    
                 return (
                  <div
                    class={`absolute top-0 h-[60%] bg-black border-x border-b border-gray-800 rounded-b-md z-20 cursor-pointer transition-transform origin-top flex flex-col justify-end items-center pb-2 ${
                         activeKeys().has(item.note) ? 'bg-gray-800 scale-y-[0.98]' : 'shadow-lg'
                    }`}
                    style={{ left: left, width: `${finalWidth}%` }}
                    onMouseDown={() => handleNoteStart(item.note)}
                    onMouseUp={() => handleNoteEnd(item.note)}
                    onMouseLeave={() => handleNoteEnd(item.note)}
                    onTouchStart={(e) => { e.preventDefault(); handleNoteStart(item.note); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleNoteEnd(item.note); }}
                  >
                     {settings.showNotes && (
                       <span class="text-[8px] sm:text-[9px] font-bold text-gray-300 mb-0.5 truncate w-full text-center">{item.note}</span>
                     )}
                     {showShortcuts() && (
                       <span class="text-[8px] font-bold text-corvu-300 border border-gray-600 px-0.5 rounded bg-gray-900/80">
                         {getKeyLabel(item.note)}
                       </span>
                     )}
                  </div>
                );
              }}
            </For>
          </div>
        </div>
    </div>
  );
};

export default Piano;
