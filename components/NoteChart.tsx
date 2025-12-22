import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PIXELS_PER_MS = 0.2; // Speed of sliding
const NOTE_HEIGHT = 20;

export interface NoteData {
  id: string;
  note: string;
  timestamp: number; // relative to start
  duration?: number;
}

interface NoteChartProps {
  // We can pass notes via props, or use imperative handle to add them to avoid parent re-renders
  // For React best practices, props are better, but for "game-like" performance, sometimes avoiding prop thrashing is good.
  // Let's stick to props for the list, but optimize rendering.
  notes: NoteData[];
  isPlaying: boolean;
  startTime: number; // Timestamp when the "recording/session" started
}

// Map note names to vertical positions (simple mapping)
const getNoteVerticalPosition = (note: string) => {
  // Simple hash or mapping for skeleton
  // C4, D4...
  // We can just parse the octave and note index.
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = parseInt(note.slice(-1), 10);
  const noteName = note.slice(0, -1);
  const noteIndex = notes.indexOf(noteName);
  
  if (isNaN(octave) || noteIndex === -1) return 0;
  
  // Base C4 is middle.
  // C4 -> index 0 + 4*12 = 48
  const absIndex = noteIndex + octave * 12;
  // Let's center around C4 (48)
  const relativeIndex = absIndex - 48; // C4 = 0
  
  // Invert Y so higher notes are higher up (visually, lower Y value in RN?)
  // Usually in UI, 0 is top. So higher notes should be smaller Y.
  return 100 - (relativeIndex * 10); // Center at 100px
};

export const NoteChart = ({ notes, isPlaying, startTime }: NoteChartProps) => {
  const currentTime = useSharedValue(0);

  // Animation loop
  useFrameCallback((frameInfo) => {
    if (!isPlaying) return;
    // We can just use Date.now() diff to be accurate with wall clock
    // Or accumulate frameInfo.timeSincePreviousFrame
    // Using wall clock is safer for synchronization
    const now = Date.now();
    const elapsed = now - startTime;
    currentTime.value = elapsed;
  });

  const animatedContainerStyle = useAnimatedStyle(() => {
    // The container moves left as time passes
    // At time T, we want pixel X = T * SPEED to be at the "playhead" (e.g. left of screen or center)
    // Let's say playhead is at right edge of screen?
    // Or playhead is fixed at X=50, and notes slide from right to left?
    // "Sliding note chart while you play" usually means notes appear at right and slide left.
    // So current time T matches the Right Edge? Or the "Creation Line"?
    
    // Let's assume notes are added at `timestamp`.
    // We want a note at `timestamp` to appear at the "Now" line.
    // And then slide to the left (past).
    // So the "Now" line is fixed (e.g. at 80% width).
    // Position of note = (NoteTime - CurrentTime) * Speed + Offset
    // If NoteTime == CurrentTime, Position = Offset.
    // As CurrentTime increases, Position decreases (moves left).
    
    // Instead of animating every note, we animate the Container.
    // Container X = -CurrentTime * Speed.
    // Note X inside container = NoteTime * Speed.
    // Result render X = (NoteTime * Speed) - (CurrentTime * Speed) + Offset
    
    return {
      transform: [
        { translateX: -currentTime.value * PIXELS_PER_MS }
      ]
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.playhead} />
      
      <Animated.View style={[styles.scrollingContent, animatedContainerStyle]}>
        {notes.map((note) => {
          const top = getNoteVerticalPosition(note.note);
          const left = note.timestamp * PIXELS_PER_MS;
          
          return (
            <View 
              key={note.id} 
              style={[
                styles.note, 
                { 
                  top, 
                  left,
                  // If we have duration, width scales. Default to small.
                  width: note.duration ? note.duration * PIXELS_PER_MS : 20 
                }
              ]}
            >
             {/* Optional Label */}
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222',
    overflow: 'hidden', // Clip notes that slide off
    position: 'relative',
  },
  scrollingContent: {
    flex: 1,
    // The playhead offset. If we want the "Now" point to be at 200px from left:
    // We need to shift the whole container right by 200px.
    // Because at t=0, note at t=0 is at left=0.
    // transform translateX will be 0.
    // render X = 0 + 200 = 200. Matches playhead.
    marginLeft: 200, 
  },
  playhead: {
    position: 'absolute',
    left: 200,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'red',
    zIndex: 10,
  },
  note: {
    position: 'absolute',
    height: NOTE_HEIGHT,
    backgroundColor: '#00ff00',
    borderRadius: 4,
    opacity: 0.8,
  }
});

