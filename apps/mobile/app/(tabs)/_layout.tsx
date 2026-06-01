import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#6366f1',
      tabBarInactiveTintColor: '#94a3b8',
      tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: '#1e293b', paddingBottom: 8, height: 60 },
      headerStyle: { backgroundColor: '#0f172a' },
      headerTintColor: '#f1f5f9',
    }}>
      <Tabs.Screen name="index" options={{
        title: 'Proyectos',
        tabBarIcon: ({ color, size }) => <Ionicons name="folder-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="findings" options={{
        title: 'Hallazgos',
        tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Perfil',
        tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
      }} />
    </Tabs>
  );
}
