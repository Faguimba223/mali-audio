import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppNavigation from './src/navigation/AppNavigation';
import { ThemeProvider, useAppTheme } from './src/styles/ThemeContext';
import { AuthProvider } from './src/auth/AuthContext';
import { AudioPlayerProvider } from './src/components/AudioPlayer';

function MaliAudioApp() {
  const { isDark } = useAppTheme();

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigation />
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AudioPlayerProvider>
          <MaliAudioApp />
        </AudioPlayerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}