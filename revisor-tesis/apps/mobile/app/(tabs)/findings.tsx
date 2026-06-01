import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://localhost:3001/api';
const SEVERITY_COLORS: Record<string, string> = { CRITICAL: '#ef4444', MAJOR: '#f97316', MINOR: '#eab308', INFO: '#6366f1' };

export default function FindingsScreen() {
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync('accessToken');
      // Primero obtener proyectos del usuario
      const projRes = await fetch(`${API_URL}/thesis`, { headers: { Authorization: `Bearer ${token}` } });
      const projData = await projRes.json();
      const allFindings: any[] = [];
      // Obtener findings de cada proyecto
      for (const proj of (projData.data || []).slice(0, 5)) {
        const docsRes = await fetch(`${API_URL}/documents/project/${proj.id}`, { headers: { Authorization: `Bearer ${token}` } });
        const docsData = await docsRes.json();
        for (const doc of (docsData.data || []).slice(0, 3)) {
          const findingsRes = await fetch(`${API_URL}/review/findings/${doc.id}`, { headers: { Authorization: `Bearer ${token}` } });
          const findingsData = await findingsRes.json();
          allFindings.push(...(findingsData.data || []).map((f: any) => ({ ...f, documentName: doc.fileName })));
        }
      }
      setFindings(allFindings);
      setLoading(false);
    })();
  }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>;

  return (
    <View style={styles.container}>
      <FlatList data={findings} keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.severityBar, { backgroundColor: SEVERITY_COLORS[item.severity] || '#6366f1' }]} />
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: (SEVERITY_COLORS[item.severity] || '#6366f1') + '20' }]}>
                  <Text style={[styles.badgeText, { color: SEVERITY_COLORS[item.severity] || '#6366f1' }]}>{item.severity}</Text>
                </View>
                <Text style={styles.category}>{item.category}</Text>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
              <Text style={styles.instruction} numberOfLines={2}>💡 {item.instruction}</Text>
              <Text style={styles.docName}>📄 {item.documentName}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No hay hallazgos de IA</Text></View>}
        contentContainerStyle={{ padding: 16, gap: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, flexDirection: 'row', overflow: 'hidden' },
  severityBar: { width: 4 },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  category: { fontSize: 12, color: '#64748b' },
  title: { fontSize: 15, fontWeight: '700', color: '#f1f5f9', marginBottom: 4 },
  description: { fontSize: 13, color: '#94a3b8', lineHeight: 20 },
  instruction: { fontSize: 13, color: '#6ee7b7', marginTop: 8, lineHeight: 20 },
  docName: { fontSize: 12, color: '#64748b', marginTop: 8 },
  emptyText: { color: '#64748b', fontSize: 16 },
});
