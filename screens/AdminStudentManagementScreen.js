import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SupabaseService from '../services/SupabaseService';

export default function AdminStudentManagementScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editHours, setEditHours] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await SupabaseService.getAllStudents();
      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const openStudentModal = (student) => {
    setSelectedStudent(student);
    setEditHours('');
    setModalVisible(true);
  };

  const handleQuickAdjust = (amount) => {
    setEditHours((prev) => {
      const prevVal = parseFloat(prev) || 0;
      return String(prevVal + amount);
    });
  };

  const handleSave = async () => {
    if (!editHours || isNaN(Number(editHours))) {
      Alert.alert('Invalid Input', 'Please enter a valid number of hours to add or remove.');
      return;
    }
    setSaving(true);
    try {
      const newHours = Math.max(0, (parseFloat(selectedStudent.total_hours || 0) + parseFloat(editHours)));
      await SupabaseService.updateStudent(selectedStudent.s_number, {
        total_hours: newHours,
        last_hour_update: new Date().toISOString(),
      });
      Alert.alert('Success', `Student hours updated to ${newHours}`);
      setModalVisible(false);
      fetchStudents();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update hours');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Student Management</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#4299e1" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={students}
          keyExtractor={item => item.s_number}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.studentCard} onPress={() => openStudentModal(item)}>
              <View style={styles.studentInfo}>
                <Ionicons name="person" size={28} color="#4299e1" style={{ marginRight: 12 }} />
                <View>
                  <Text style={styles.studentName}>{item.name || item.s_number}</Text>
                  <Text style={styles.studentSNumber}>{item.s_number}</Text>
                </View>
              </View>
              <View style={styles.hoursBox}>
                <Ionicons name="time" size={18} color="#4299e1" />
                <Text style={styles.hoursText}>{item.total_hours || 0} hrs</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Hours</Text>
            <Text style={styles.modalStudentName}>{selectedStudent?.name || selectedStudent?.s_number}</Text>
            <Text style={styles.modalStudentSNumber}>{selectedStudent?.s_number}</Text>
            <Text style={styles.modalCurrentHours}>Current Hours: <Text style={{ color: '#4299e1', fontWeight: 'bold', fontSize: 18 }}>{selectedStudent?.total_hours || 0}</Text></Text>
            <Text style={styles.inputLabel}>Add or Remove Hours</Text>
            <View style={styles.inputRowCompact}>
              <TouchableOpacity style={styles.quickButtonCompact} onPress={() => handleQuickAdjust(-1)}>
                <Text style={styles.quickButtonText}>-1</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.inputCompact}
                placeholder="e.g. 2 or -1"
                keyboardType="numeric"
                value={editHours}
                onChangeText={setEditHours}
                textAlign="center"
                maxLength={5}
              />
              <TouchableOpacity style={styles.quickButtonCompact} onPress={() => handleQuickAdjust(1)}>
                <Text style={styles.quickButtonText}>+1</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a365d',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4299e1',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  studentCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(66,153,225,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  studentSNumber: {
    fontSize: 13,
    color: '#cbd5e0',
    marginTop: 2,
  },
  hoursBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(66,153,225,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hoursText: {
    color: '#4299e1',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 15,
  },
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2147483647,
    elevation: 2147483647,
    pointerEvents: 'auto',
    ...(Platform.OS === 'web'
      ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }
      : { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }),
  },
  modalContent: {
    backgroundColor: '#1a365d',
    borderRadius: 18,
    padding: 28,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(66,153,225,0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4299e1',
    marginBottom: 8,
  },
  modalStudentName: {
    fontSize: 18,
    color: '#e2e8f0',
    fontWeight: 'bold',
    marginTop: 6,
  },
  modalStudentSNumber: {
    fontSize: 14,
    color: '#cbd5e0',
    marginBottom: 2,
  },
  modalCurrentHours: {
    fontSize: 15,
    color: '#cbd5e0',
    marginBottom: 12,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2d3748',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(66,153,225,0.18)',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#718096',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: '#4299e1',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  inputLabel: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  quickButton: {
    backgroundColor: '#4299e1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
  },
  quickButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  inputRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
    marginTop: 2,
  },
  inputCompact: {
    width: 70,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 18,
    color: '#2d3748',
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(66,153,225,0.18)',
    textAlign: 'center',
  },
  quickButtonCompact: {
    backgroundColor: '#4299e1',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 2,
    minWidth: 44,
    alignItems: 'center',
  },
}); 