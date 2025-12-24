import { Show, createSignal, onCleanup, onMount, type Component } from 'solid-js';
import Piano from './components/Piano';
import SettingsDrawer from './components/SettingsDrawer';

const App: Component = () => {
  const [showRotateHint, setShowRotateHint] = createSignal(false);

  onMount(() => {
    // Only show on touch-ish devices; desktop users rotating a window shouldn't see this.
    const orientationMql = window.matchMedia?.('(orientation: portrait)');
    const coarseMql = window.matchMedia?.('(pointer: coarse)');
    if (!orientationMql || !coarseMql) return;

    const update = () => {
      setShowRotateHint(orientationMql.matches && coarseMql.matches);
    };
    update();

    // Safari < 14 uses addListener/removeListener.
    const add = (mql: MediaQueryList, fn: () => void) => {
      if (mql.addEventListener) mql.addEventListener('change', fn);
      else mql.addListener(fn);
    };
    const remove = (mql: MediaQueryList, fn: () => void) => {
      if (mql.removeEventListener) mql.removeEventListener('change', fn);
      else mql.removeListener(fn);
    };

    add(orientationMql, update);
    add(coarseMql, update);
    onCleanup(() => {
      remove(orientationMql, update);
      remove(coarseMql, update);
    });
  });

  return (
    <div class="min-h-[100dvh] max-h-[100dvh] w-full max-w-full flex flex-col items-center justify-center gap-4 px-3 sm:px-4 py-3 sm:py-4 bg-corvu-bg overflow-hidden">
      <Show when={showRotateHint()}>
        <div class="pointer-events-none fixed top-3 left-1/2 -translate-x-1/2 z-[60] rounded-full bg-gray-900/90 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          Rotate your phone for the best experience
        </div>
      </Show>
      
      <Piano />
      <SettingsDrawer />

      <div class="text-center text-sm text-gray-500">
        <p>Press the keys on your keyboard or click/touch to play.</p>
        <p class="mt-1 text-[11px] text-gray-400 font-mono">
          v{__APP_VERSION__} ({__GIT_SHA__})
        </p>
      </div>
    </div>
  );
};

export default App;


