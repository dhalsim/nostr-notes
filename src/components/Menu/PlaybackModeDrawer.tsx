import Drawer from '@corvu/drawer';
import { Show, type Component } from 'solid-js';

import { setSettings, settings, type PlaybackMode } from '@lib/store';

interface PlaybackModeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PlaybackModeDrawer: Component<PlaybackModeDrawerProps> = (props) => {
  return (
    <Drawer breakPoints={[0.75]} open={props.open} onOpenChange={props.onOpenChange}>
      {(drawerProps) => (
        <>
          <Drawer.Portal>
            <Drawer.Overlay
              class="fixed inset-0 z-50 bg-black/50 transition-opacity duration-500"
              style={{
                'background-color': `rgb(0 0 0 / ${0.5 * drawerProps.openPercentage})`,
              }}
            />
            <Drawer.Content class="fixed inset-x-0 bottom-0 z-50 flex h-full max-h-[600px] flex-col rounded-t-2xl border-t-4 border-corvu-400 bg-corvu-100 pt-3 transition-transform duration-500 after:absolute after:inset-x-0 after:top-full after:h-1/2 after:bg-inherit md:select-none">
              <div class="h-1 w-12 self-center rounded-full bg-corvu-400/50 mb-6" />

              <div class="px-6 space-y-8 overflow-y-auto pb-8">
                <Drawer.Label class="text-2xl font-bold text-center text-corvu-text">
                  Playback Mode
                </Drawer.Label>

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
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </>
      )}
    </Drawer>
  );
};

export default PlaybackModeDrawer;
