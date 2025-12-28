import Dialog from '@corvu/dialog';
import { Show, createSignal, onCleanup, onMount, type Component } from 'solid-js';

import { toggle } from '@lib/audio/playbackRouter';

import ChartDisplay, { DEMO_MELODY } from './components/Chart';
import Piano from './components/Piano';
import SettingsDrawer from './components/SettingsDrawer';
import { setSettings, settings } from './store';

const App: Component = () => {
  const [showRotateHint, setShowRotateHint] = createSignal(false);

  onMount(() => {
    // Keyboard shortcut: Space to toggle playback
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prefer e.code for space; e.key is usually ' ' (space character), not 'Space'
      if ((e.code === 'Space' || e.key === ' ') && !e.repeat) {
        // Don't trigger if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
        // Space key should use normal playback mode
        if (settings.playbackMode !== 'normal') {
          setSettings('playbackMode', 'normal');
        }
        toggle(DEMO_MELODY);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown));

    // Only show on touch-ish devices; desktop users rotating a window shouldn't see this.
    const orientationMql = window.matchMedia?.('(orientation: portrait)');
    const coarseMql = window.matchMedia?.('(pointer: coarse)');
    if (!orientationMql || !coarseMql) {
      return;
    }

    const update = () => {
      setShowRotateHint(orientationMql.matches && coarseMql.matches);
    };
    update();

    // Safari < 14 uses addListener/removeListener.
    const add = (mql: MediaQueryList, fn: () => void) => {
      if (mql.addEventListener) {
        mql.addEventListener('change', fn);
      } else {
        mql.addListener(fn);
      }
    };
    const remove = (mql: MediaQueryList, fn: () => void) => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', fn);
      } else {
        mql.removeListener(fn);
      }
    };

    add(orientationMql, update);
    add(coarseMql, update);
    onCleanup(() => {
      remove(orientationMql, update);
      remove(coarseMql, update);
    });
  });

  return (
    <div class="min-h-[100dvh] max-h-[100dvh] w-full max-w-full flex flex-col items-center justify-start gap-3 px-3 sm:px-4 py-3 sm:py-4 bg-corvu-bg overflow-hidden">
      <Show when={showRotateHint()}>
        <div class="pointer-events-none fixed top-3 left-1/2 -translate-x-1/2 z-[60] rounded-full bg-gray-900/90 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          Rotate your phone for the best experience
        </div>
      </Show>

      {/* Main content should flex to available height; chart and piano split 50-50 */}
      <div class="w-full flex-1 min-h-0 flex flex-col items-center gap-3">
        <div class="w-full flex-1 min-h-0 flex flex-col">
          <ChartDisplay />
        </div>
        <div class="w-full flex-1 min-h-0 flex flex-col">
          <Piano />
        </div>
      </div>
      <InstructionsDialog
        open={settings.showInstructions}
        onOpenChange={(open) => {
          if (!open) {
            setSettings('showInstructions', false);
          }
        }}
      />
      <SettingsDrawer />
    </div>
  );
};

export default App;

interface InstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InstructionsDialog = (props: InstructionsDialogProps) => {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {() => (
        <>
          <Dialog.Portal>
            <Dialog.Overlay class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
            <Dialog.Content class="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div class="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-2xl border border-gray-200">
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-semibold text-gray-800">How to Play</h2>
                  <button
                    class="text-gray-500 hover:text-gray-800 transition-colors"
                    onClick={() => props.onOpenChange(false)}
                    aria-label="Close instructions"
                  >
                    ×
                  </button>
                </div>
                <p class="mt-4 text-sm text-gray-600">
                  Press the keys on your keyboard or click/touch the piano to play. Press the Space
                  key to play or pause the demo song.
                </p>
                <p class="mt-3 text-xs text-gray-400 font-mono">
                  v{__APP_VERSION__} ({__GIT_SHA__})
                </p>
                <button
                  class="mt-6 w-full rounded-lg bg-gray-900/90 text-white py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
                  onClick={() => props.onOpenChange(false)}
                >
                  Got it
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </>
      )}
    </Dialog>
  );
};
