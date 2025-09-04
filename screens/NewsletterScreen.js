import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NewsletterScreen() {
  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Single PDF only (web)
    if (Platform.OS === 'web') {
      setNewsletters([{
        title: 'Monthly Newsletter',
        file: '/newsletters/latest.pdf',
      }]);
    }
    setLoading(false);
  }, []);

  const handleDownload = (filePath) => {
    if (Platform.OS === 'web') {
      // Open in a new tab; browser will handle download/preview
      const url = filePath.startsWith('http') ? filePath : `${filePath}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      // Not supported on native in this flow
    }
  };

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Monthly Newsletter</Text>
        <View style={styles.card}>
          <Ionicons name="globe-outline" size={24} color="#1a365d" />
          <Text style={[styles.infoText, { marginTop: 10 }]}>Please visit the website to download the newsletter.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Monthly Newsletter</Text>
      {loading ? (
        <Text style={styles.infoText}>Loading...</Text>
      ) : error ? (
        <Text style={styles.errorText}>Error: {error}</Text>
      ) : newsletters.length === 0 ? (
        <Text style={styles.infoText}>No newsletter available yet.</Text>
      ) : (
        <FlatList
          data={newsletters}
          keyExtractor={(item, index) => `${item.year}-${item.month}-${index}`}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title || `Monthly Newsletter`}</Text>
                <Text style={styles.itemSub}></Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDownload(item.file)}
                style={styles.downloadButton}
                activeOpacity={0.8}
              >
                <Ionicons name="download-outline" size={18} color="#ffffff" />
                <Text style={styles.downloadText}>Download</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoText: {
    color: '#4a5568',
    textAlign: 'center',
  },
  errorText: {
    color: '#e53e3e',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  item: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
  },
  itemSub: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
  },
  downloadButton: {
    marginLeft: 12,
    backgroundColor: '#3182ce',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
});


