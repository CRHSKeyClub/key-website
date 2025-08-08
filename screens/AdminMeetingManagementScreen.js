import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Dimensions,
  StatusBar,
  Animated,
  TextInput,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import SupabaseService from '../services/SupabaseService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Picker options
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dates = Array.from({length: 31}, (_, i) => (i + 1).toString());

export default function AdminMeetingManagementScreen({ navigation }) {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [meetingAttendance, setMeetingAttendance] = useState([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedMeetingsToDelete, setSelectedMeetingsToDelete] = useState(new Set());
  
  // Modal states
  const [createMeetingModal, setCreateMeetingModal] = useState({
    visible: false,
    meetingDate: '',
    meetingType: 'morning',
    attendanceCode: ''
  });
  
  // Date input state
  const [selectedDay, setSelectedDay] = useState('Tuesday');
  const [selectedMonth, setSelectedMonth] = useState('September');
  const [selectedDate, setSelectedDate] = useState('1');
  
  const [attendanceModal, setAttendanceModal] = useState({
    visible: false,
    meeting: null
  });
  
  // Animation refs
  const headerAnim = useRef(new Animated.Value(-100)).current;
  const listAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    loadData();
    animateHeader();
  }, []);

  const animateHeader = () => {
    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(listAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('📅 Loading admin meeting data...');
      
      const allMeetings = await SupabaseService.getAllMeetings();

      // Sort by proximity to today: upcoming first (nearest), then past (nearest)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sorted = [...allMeetings].sort((a, b) => {
        const da = new Date(a.meeting_date);
        const db = new Date(b.meeting_date);
        da.setHours(0,0,0,0); db.setHours(0,0,0,0);
        const diffA = da.getTime() - today.getTime();
        const diffB = db.getTime() - today.getTime();
        const aFuture = diffA >= 0;
        const bFuture = diffB >= 0;
        if (aFuture && !bFuture) return -1; // future before past
        if (!aFuture && bFuture) return 1;
        // both future or both past: closest first
        return Math.abs(diffA) - Math.abs(diffB);
      });

      setMeetings(sorted);
      
      console.log(`✅ Loaded ${allMeetings.length} meetings`);
    } catch (error) {
      console.error('❌ Failed to load meeting data:', error);
      Alert.alert('Error', 'Failed to load meeting data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } catch (error) {
      console.error('❌ Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const openCreateMeetingModal = () => {
    const generatedCode = SupabaseService.generateAttendanceCode();
    setCreateMeetingModal({
      visible: true,
      meetingDate: '',
      meetingType: 'morning',
      attendanceCode: generatedCode
    });
    
    // Initialize with Tuesday as default (since meetings are on Tuesdays)
    setSelectedDay('Tuesday');
    setSelectedMonth('September');
    setSelectedDate('2');
  };
  
  const buildDateString = () => {
    const monthMap = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04',
      'May': '05', 'June': '06', 'July': '07', 'August': '08',
      'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    
    // Validate inputs
    if (!selectedMonth || !selectedDate || !selectedDay) {
      return '';
    }
    
    const month = monthMap[selectedMonth];
    if (!month) {
      return '';
    }
    
    // Ensure date is a valid number
    const dayNum = parseInt(selectedDate);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      return '';
    }
    
    const day = dayNum.toString().padStart(2, '0');
    const year = '2025'; // Default to 2025, can be made dynamic later
    
    return `${year}-${month}-${day}`;
  };
  
  const updateMeetingDate = () => {
    const dateString = buildDateString();
    setCreateMeetingModal(prev => ({
      ...prev,
      meetingDate: dateString
    }));
  };

  const closeCreateMeetingModal = () => {
    setCreateMeetingModal({
      visible: false,
      meetingDate: '',
      meetingType: 'morning',
      attendanceCode: ''
    });
  };

  const createMeeting = async () => {
    // Validate all date inputs
    if (!selectedDay.trim() || !selectedMonth.trim() || !selectedDate.trim()) {
      Alert.alert('Error', 'Please fill in all date fields (Day, Month, Date)');
      return;
    }
    
    // Validate date number
    const dayNum = parseInt(selectedDate);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      Alert.alert('Error', 'Please enter a valid date (1-31)');
      return;
    }
    
    // Validate month
    const monthMap = {
      'January': '01', 'February': '02', 'March': '03', 'April': '04',
      'May': '05', 'June': '06', 'July': '07', 'August': '08',
      'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    
    if (!monthMap[selectedMonth]) {
      Alert.alert('Error', 'Please enter a valid month (e.g., September)');
      return;
    }
    
    const dateString = buildDateString();
    if (!dateString) {
      Alert.alert('Error', 'Invalid date format. Please check your inputs.');
      return;
    }

    try {
      console.log('📅 Creating new meeting...');
      console.log('📅 Date being sent:', dateString);
      
      await SupabaseService.createMeeting({
        meetingDate: dateString,
        meetingType: createMeetingModal.meetingType,
        attendanceCode: createMeetingModal.attendanceCode,
        isOpen: false, // Start closed by default
        createdBy: user.sNumber
      });
      
      Alert.alert('Success!', 'Meeting created successfully!', [
        { text: 'OK', onPress: () => {
          closeCreateMeetingModal();
          loadData(); // Refresh data
        }}
      ]);
    } catch (error) {
      console.error('❌ Meeting creation failed:', error);
      Alert.alert('Error', error.message || 'Failed to create meeting');
    }
  };

  const toggleMeetingStatus = async (meeting) => {
    const newStatus = !meeting.is_open;
    const action = newStatus ? 'open' : 'close';
    
    try {
      console.log(`🔄 ${action}ing meeting:`, meeting.id);
      
      await SupabaseService.updateMeeting(meeting.id, {
        is_open: newStatus
      });
      
      // Update the local state immediately for better UX
      setMeetings(prevMeetings => 
        prevMeetings.map(m => 
          m.id === meeting.id ? { ...m, is_open: newStatus } : m
        )
      );
      
      Alert.alert('Success!', `Meeting ${action}ed successfully!`);
    } catch (error) {
      console.error(`❌ Failed to ${action} meeting:`, error);
      Alert.alert('Error', `Failed to ${action} meeting`);
    }
  };

  const openAttendanceModal = async (meeting) => {
    try {
      console.log('📊 Loading attendance for meeting:', meeting.id);
      
      const attendance = await SupabaseService.getMeetingAttendance(meeting.id);
      setMeetingAttendance(attendance);
      setAttendanceModal({
        visible: true,
        meeting: meeting
      });
    } catch (error) {
      console.error('❌ Failed to load attendance:', error);
      Alert.alert('Error', 'Failed to load attendance data');
    }
  };

  const closeAttendanceModal = () => {
    setAttendanceModal({
      visible: false,
      meeting: null
    });
    setMeetingAttendance([]);
  };

  const openDeleteMode = () => {
    setDeleteMode(true);
    setSelectedMeetingsToDelete(new Set());
  };

  const cancelDeleteMode = () => {
    setDeleteMode(false);
    setSelectedMeetingsToDelete(new Set());
  };

  const toggleMeetingSelection = (meetingId) => {
    const newSelected = new Set(selectedMeetingsToDelete);
    if (newSelected.has(meetingId)) {
      newSelected.delete(meetingId);
    } else {
      newSelected.add(meetingId);
    }
    setSelectedMeetingsToDelete(newSelected);
  };

  const deleteSelectedMeetings = async () => {
    if (selectedMeetingsToDelete.size === 0) {
      Alert.alert('Error', 'Please select at least one meeting to delete');
      return;
    }

    try {
      console.log('🗑️ Deleting selected meetings...');
      console.log('🗑️ Meeting IDs to delete:', Array.from(selectedMeetingsToDelete));
      
      let deletedCount = 0;
      let failedCount = 0;
      
      // Delete each selected meeting
      for (const meetingId of selectedMeetingsToDelete) {
        try {
          console.log(`🗑️ Attempting to delete meeting ${meetingId}...`);
          await SupabaseService.deleteMeeting(meetingId);
          console.log(`✅ Successfully deleted meeting ${meetingId}`);
          deletedCount++;
        } catch (error) {
          console.error(`❌ Failed to delete meeting ${meetingId}:`, error);
          failedCount++;
        }
      }
      
      if (failedCount > 0) {
        Alert.alert(
          'Partial Success', 
          `Deleted ${deletedCount} meeting(s), but failed to delete ${failedCount} meeting(s). Check console for details.`,
          [
            { text: 'OK', onPress: () => {
              cancelDeleteMode();
              loadData(); // Refresh data
            }}
          ]
        );
      } else {
        Alert.alert('Success!', `Deleted ${deletedCount} meeting(s) successfully!`, [
          { text: 'OK', onPress: () => {
            cancelDeleteMode();
            loadData(); // Refresh data
          }}
        ]);
      }
    } catch (error) {
      console.error('❌ Failed to delete meetings:', error);
      Alert.alert('Error', `Failed to delete selected meetings: ${error.message}`);
    }
  };

  const regenerateCode = async (meeting) => {
    try {
      const newCode = SupabaseService.generateAttendanceCode();
      
      await SupabaseService.updateMeeting(meeting.id, {
        attendance_code: newCode
      });
      
      Alert.alert('Success!', 'Attendance code regenerated!', [
        { text: 'OK', onPress: loadData }
      ]);
    } catch (error) {
      console.error('❌ Failed to regenerate code:', error);
      Alert.alert('Error', 'Failed to regenerate attendance code');
    }
  };

  const formatMeetingDate = (dateString) => {
    // Parse the date string and treat it as local time to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed in JavaScript
    
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatMeetingTime = (meetingType) => {
    return meetingType === 'both' ? 'Morning & Afternoon Sessions' : 'Single Session';
  };

  const renderMeetingItem = ({ item }) => {
    const isSelected = selectedMeetingsToDelete.has(item.id);
    
    return (
      <TouchableOpacity 
        style={[
          styles.meetingCard, 
          { opacity: listAnim },
          deleteMode && isSelected && styles.selectedMeetingCard
        ]}
        onPress={() => {
          if (deleteMode) {
            toggleMeetingSelection(item.id);
          }
        }}
        activeOpacity={deleteMode ? 0.7 : 1}
      >
        {deleteMode && (
          <View style={[styles.selectionIndicator, isSelected && styles.selectedIndicator]}>
            <Ionicons 
              name={isSelected ? "checkmark-circle" : "ellipse-outline"} 
              size={20} 
              color={isSelected ? "#ffffff" : "#6b7280"} 
            />
          </View>
        )}
        
        <View style={styles.meetingHeader}>
          <View style={styles.meetingInfo}>
            <Text style={styles.meetingDate}>{formatMeetingDate(item.meeting_date)}</Text>
            <Text style={styles.meetingTime}>{formatMeetingTime(item.meeting_type)}</Text>
          </View>
          {!deleteMode && (
            <View style={[styles.statusBadge, { 
              backgroundColor: item.is_open ? '#10b98120' : '#6b728020' 
            }]}>
              <Text style={[styles.statusText, { 
                color: item.is_open ? '#10b981' : '#6b7280' 
              }]}>
                {item.is_open ? '🔓 Open' : '🔒 Closed'}
              </Text>
            </View>
          )}
        </View>
        
        {!deleteMode && (
          <>
            <View style={styles.codeSection}>
              <Text style={styles.codeLabel}>Attendance Code:</Text>
              <Text style={styles.codeText}>{item.attendance_code}</Text>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.toggleButton]}
                onPress={() => toggleMeetingStatus(item)}
              >
                <Ionicons 
                  name={item.is_open ? "lock-closed" : "lock-open"} 
                  size={16} 
                  color="#4299e1" 
                />
                <Text style={styles.actionButtonText}>
                  {item.is_open ? 'Close' : 'Open'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.regenerateButton]}
                onPress={() => regenerateCode(item)}
              >
                <Ionicons name="refresh" size={16} color="#f59e0b" />
                <Text style={styles.actionButtonText}>New Code</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.attendanceButton]}
                onPress={() => openAttendanceModal(item)}
              >
                <Ionicons name="people" size={16} color="#8b5cf6" />
                <Text style={styles.actionButtonText}>Attendance</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderAttendanceItem = ({ item }) => {
    return (
      <View style={styles.attendanceItem}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.students?.name || 'Unknown'}</Text>
          <Text style={styles.studentNumber}>{item.student_s_number}</Text>
        </View>
        <Text style={styles.submittedTime}>
          {new Date(item.submitted_at).toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a365d" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4299e1" />
          <Text style={styles.loadingText}>Loading meetings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a365d" />
      
      {/* Header */}
      <Animated.View 
        style={[
          styles.header,
          { transform: [{ translateY: headerAnim }] }
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meeting Management</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={openDeleteMode}
          >
            <Ionicons name="trash" size={20} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={openCreateMeetingModal}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        {deleteMode ? (
          <View style={styles.deleteModeHeader}>
            <Text style={styles.deleteModeTitle}>Select Meetings to Delete</Text>
            <TouchableOpacity
              style={styles.cancelDeleteButton}
              onPress={cancelDeleteMode}
            >
              <Text style={styles.cancelDeleteText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.sectionTitle}>All Meetings</Text>
        )}
        
        <FlatList
          data={meetings}
          renderItem={renderMeetingItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#4299e1']}
              tintColor="#4299e1"
            />
          }
          contentContainerStyle={styles.listContainer}
        />
        
        {deleteMode && selectedMeetingsToDelete.size > 0 && (
          <View style={styles.deleteConfirmation}>
            <Text style={styles.deleteConfirmationText}>
              {selectedMeetingsToDelete.size} meeting(s) selected
            </Text>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={deleteSelectedMeetings}
            >
              <Ionicons name="trash" size={16} color="#ffffff" />
              <Text style={styles.deleteButtonText}>Delete Selected</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Create Meeting Modal */}
      <Modal
        visible={createMeetingModal.visible}
        transparent
        animationType="slide"
        onRequestClose={closeCreateMeetingModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Meeting</Text>
            
            <Text style={styles.inputLabel}>Meeting Date</Text>
            <View style={styles.dateInputContainer}>
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>Day of Week</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="e.g., Tuesday"
                  value={selectedDay}
                  onChangeText={(text) => {
                    setSelectedDay(text);
                    updateMeetingDate();
                  }}
                />
              </View>
              
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>Month</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="e.g., September"
                  value={selectedMonth}
                  onChangeText={(text) => {
                    setSelectedMonth(text);
                    updateMeetingDate();
                  }}
                />
              </View>
              
              <View style={styles.dateInputGroup}>
                <Text style={styles.dateInputLabel}>Date</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder="e.g., 2"
                  value={selectedDate}
                  onChangeText={(text) => {
                    setSelectedDate(text);
                    updateMeetingDate();
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <Text style={styles.selectedDateText}>
              Selected: {selectedDay}, {selectedMonth} {selectedDate}, 2025
            </Text>
            
            <Text style={styles.inputLabel}>Meeting Type</Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  createMeetingModal.meetingType === 'both' && styles.typeButtonActive
                ]}
                onPress={() => setCreateMeetingModal(prev => ({ ...prev, meetingType: 'both' }))}
              >
                <Text style={[
                  styles.typeButtonText,
                  createMeetingModal.meetingType === 'both' && styles.typeButtonTextActive
                ]}>Both Sessions</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Attendance Code</Text>
            <Text style={styles.codeDisplay}>{createMeetingModal.attendanceCode}</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={closeCreateMeetingModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={createMeeting}
              >
                <Text style={styles.submitButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Attendance Modal */}
      <Modal
        visible={attendanceModal.visible}
        transparent
        animationType="slide"
        onRequestClose={closeAttendanceModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.attendanceModalContent}>
            <View style={styles.attendanceModalHeader}>
              <Text style={styles.attendanceModalTitle}>
                {attendanceModal.meeting && formatMeetingDate(attendanceModal.meeting.meeting_date)}
              </Text>
              <TouchableOpacity onPress={closeAttendanceModal}>
                <Ionicons name="close" size={24} color="#4a5568" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.attendanceCount}>
              {meetingAttendance.length} students attended
            </Text>
            
            <FlatList
              data={meetingAttendance}
              renderItem={renderAttendanceItem}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.attendanceList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
    paddingTop: 0,
  },
  header: {
    backgroundColor: '#1a365d',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4a5568',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  meetingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  meetingInfo: {
    flex: 1,
  },
  meetingDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a365d',
    marginBottom: 4,
  },
  meetingTime: {
    fontSize: 14,
    color: '#4a5568',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  codeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f7fafc',
    borderRadius: 8,
  },
  codeLabel: {
    fontSize: 14,
    color: '#4a5568',
    marginRight: 8,
  },
  codeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a365d',
    letterSpacing: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
  },
  toggleButton: {
    backgroundColor: '#ebf8ff',
  },
  regenerateButton: {
    backgroundColor: '#fef3c7',
  },
  attendanceButton: {
    backgroundColor: '#f3e8ff',
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a365d',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a365d',
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f7fafc',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInputContainer: {
    marginBottom: 16,
  },
  dateInputGroup: {
    marginBottom: 12,
  },
  dateInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a365d',
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f7fafc',
  },
  selectedDateText: {
    fontSize: 14,
    color: '#4299e1',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#ebf8ff',
    borderRadius: 6,
  },
  typeButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginHorizontal: 4,
  },
  typeButtonActive: {
    backgroundColor: '#4299e1',
    borderColor: '#4299e1',
  },
  typeButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#4a5568',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  codeDisplay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a365d',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    marginBottom: 24,
    letterSpacing: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#4a5568',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4299e1',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  submitButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  attendanceModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  attendanceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  attendanceModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a365d',
  },
  attendanceCount: {
    fontSize: 14,
    color: '#4a5568',
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: '#f7fafc',
  },
  attendanceList: {
    padding: 20,
  },
  attendanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a365d',
    marginBottom: 2,
  },
  studentNumber: {
    fontSize: 14,
    color: '#4a5568',
  },
  submittedTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteModeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteModeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  cancelDeleteText: {
    fontSize: 14,
    color: '#dc2626',
    fontWeight: '600',
  },
  selectedMeetingCard: {
    backgroundColor: '#4299e1',
    borderColor: '#4299e1',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  selectedIndicator: {
    backgroundColor: '#10b981',
    borderRadius: 10,
  },
  deleteConfirmation: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  deleteConfirmationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
}); 