// Piano Layout
const WHITE_KEYS = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
const BLACK_KEYS = [
    { note: 'C#4', pos: 1 }, { note: 'D#4', pos: 2 },
    { note: 'F#4', pos: 4 }, { note: 'G#4', pos: 5 }, { note: 'A#4', pos: 6 }
];

// QWERTY Keyboard Map
const KEY_MAP = {
    'a': 'C4',
    'w': 'C#4',
    's': 'D4',
    'e': 'D#4',
    'd': 'E4',
    'f': 'F4',
    't': 'F#4',
    'g': 'G4',
    'y': 'G#4',
    'h': 'A4',
    'u': 'A#4',
    'j': 'B4',
    'k': 'C5'
};

const pianoContainer = document.getElementById('piano-container');
const whiteKeyWidthPct = 100 / 8;

// Audio Context
let audioCtx = null;
const activeNotes = {}; // Stores { osc, gain, ctx }

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

// Initialize Audio on first interaction
function initAudio() {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
            console.log('Audio Context Resumed');
        });
    }
}

// Remove loading screen immediately since we don't wait for external scripts anymore
document.getElementById('loading').style.display = 'none';

// Global listeners for Keyboard interaction
window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const note = KEY_MAP[e.key.toLowerCase()];
    if (note) {
        initAudio(); // Ensure audio is ready
        playKey(note);
    }
});

window.addEventListener('keyup', (e) => {
    const note = KEY_MAP[e.key.toLowerCase()];
    if (note) stopKey(note);
});

// Helper: Note to Frequency
function getFreq(note) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = parseInt(note.slice(-1));
    const name = note.slice(0, -1);
    const idx = notes.indexOf(name);
    const midi = (octave + 1) * 12 + idx;
    return 440 * Math.pow(2, (midi - 69) / 12);
}

// Generate UI
WHITE_KEYS.forEach((note, i) => {
    const key = document.createElement('div');
    key.className = 'white-key';
    key.style.left = (i * whiteKeyWidthPct) + '%';
    key.style.width = whiteKeyWidthPct + '%';
    key.dataset.note = note;
    setupKey(key, note);
    pianoContainer.appendChild(key);
});

BLACK_KEYS.forEach((k) => {
    const key = document.createElement('div');
    key.className = 'black-key';
    const center = k.pos * whiteKeyWidthPct;
    key.style.left = `calc(${center}% - 1.5% )`; 
    key.style.width = '3%';
    key.dataset.note = k.note;
    setupKey(key, k.note);
    pianoContainer.appendChild(key);
});

function setupKey(element, noteVal) {
    // Mouse/Touch events
    const start = (e) => { 
        // Prevent default only for touch to prevent scrolling, 
        // but be careful with mouse (though usually fine)
        if(e.type === 'touchstart') e.preventDefault(); 
        initAudio(); 
        playKey(noteVal); 
    };
    const end = (e) => { 
        if(e.type === 'touchend') e.preventDefault();
        stopKey(noteVal); 
    };

    element.addEventListener('mousedown', start);
    element.addEventListener('touchstart', start);
    element.addEventListener('mouseup', end);
    element.addEventListener('touchend', end);
    element.addEventListener('mouseleave', end);
}

function playKey(n) {
    if (activeNotes[n]) return;

    const ctx = getAudioContext();
    
    // Visual feedback
    const el = document.querySelector(`[data-note="${n}"]`);
    if (el) el.classList.add('active');

    // Oscillator & Gain
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.value = getFreq(n);

    const now = ctx.currentTime;
    
    // ADSR Envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.3, now + 0.11); // Decay to Sustain

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start(now);
    
    activeNotes[n] = { osc, gainNode };
}

function stopKey(n) {
    const el = document.querySelector(`[data-note="${n}"]`);
    if (el) el.classList.remove('active');
    
    const voice = activeNotes[n];
    if (voice) {
        const { osc, gainNode } = voice;
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        
        // Release
        try {
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.stop(now + 0.5);
        } catch(e) {
            console.error(e);
        }

        delete activeNotes[n];
    }
}
