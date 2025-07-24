import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHours } from '../contexts/HourContext';
import { useAuth } from '../contexts/AuthContext';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import ConfirmationDialog from '../components/ConfirmationDialog';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// Updated Google Apps Script Service for direct folder upload
class SimpleGoogleDriveService {
  // Google Apps Script Web App URL for photo uploads
  static APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwd6UbjjETvgtGUV7T5jv2oNnQbYsujX8v2FvqrrcjZZUPpm5y2hAXvOUX7Eyh2llmjvg/exec';
  
  static async uploadImage(imageUri, studentNumber, eventName) {
    try {
      console.log('📤 Starting Google Apps Script upload...');
      
      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const cleanEventName = eventName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${studentNumber}_${cleanEventName}_${timestamp}.jpg`;
      
      // Prepare the payload for the updated Google Apps Script
      const payload = {
        imageData: base64,
        fileName: fileName,
        studentNumber: studentNumber,
        eventName: eventName
      };
      
      console.log('📤 Sending to Google Apps Script...', {
        fileName,
        studentNumber,
        eventName,
        dataSize: base64.length
      });
      
      // Send to Google Apps Script with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(this.APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Upload result:', result);
      
      if (result.success) {
        return {
          success: true,
          fileId: result.fileId,
          fileName: result.fileName,
          fileUrl: result.fileUrl,
          downloadUrl: result.downloadUrl,
          thumbnailUrl: result.thumbnailUrl,
          uploadedAt: result.uploadedAt,
          targetFolder: result.targetFolder,
          message: result.message
        };
      } else {
        throw new Error(result.error || 'Unknown upload error');
      }
      
    } catch (error) {
      console.error('❌ Upload failed:', error);
      
      // Handle different types of errors
      let errorMessage = 'Unknown upload error';
      if (error.name === 'AbortError') {
        errorMessage = 'Upload timed out - please try again';
      } else if (error.message.includes('HTTP error')) {
        errorMessage = `Server error: ${error.message}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        localUri: imageUri,
        fileName: `${studentNumber}_${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.jpg`,
        uploadStatus: 'failed'
      };
    }
  }
  
  // Test connection to Google Apps Script
  static async testConnection() {
    try {
      console.log('🔍 Testing Google Apps Script connection...');
      
      const response = await fetch(this.APPS_SCRIPT_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('✅ Connection test result:', result);
      
      return {
        success: true,
        status: result.status,
        message: result.message
      };
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default function HourRequestScreen({ navigation }) {
  const { submitHourRequest, getStudentHours } = useHours();
  const { user } = useAuth();
  
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [hoursRequested, setHoursRequested] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentHours, setCurrentHours] = useState(0);
  
  // Photo upload states
  const [image, setImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImageData, setUploadedImageData] = useState(null);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Dialog states
  const [successDialog, setSuccessDialog] = useState({
    visible: false,
    message: ''
  });
  
  const [errorDialog, setErrorDialog] = useState({
    visible: false,
    message: ''
  });

  // Load current hours when component mounts
  useEffect(() => {
    const loadCurrentHours = async () => {
      if (user?.sNumber) {
        try {
          const hours = await getStudentHours(user.sNumber);
          setCurrentHours(hours);
        } catch (error) {
          console.error('Failed to load current hours:', error);
        }
      }
    };
    
    loadCurrentHours();
  }, [user, getStudentHours]);

  // Test Google Apps Script connection on mount
  useEffect(() => {
    const testConnection = async () => {
      const result = await SimpleGoogleDriveService.testConnection();
      if (!result.success) {
        console.warn('⚠️ Google Apps Script connection test failed:', result.error);
      }
    };
    
    testConnection();
  }, []);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Enhanced image picker with better error handling
  const pickImage = async () => {
    try {
      console.log('📸 Starting image picker...');
      
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert(
          'Permission Required',
          'Permission to access your photo library is required to upload proof photos.'
        );
        return;
      }

      // Launch image picker with optimized settings
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Reduced quality for faster upload
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImage = result.assets[0];
        console.log('✅ Image selected:', {
          uri: selectedImage.uri,
          width: selectedImage.width,
          height: selectedImage.height,
          fileSize: selectedImage.fileSize
        });
        
        // Check file size (warn if > 5MB)
        if (selectedImage.fileSize && selectedImage.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            'Large File Warning',
            'This image is quite large and may take longer to upload. Continue?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Continue', 
                onPress: () => {
                  setImage(selectedImage.uri);
                  uploadImageToGoogleDrive(selectedImage.uri);
                }
              }
            ]
          );
        } else {
          setImage(selectedImage.uri);
          // Auto-upload to Google Drive
          await uploadImageToGoogleDrive(selectedImage.uri);
        }
      }
    } catch (error) {
      console.error('❌ Image picker error:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  // Enhanced upload function with better error handling
  const uploadImageToGoogleDrive = async (imageUri) => {
    if (!eventName.trim()) {
      Alert.alert(
        'Event Name Required',
        'Please enter an event name before uploading a photo.'
      );
      return;
    }
    
    setUploadingImage(true);
    
    try {
      console.log('📤 Starting Google Apps Script upload...');
      
      const uploadResult = await SimpleGoogleDriveService.uploadImage(
        imageUri,
        user.sNumber,
        eventName.trim()
      );
      
      setUploadedImageData(uploadResult);
      
      if (uploadResult.success) {
        Alert.alert(
          '✅ Upload Successful!', 
          `Photo uploaded to Google Drive successfully!\n\nFile: ${uploadResult.fileName}\nFolder: ${uploadResult.targetFolder || 'Key Club Photos'}`
        );
      } else {
        Alert.alert(
          '⚠️ Upload Failed', 
          `Could not upload to Google Drive: ${uploadResult.error}\n\nPhoto is saved locally and you can still submit your request.`
        );
      }
      
      console.log('✅ Upload completed:', uploadResult);
      
    } catch (error) {
      console.error('❌ Upload failed:', error);
      
      Alert.alert(
        '❌ Upload Failed', 
        `Could not upload photo to Google Drive: ${error.message}\n\nPlease check your internet connection and try again.`
      );
      
    } finally {
      setUploadingImage(false);
    }
  };

  // Remove selected image
  const removeImage = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            setImage(null);
            setUploadedImageData(null);
          }
        }
      ]
    );
  };

  const handleSubmitRequest = async () => {
    // Validate input
    if (!eventName.trim() || !hoursRequested.trim() || !description.trim()) {
      setErrorDialog({
        visible: true,
        message: 'Please fill in all required fields'
      });
      return;
    }

    const hours = parseFloat(hoursRequested);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      setErrorDialog({
        visible: true,
        message: 'Please enter a valid number of hours (0.1 - 24.0)'
      });
      return;
    }

    try {
      setLoading(true);
      
      const requestData = {
        studentSNumber: user.sNumber,
        studentName: user.name || user.sNumber,
        eventName: eventName.trim(),
        eventDate: eventDate.toISOString().split('T')[0],
        hoursRequested: hours.toString(),
        description: description.trim()
      };

      // Add photo information if uploaded successfully
      if (uploadedImageData && uploadedImageData.success) {
        requestData.photoUrl = uploadedImageData.fileUrl;
        requestData.photoDownloadUrl = uploadedImageData.downloadUrl;
        requestData.photoThumbnailUrl = uploadedImageData.thumbnailUrl;
        requestData.photoFileId = uploadedImageData.fileId;
        requestData.photoFileName = uploadedImageData.fileName;
        requestData.photoUploadedAt = uploadedImageData.uploadedAt;
        requestData.photoTargetFolder = uploadedImageData.targetFolder;
      }
      
      await submitHourRequest(requestData);
      
      // Show success message with photo status
      let photoMessage = '';
      if (uploadedImageData && uploadedImageData.success) {
        photoMessage = ` Your proof photo has been uploaded to Google Drive and linked to this request.`;
      } else if (image && !uploadedImageData?.success) {
        photoMessage = ` Note: Photo upload failed, but your request has been submitted successfully.`;
      }
        
      setSuccessDialog({
        visible: true,
        message: `Your request for ${hours} hours has been submitted successfully!${photoMessage}`
      });
      
      // Clear form
      setEventName('');
      setHoursRequested('');
      setDescription('');
      setImage(null);
      setUploadedImageData(null);
      
    } catch (error) {
      console.error('Failed to submit hour request:', error);
      setErrorDialog({
        visible: true,
        message: 'Failed to submit your request. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Date picker component
  const renderDatePicker = () => {
    if (!showDatePicker) return null;
    
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const years = Array.from({ length: 2 }, (_, i) => new Date().getFullYear() - i);
    
    return (
      <Modal
        transparent={true}
        visible={showDatePicker}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Event Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.pickerRow}>
              <Picker
                style={styles.picker}
                selectedValue={eventDate.getMonth()}
                onValueChange={(itemValue) => {
                  const newDate = new Date(eventDate);
                  newDate.setMonth(itemValue);
                  setEventDate(newDate);
                }}
              >
                {months.map((month, index) => (
                  <Picker.Item key={month} label={month} value={index} />
                ))}
              </Picker>
              
              <Picker
                style={styles.picker}
                selectedValue={eventDate.getDate()}
                onValueChange={(itemValue) => {
                  const newDate = new Date(eventDate);
                  newDate.setDate(itemValue);
                  setEventDate(newDate);
                }}
              >
                {days.map(day => (
                  <Picker.Item key={day} label={day.toString()} value={day} />
                ))}
              </Picker>
              
              <Picker
                style={styles.picker}
                selectedValue={eventDate.getFullYear()}
                onValueChange={(itemValue) => {
                  const newDate = new Date(eventDate);
                  newDate.setFullYear(itemValue);
                  setEventDate(newDate);
                }}
              >
                {years.map(year => (
                  <Picker.Item key={year} label={year.toString()} value={year} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Enhanced photo section with better status indicators
  const renderPhotoSection = () => (
    <View style={styles.formGroup}>
      <Text style={styles.label}>Upload Proof Photo (Optional)</Text>
      
      {!image ? (
        <TouchableOpacity
          style={styles.photoUploadButton}
          onPress={pickImage}
          disabled={uploadingImage}
        >
          <Ionicons name="camera" size={24} color="#59a2f0" />
          <Text style={styles.photoUploadText}>
            {uploadingImage ? 'Uploading...' : 'Select Photo'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.photoPreviewContainer}>
          <Image source={{ uri: image }} style={styles.photoPreview} />
          
          {uploadingImage && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color="#59a2f0" />
              <Text style={styles.uploadingText}>Uploading to Google Drive...</Text>
            </View>
          )}
          
          <View style={styles.photoActions}>
            <TouchableOpacity
              style={styles.photoActionButton}
              onPress={removeImage}
              disabled={uploadingImage}
            >
              <Ionicons name="trash" size={16} color="#e74c3c" />
              <Text style={styles.photoActionText}>Remove</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.photoActionButton}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              <Ionicons name="refresh" size={16} color="#59a2f0" />
              <Text style={styles.photoActionText}>Change</Text>
            </TouchableOpacity>
          </View>
          
          {uploadedImageData && !uploadingImage && (
            <View style={[
              styles.uploadStatus,
              { backgroundColor: uploadedImageData.success ? '#e8f5e8' : '#fff3cd' }
            ]}>
              <Ionicons 
                name={uploadedImageData.success ? "cloud-done" : "cloud-upload-outline"} 
                size={16} 
                color={uploadedImageData.success ? "#27ae60" : "#f39c12"} 
              />
              <Text style={styles.uploadStatusText}>
                {uploadedImageData.success
                  ? "✅ Uploaded to Google Drive successfully"
                  : "⚠️ Upload failed - saved locally"}
              </Text>
            </View>
          )}
        </View>
      )}
      
      <Text style={styles.helpText}>
        Photos are automatically uploaded to Google Drive (folder ID: 17Z64oFj5nolu4sQPYAcrdv7KvKKw967l) to help verify your volunteer work.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Request Hours</Text>
          </View>

          {/* Current Hours Display */}
          <View style={styles.currentHoursCard}>
            <Ionicons name="time-outline" size={32} color="#59a2f0" />
            <View style={styles.hoursInfo}>
              <Text style={styles.currentHoursLabel}>Your Current Hours</Text>
              <Text style={styles.currentHoursValue}>{currentHours.toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Submit Hour Request</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Event/Activity Name *</Text>
              <TextInput
                style={styles.input}
                value={eventName}
                onChangeText={setEventName}
                placeholder="e.g., Community Cleanup, Food Drive"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Event Date *</Text>
              <TouchableOpacity 
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text>{formatDate(eventDate)}</Text>
                <Ionicons name="calendar" size={20} color="#666" />
              </TouchableOpacity>
              {renderDatePicker()}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Hours Requested *</Text>
              <TextInput
                style={styles.input}
                value={hoursRequested}
                onChangeText={setHoursRequested}
                placeholder="e.g., 2.5"
                keyboardType="decimal-pad"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Description/Details *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe what you did during this volunteer activity..."
                multiline
                numberOfLines={4}
              />
            </View>
            
            {/* Enhanced Photo Upload Section */}
            {renderPhotoSection()}

            <TouchableOpacity
              style={[styles.submitButton, (loading || uploadingImage) && styles.disabledButton]}
              onPress={handleSubmitRequest}
              disabled={loading || uploadingImage}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Submitting Request...' : uploadingImage ? 'Uploading Photo...' : 'Submit Request'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.viewRequestsButton}
              onPress={() => navigation.navigate('HourRequests')}
            >
              <Text style={styles.viewRequestsText}>View My Requests</Text>
              <Ionicons name="chevron-forward" size={16} color="#59a2f0" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Dialog */}
      <ConfirmationDialog
        visible={successDialog.visible}
        title="Request Submitted!"
        message={successDialog.message}
        onCancel={() => setSuccessDialog({ visible: false, message: '' })}
        onConfirm={() => setSuccessDialog({ visible: false, message: '' })}
        cancelText=""
        confirmText="OK"
        icon="checkmark-circle"
        iconColor="#4CAF50"
      />

      {/* Error Dialog */}
      <ConfirmationDialog
        visible={errorDialog.visible}
        title="Error"
        message={errorDialog.message}
        onCancel={() => setErrorDialog({ visible: false, message: '' })}
        onConfirm={() => setErrorDialog({ visible: false, message: '' })}
        cancelText=""
        confirmText="OK"
        icon="alert-circle"
        iconColor="#ff4d4d"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#94cfec',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  currentHoursCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 10,
    padding: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  hoursInfo: {
    marginLeft: 15,
    flex: 1,
  },
  currentHoursLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  currentHoursValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#59a2f0',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    margin: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateTimeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  
  // Photo upload styles
  photoUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#59a2f0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  photoUploadText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#59a2f0',
    fontWeight: '500',
  },
  photoPreviewContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: 'white',
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  photoActionText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#59a2f0',
    fontWeight: '500',
  },
  uploadStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  uploadStatusText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  
  submitButton: {
    backgroundColor: '#59a2f0',
    padding: 15,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewRequestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderWidth: 1,
    borderColor: '#59a2f0',
    borderRadius: 4,
  },
  viewRequestsText: {
    color: '#59a2f0',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
  },
  
  // Modal Picker Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    backgroundColor: 'white',
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerCancel: {
    color: '#f54242',
    fontSize: 16,
  },
  pickerDone: {
    color: '#4287f5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  picker: {
    flex: 1,
    height: 200,
  },
});