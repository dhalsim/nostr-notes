import { For } from 'solid-js';

import { settings } from '../store';
import { getNoteColor, getSolfege } from '../utils/musicUtils';

import type { NoteEvent } from './Chart';

interface BarChartProps {
  melody: NoteEvent[];
}

const BarChart = (props: BarChartProps) => {
  const BAR_WIDTH_UNIT = 60; // px per duration unit

  return (
    <div class="flex items-end h-[120px] gap-1 px-4 min-w-max">
      <For each={props.melody}>
        {(item) => {
          const color = getNoteColor(item.note, settings.noteColors);
          // Height based on pitch relative to C4
          // Basic heuristic: 10px + (step * 5px)
          const noteName = item.note.replace(/\d+/, '').replace('#', '');
          const octave = parseInt(item.note.match(/\d+/)?.[0] || '4');
          const scale = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
          const idx = scale.indexOf(noteName);
          const globalStep = (octave - 4) * 7 + idx;
          const height = 40 + globalStep * 8;

          return (
            <div class="flex flex-col items-center gap-1">
              <div
                class="rounded-t-md shadow-sm flex items-end justify-center pb-2 text-white font-bold text-xs transition-all hover:opacity-80"
                style={{
                  width: `${item.duration * BAR_WIDTH_UNIT}px`,
                  height: `${height}px`,
                  'background-color': color,
                }}
              >
                <span class="drop-shadow-md">{getSolfege(item.note)}</span>
              </div>
              <span class="text-[10px] text-gray-500 font-mono">{item.note}</span>
            </div>
          );
        }}
      </For>
    </div>
  );
};

export default BarChart;
