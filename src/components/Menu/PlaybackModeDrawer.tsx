import { Show, type Component } from 'solid-js';

import { setSettings, settings, type PlaybackMode } from '@lib/store';
import CustomDrawer from './CustomDrawer';

interface PlaybackModeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PlaybackModeDrawer: Component<PlaybackModeDrawerProps> = (props) => {
  return (
    <CustomDrawer open={props.open} onOpenChange={props.onOpenChange} label="Playback Mode">
      {/* Playback Mode Section */}
      <div class="space-y-4">
        <div class="space-y-2">
          <h3 class="font-semibold text-corvu-text text-sm">Mode</h3>
          <div class="flex flex-col gap-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="playbackMode"
                value="normal"
                checked={settings.playbackMode === 'normal'}
                onChange={() => setSettings('playbackMode', 'normal' as PlaybackMode)}
                class="w-4 h-4 text-corvu-400 focus:ring-corvu-400"
              />
              <span class="text-sm text-corvu-text">Normal - Auto playback</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="playbackMode"
                value="waitForUser"
                checked={settings.playbackMode === 'waitForUser'}
                onChange={() =>
                  setSettings('playbackMode', 'waitForUser' as PlaybackMode)
                }
                class="w-4 h-4 text-corvu-400 focus:ring-corvu-400"
              />
              <span class="text-sm text-corvu-text">Practice - Wait for you</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="playbackMode"
                value="errorTracking"
                checked={settings.playbackMode === 'errorTracking'}
                onChange={() =>
                  setSettings('playbackMode', 'errorTracking' as PlaybackMode)
                }
                class="w-4 h-4 text-corvu-400 focus:ring-corvu-400"
              />
              <span class="text-sm text-corvu-text">
                Error Tracking - Play with tempo
              </span>
            </label>
          </div>
          <p class="text-xs text-gray-500">
            Normal: Auto playback. Practice: Wait for you to play each note. Error
            Tracking: Play at tempo and track errors.
          </p>
        </div>

        <Show when={settings.playbackMode === 'waitForUser'}>
          <div class="space-y-3 pt-2">
            <label class="flex items-center justify-between cursor-pointer">
              <span class="font-semibold text-corvu-text text-sm">
                Show Next Note Hint
              </span>
              <input
                type="checkbox"
                checked={settings.showNextNoteHint}
                onChange={(e) => setSettings('showNextNoteHint', e.currentTarget.checked)}
                class="w-5 h-5 rounded border-corvu-300 text-corvu-400 focus:ring-corvu-400"
              />
            </label>
            <p class="text-xs text-gray-500">
              Highlight the next note to play on the piano keyboard.
            </p>
          </div>
        </Show>
      </div>
    </CustomDrawer>
  );
};

export default PlaybackModeDrawer;
