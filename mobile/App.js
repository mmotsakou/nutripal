import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from './src/context/AppContext';
import AppNavigator from './src/navigation';

function AppWithTheme() {
  const { themeName } = useApp();
  return (
    <>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppWithTheme />
    </AppProvider>
  );
}
