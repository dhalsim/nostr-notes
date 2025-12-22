import { NoteChart, NoteData } from '@/components/NoteChart';
import { Piano } from '@/components/Piano';
import { initializeAudio } from '@/utils/strudel';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Button, Platform, StatusBar as RNStatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PianoScreen() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [notes, setNotes] = useState<NoteData[]>([]);

  const handleStart = async () => {
    await initializeAudio();
    setIsPlaying(true);
    setStartTime(Date.now());
    setNotes([]);
  };

  const handleStop = () => {
    setIsPlaying(false);
  };

  const handlePlayNote = (note: string) => {
    // Note sound is triggered inside Piano component via utils/strudel
    
    // If we are recording/session is active, add to chart
    if (isPlaying) {
        const timestamp = Date.now() - startTime;
        const newNote: NoteData = {
            id: Math.random().toString(36).substr(2, 9),
            note,
            timestamp
        };
        setNotes(prev => [...prev, newNote]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Strudel Piano</Text>
        <View style={styles.controls}>
          {!isPlaying ? (
            <Button title="Start Session" onPress={handleStart} color="#2196F3" />
          ) : (
            <Button title="Stop" onPress={handleStop} color="#f44336" />
          )}
        </View>
      </View>
      
      <View style={styles.chartContainer}>
         <NoteChart 
            notes={notes} 
            isPlaying={isPlaying} 
            startTime={startTime} 
         />
      </View>
      
      <View style={styles.pianoContainer}>
         <Piano onPlayNote={handlePlayNote} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1e1e1e',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  controls: {
    flexDirection: 'row',
  },
  chartContainer: {
    flex: 1,
    // NoteChart takes available space
  },
  pianoContainer: {
    height: 220, // Piano height + padding
    backgroundColor: '#333',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
});
