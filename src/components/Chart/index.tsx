import { Show } from 'solid-js';

import { settings } from '@lib/store';

import BarChart from './BarChart';
import SheetChart from './SheetChart';

export interface NoteEvent {
  note: string;
  duration: number; // relative duration, e.g., 1 = quarter note
}

export interface Melody {
  notes: NoteEvent[];
  ratio: [number, number];
}

// Twinkle Twinkle Little Star
export const DEMO_MELODY: Melody = {
  ratio: [4, 4],
  notes: [
    { note: 'C4', duration: 1 },
    { note: 'C4', duration: 1 },
    { note: 'G4', duration: 1 },
    { note: 'G4', duration: 1 },
    { note: 'A4', duration: 1 },
    { note: 'A4', duration: 1 },
    { note: 'G4', duration: 2 },

    { note: 'F4', duration: 1 },
    { note: 'F4', duration: 1 },
    { note: 'E4', duration: 1 },
    { note: 'E4', duration: 1 },
    { note: 'D4', duration: 1 },
    { note: 'D4', duration: 1 },
    { note: 'C4', duration: 2 },
  ],
};

const ChartDisplay = () => {
  return (
    <div class="w-full h-full flex-1 bg-white/50 backdrop-blur-sm rounded-lg shadow-sm border border-white/20 overflow-hidden flex flex-col">
      {/* We use transform-based panning in the charts; avoid native horizontal scrolling */}
      <div class="w-full flex-1 min-h-0 overflow-x-hidden flex">
        <Show when={settings.chartType === 'bar'}>
          <BarChart melody={DEMO_MELODY} />
        </Show>

        <Show when={settings.chartType === 'sheet'}>
          <SheetChart melody={DEMO_MELODY} />
        </Show>
      </div>
    </div>
  );
};

export default ChartDisplay;
