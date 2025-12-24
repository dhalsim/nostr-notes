import type { Component } from 'solid-js';
import Piano from './components/Piano';
import SettingsDrawer from './components/SettingsDrawer';

const App: Component = () => {
  return (
    <div class="min-h-[100dvh] max-h-[100dvh] w-full max-w-full flex flex-col items-center justify-center gap-4 px-3 sm:px-4 py-3 sm:py-4 bg-corvu-bg overflow-hidden">
      <h1 class="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6 text-corvu-text">Solid Piano</h1>
      
      <Piano />
      <SettingsDrawer />

      <div class="mt-4 sm:mt-6 text-center text-sm text-gray-500">
        <p>Press the keys on your keyboard or click/touch to play.</p>
      </div>
    </div>
  );
};

export default App;


