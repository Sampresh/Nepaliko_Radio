import { Tabs, useRouter } from 'expo-router';

import { SignInPitchSheet } from '@/components/auth/SignInPitch';
import { TabBar } from '@/components/navigation/TabBar';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { useSignInPrompt } from '@/features/auth/useSignInPrompt';
import { Colors } from '@/theme';

export default function TabsLayout() {
  // Mounted here rather than on a screen so it survives tab switches, and so it
  // can never take a screen away from someone who is listening.
  const { visible, dismiss, accept } = useSignInPrompt();
  const router = useRouter();

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.background },
      }}
      tabBar={({ insets }) => (
        <>
          <MiniPlayer />
          <TabBar bottomInset={insets.bottom} />
        </>
      )}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="social" />
      <Tabs.Screen name="news" />
      <Tabs.Screen name="connect" />
      <Tabs.Screen name="profile" />
    </Tabs>

    <SignInPitchSheet
      visible={visible}
      onDismiss={dismiss}
      onSignIn={() => {
        accept();
        router.push('/sign-in');
      }}
    />
    </>
  );
}
