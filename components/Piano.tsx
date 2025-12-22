import { playNote } from '@/utils/strudel';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const WHITE_KEYS = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
const BLACK_KEYS = [
  { note: 'C#4', position: 1 }, // After 1st white key (C4)
  { note: 'D#4', position: 2 }, // After 2nd white key (D4)
  { note: 'F#4', position: 4 }, // After 4th white key (F4)
  { note: 'G#4', position: 5 }, // After 5th white key (G4)
  { note: 'A#4', position: 6 }, // After 6th white key (A4)
];

interface PianoProps {
  onPlayNote?: (note: string) => void;
}

export const Piano: React.FC<PianoProps> = ({ onPlayNote }) => {
  const handlePress = (note: string) => {
    console.log(`Piano key pressed: ${note}`); // Added logging
    playNote(note);
    if (onPlayNote) {
      onPlayNote(note);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.whiteKeysContainer}>
        {WHITE_KEYS.map((note) => (
          <Pressable
            key={note}
            style={({ pressed }) => [
              styles.whiteKey,
              pressed && styles.keyPressed
            ]}
            onPress={() => handlePress(note)}
          >
            <View style={styles.keyLabelContainer}>
              <Text style={styles.keyLabel}>{note}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      
      {/* Black keys overlaid */}
      <View style={styles.blackKeysOverlay} pointerEvents="box-none">
        {BLACK_KEYS.map(({ note, position }) => {
            // Calculate approximate position. 
            // 8 white keys. width = 100% / 8 = 12.5%
            // Black key center should be at position * 12.5%
            // But usually between keys.
            // C# is between C and D. C is index 0. D is index 1.
            // So C# is at 1 * 12.5% boundary.
            const leftPct = position * 12.5;
            
            return (
              <View 
                key={note} 
                style={[
                    styles.blackKeyWrapper, 
                    { left: `${leftPct}%`, marginLeft: -15 } // -half width
                ]}
              >
                  <Pressable
                    style={({ pressed }) => [
                      styles.blackKey,
                      pressed && styles.keyPressed
                    ]}
                    onPress={() => handlePress(note)}
                  >
                     {/* No label usually or small */}
                  </Pressable>
              </View>
            );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 200,
    width: '100%',
    position: 'relative',
    backgroundColor: '#333',
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  whiteKeysContainer: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
  },
  whiteKey: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ccc',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  keyPressed: {
    backgroundColor: '#ddd',
  },
  keyLabelContainer: {
      marginBottom: 5,
  },
  keyLabel: {
    color: '#333',
    fontSize: 12,
    fontWeight: 'bold',
  },
  blackKeysOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    top: 10, // match container padding
    bottom: 80, // black keys are shorter
    left: 10,
    right: 10,
  },
  blackKeyWrapper: {
      position: 'absolute',
      width: 30, // Fixed width for black keys? Or percent? Fixed is easier for touch target.
      height: '60%',
      zIndex: 10,
  },
  blackKey: {
      width: '100%',
      height: '100%',
      backgroundColor: 'black',
      borderBottomLeftRadius: 3,
      borderBottomRightRadius: 3,
  }
});
