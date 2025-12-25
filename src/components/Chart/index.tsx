import { Show } from 'solid-js';

import { settings } from '@lib/store';

import BarChart from './BarChart';
import SheetChart from './SheetChart';

export interface NoteEvent {
  note: string;
  duration: number; // relative duration, e.g., 1 = quarter note
}

// Twinkle Twinkle Little Star
export const DEMO_MELODY: NoteEvent[] = [
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
];

const ChartDisplay = () => {
  return (
    <div class="w-full h-full flex-1 bg-white/50 backdrop-blur-sm rounded-lg p-2 shadow-sm border border-white/20 overflow-hidden flex flex-col">
      <div class="w-full flex-1 min-h-0 overflow-x-auto flex">
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
