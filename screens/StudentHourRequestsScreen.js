import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHours } from '../contexts/HourContext';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function StudentHourRequestsScreen({ navigation }) {
  const { getStudentRequests, getStudentHours, refreshHourRequests } = useHours();
  const { user } = useAuth();
  
  const [requests, setRequests] = useState([]);
  const [currentHours, setCurrentHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user?.sNumber) return;
    
    try {
      console.log('🔄 Loading student data from Supabase...');
      
      // Import and call SupabaseService directly
      const SupabaseService = (await import('../services/SupabaseService')).default;
      
      // Load student's requests
      const studentRequests = await SupabaseService.getStudentHourRequests(user.sNumber);
      setRequests(studentRequests);
      console.log('✅ Loaded student requests:', studentRequests.length);
      
      // Load current hours
      const hours = await getStudentHours(user.sNumber);
      setCurrentHours(hours);
      console.log('✅ Loaded current hours:', hours);
    } catch (error) {
      console.error('❌ Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 Manual refresh triggered...');
      await loadData(); // Load fresh data directly
    } catch (error) {
      console.error('❌ Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#f39c12';
      case 'approved': return '#27ae60';
      case 'rejected': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'hourglass-outline';
      case 'approved': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderRequestItem = ({ item }) => (
    <View style={styles.requestItem}>
      <View style={styles.requestHeader}>
        <Text style={styles.eventName}>{item.event_name || 'No Event Name'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons 
            name={getStatusIcon(item.status)} 
            size={14} 
            color="white" 
            style={styles.statusIcon}
          />
          <Text style={styles.statusText}>{item.status?.toUpperCase() || 'UNKNOWN'}</Text>
        </View>
      </View>
      
      <View style={styles.requestDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.detailText}>Event: {formatDate(item.event_date)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.detailText}>Hours: {item.hours_requested || '0'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="paper-plane-outline" size={16} color="#666" />
          <Text style={styles.detailText}>Submitted: {formatDate(item.submitted_at)}</Text>
        </View>
      </View>
      
      {/* Render image if embedded as [PHOTO_DATA:...] in description */}
      {(() => {
        const desc = item.description || '';
        const match = desc.match(/\[PHOTO_DATA:([A-Za-z0-9+/=]+)\]/);
        if (match && match[1]) {
          return (
            <>
              {desc.replace(/\[PHOTO_DATA:[^\]]+\]/g, '').trim().length > 0 && (
                <Text style={styles.description}>
                  {desc.replace(/\[PHOTO_DATA:[^\]]+\]/g, '').trim()}
                </Text>
              )}
              <AutoImage base64={match[1]} />
            </>
          );
        }
        return (
          <Text style={styles.description} numberOfLines={2}>
            {desc || 'No description provided'}
          </Text>
        );
      })()}
      
      {item.status === 'approved' && item.reviewed_at && (
        <View style={styles.approvalInfo}>
          <Text style={styles.approvalText}>
            ✓ Approved on {formatDate(item.reviewed_at)}
          </Text>
        </View>
      )}
      
      {item.status === 'rejected' && item.admin_notes && (
        <View style={styles.rejectionInfo}>
          <Text style={styles.rejectionTitle}>Reason:</Text>
          <Text style={styles.rejectionText}>{item.admin_notes}</Text>
        </View>
      )}
    </View>
  );

  const getSummaryStats = () => {
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const totalRequested = requests
      .filter(r => r.status === 'approved')
      .reduce((sum, r) => sum + parseFloat(r.hours_requested || 0), 0);
    
    return { pending, approved, rejected, totalRequested };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#59a2f0" />
        <Text style={styles.loadingText}>Loading your requests...</Text>
      </View>
    );
  }

  const stats = getSummaryStats();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Hour Requests</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('HourRequest')}
        >
          <Ionicons name="add" size={24} color="#59a2f0" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{currentHours.toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>Total Hours</Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#f39c12' }]}>{stats.pending}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#27ae60' }]}>{stats.approved}</Text>
          <Text style={styles.summaryLabel}>Approved</Text>
        </View>
      </View>

      {/* Requests List */}
      {requests.length > 0 ? (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#59a2f0']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={60} color="#ccc" />
          <Text style={styles.emptyTitle}>No Hour Requests Yet</Text>
          <Text style={styles.emptyText}>
            Submit your first hour request to start tracking your volunteer hours!
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('HourRequest')}
          >
            <Text style={styles.createButtonText}>Submit Request</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// Auto-sizing image that grows the container based on intrinsic size
function AutoImage({ base64 }) {
  const [aspectRatio, setAspectRatio] = useState(null);
  const uri = `data:image/jpeg;base64,${base64}`;

  return (
    <Image
      source={{ uri }}
      onLoad={({ nativeEvent }) => {
        const { width, height } = nativeEvent?.source || {};
        if (width && height) {
          setAspectRatio(width / height);
        }
      }}
      style={[
        styles.proofImage,
        aspectRatio ? { aspectRatio } : styles.proofImageFallback,
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 5,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 15,
    justifyContent: 'space-between',
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#59a2f0',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 15,
  },
  requestItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  requestDetails: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  proofImage: {
    width: '100%',
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 6,
    backgroundColor: '#eee'
  },
  proofImageFallback: {
    aspectRatio: 16 / 9,
  },
  approvalInfo: {
    backgroundColor: '#e8f5e9',
    padding: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#27ae60',
  },
  approvalText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '500',
  },
  rejectionInfo: {
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#e74c3c',
  },
  rejectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 2,
  },
  rejectionText: {
    fontSize: 12,
    color: '#c0392b',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  createButton: {
    backgroundColor: '#59a2f0',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 6,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});