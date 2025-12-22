import { Platform } from 'react-native';

// We need to conditionally require strudel because it might rely on browser APIs (like window)
// that cause issues during native bundling or SSR if not careful.

let strudelWeb: any;
let strudelCore: any;

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    strudelWeb = require('@strudel/web');
    strudelCore = require('@strudel/core');
  } catch (e) {
    console.warn('Strudel dependencies not found or failed to load:', e);
  }
}

let isInitialized = false;

export async function initializeAudio() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    console.warn('Strudel is only supported on Web Client currently.');
    return;
  }
  
  if (isInitialized) return;
  
  try {
    if (strudelWeb && strudelWeb.initStrudel) {
      await strudelWeb.initStrudel({
        prebake: false, // Don't prebake patterns
      });
      isInitialized = true;
      console.log('Strudel initialized');
      
      // Try to resume context if suspended (browser autoplay policy)
      const ctx = strudelWeb.getAudioContext ? strudelWeb.getAudioContext() : null;
      if (ctx && ctx.state === 'suspended') {
          await ctx.resume();
          console.log('AudioContext resumed');
      }
    }
  } catch (error) {
    console.error('Failed to initialize Strudel:', error);
  }
}

export function playNote(n: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  
  console.log(`playNote called with: ${n}`);

  if (!isInitialized) {
      console.log('Initializing audio on first note...');
      initializeAudio().then(() => {
          triggerNote(n);
      });
      return;
  }
  triggerNote(n);
}

function triggerNote(n: string) {
    try {
        if (strudelCore && strudelCore.note) {
             // For one-shot triggering in Strudel/Tidal context,
             // normally patterns cycle.
             // We can try to use `.once()` if available, or just `.play()` and hope it doesn't loop forever.
             // But `.play()` usually sets the global pattern.
             
             // If we want to ADD a note to what's playing, it's tricky with just `note(n).play()`.
             // However, for a simple "piano", we might want to schedule an event directly.
             
             // A common trick in Strudel for "just play this now" is not fully documented as a primary use case,
             // as it's a live coding looper.
             
             // Let's try to construct a pattern that happens *once*.
             // `note(n).s("piano").once()` is often the syntax in similar libraries.
             // If `.once` is not a function, we will see an error.
             
             console.log(`Triggering Strudel note pattern: ${n}`);
             
             // Attempt 1: Standard play (might loop) - but let's see if we hear anything first.
             // Also need to make sure we use a valid sound. "piano" or "gm_piano" or "triangle".
             // "piano" might not be loaded by default. "triangle" is a synth.
             // Let's try a simple synth sound first to rule out sample loading issues.
             const pattern = strudelCore.note(n).s("triangle").decay(0.5);
             
             // Check if we can schedule it just once.
             // There is `sched` or `schedule` maybe?
             // Let's try `.play()` and logging.
             
             // If we want to fire and forget, maybe we can use `strudelWeb.evaluate` or similar?
             // But let's try the pattern API.
             
             // IMPORTANT: `play()` usually *replaces* the currently running pattern.
             // If we want to play on top, we might need to handle it differently.
             // But for testing if sound works at all:
             
             pattern.play(); 
             
             // If it loops, we will hear it repeating.
        }
    } catch (e) {
        console.error('Error playing note:', e);
    }
}

export function stopAllSounds() {
     if (Platform.OS !== 'web') return;
     try {
         if (strudelCore && strudelCore.hush) {
             strudelCore.hush();
         }
     } catch (e) {
         console.error(e);
     }
}
