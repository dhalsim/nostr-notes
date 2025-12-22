# Nostr Notes (Piano Strudel)

A React Native (Expo) application featuring a graphical piano and a sliding note chart, powered by [Strudel](https://strudel.cc/) for audio synthesis.

## Features

- **Graphical Piano**: Interactive keyboard with white and black keys.
- **Sliding Note Chart**: Visualizes notes flowing in real-time using `react-native-reanimated` for smooth performance (UI thread animation).
- **Web Audio**: Uses Strudel REPL/Core for sound generation (Web only currently).

## Project Structure

- `app/index.tsx`: Main game screen coordinating state.
- `components/Piano.tsx`: The piano keyboard UI.
- `components/NoteChart.tsx`: The sliding note visualization.
- `utils/strudel.ts`: Interface to the Strudel audio engine.

## Animation & Performance

To avoid VDOM synchronization issues (like in 2048):
1.  **Decoupled Animation**: The sliding effect is handled by `react-native-reanimated` on the UI thread. The Javascript thread does not trigger re-renders for every frame of movement.
2.  **State Management**: React state is only updated when a *new note* is played, not for the movement of existing notes.

## Limitations

- **Audio Support**: The Strudel library relies on the Web Audio API. This project currently plays sound only when running on **Web**. To support iOS/Android native audio with Strudel, you would need to run the engine inside a `WebView` or use a different native audio library.

## Running

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Run on Web (Recommended for Audio):
    ```bash
    npx expo start --web
    ```
3.  Run on iOS/Android (Visuals only):
    ```bash
    npx expo start
    ```
