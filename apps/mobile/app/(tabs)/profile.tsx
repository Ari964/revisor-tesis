import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    SecureStore.getItemAsync('user').then((stored) => { if (stored) setUser(JSON.parse(stored)); });
  }, []);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');
    router.replace('/(auth)/login');
  };

  if (!user) return null;

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.firstName?.[0]}{user.lastName?.[0]}</Text>
        </View>
        <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <View style={styles.roleBadge}><Text style={styles.roleText}>{user.role}</Text></View>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={() => Alert.alert('Cerrar Sesión', '¿Estás seguro?', [{ text: 'Cancelar' }, { text: 'Sí', onPress: handleLogout, style: 'destructive' }])}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  avatarContainer: { alignItems: 'center', marginTop: 40 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  name: { fontSize: 24, fontWeight: '700', color: '#f1f5f9' },
  email: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  roleBadge: { backgroundColor: '#312e81', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  roleText: { color: '#a5b4fc', fontSize: 13, fontWeight: '600' },
  logoutButton: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 40, borderWidth: 1, borderColor: '#ef4444' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
});
