import type { Component } from 'solid-js';
import Piano from './components/Piano';
import SettingsDrawer from './components/SettingsDrawer';

const App: Component = () => {
  return (
    <div class="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-corvu-bg">
      <h1 class="text-4xl font-bold mb-8 text-corvu-text">Solid Piano</h1>
      
      <Piano />
      <SettingsDrawer />

      <div class="mt-8 text-center text-sm text-gray-500">
        <p>Press the keys on your keyboard or click/touch to play.</p>
      </div>
    </div>
  );
};

export default App;


