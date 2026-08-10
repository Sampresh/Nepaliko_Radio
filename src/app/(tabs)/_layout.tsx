import { Tabs } from 'expo-router';

import { TabBar } from '@/components/navigation/TabBar';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { Colors } from '@/theme';

export default function TabsLayout() {
  return (
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
    </Tabs>
  );
}
