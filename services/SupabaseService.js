// services/SupabaseService.js - FIXED VERSION
import { supabase } from '../supabase/supabaseClient';
import * as Crypto from 'expo-crypto';

class SupabaseService {
  
  /**
   * Test connection and log detailed information
   */
  static async testConnection() {
    try {
      console.log('🧪 Testing Supabase connection...');
      
      // Simple ping test
      const { data, error, status, statusText } = await supabase
        .from('students')
        .select('count')
        .limit(1);

      console.log('Response status:', status);
      console.log('Response statusText:', statusText);
      console.log('Response data:', data);
      console.log('Response error:', error);

      if (error) {
        console.error('❌ Supabase connection failed:', error);
        throw error;
      }

      console.log('✅ Supabase connection successful');
      return true;
    } catch (error) {
      console.error('❌ Connection test exception:', error);
      throw error;
    }
  }

  /**
   * Hash password securely
   */
  static async hashPassword(password) {
    try {
      const salt = Math.random().toString(36).substring(2, 15);
      const saltedPassword = password + salt;
      
      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        saltedPassword,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      
      return `${hashedPassword}:${salt}`;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against stored hash
   */
  static async verifyPassword(password, storedHash) {
    try {
      const [hash, salt] = storedHash.split(':');
      const saltedPassword = password + salt;
      
      const hashedInput = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        saltedPassword,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      
      return hashedInput === hash;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  // ========== STUDENT MANAGEMENT ==========

  /**
   * Get student by S-Number with better error handling
   */
  static async getStudent(sNumber) {
    try {
      console.log('🔍 Getting student:', sNumber);
      
      // Test connection first
      await this.testConnection();
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('s_number', sNumber.toLowerCase())
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors when not found

      if (error) {
        console.error('❌ Error getting student:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Found student:', data);
      } else {
        console.log('⚠️ Student not found:', sNumber);
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to get student:', error);
      throw error;
    }
  }

  /**
   * Get auth user with better error handling
   */
  static async getAuthUser(sNumber) {
    try {
      console.log('🔍 Getting auth user:', sNumber);
      
      const { data, error } = await supabase
        .from('auth_users')
        .select('*')
        .eq('s_number', sNumber.toLowerCase())
        .maybeSingle(); // Use maybeSingle instead of single

      if (error) {
        console.error('❌ Error getting auth user:', error);
        throw error;
      }

      if (data) {
        console.log('✅ Found auth user:', { id: data.id, s_number: data.s_number });
      } else {
        console.log('⚠️ Auth user not found:', sNumber);
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to get auth user:', error);
      throw error;
    }
  }

  /**
   * Create new student record
   */
  static async createStudent(studentData) {
    try {
      console.log('👤 Creating student:', studentData.sNumber);
      
      const { data, error } = await supabase
        .from('students')
        .insert([{
          s_number: studentData.sNumber.toLowerCase(),
          name: studentData.name,
          email: studentData.email || null,
          total_hours: studentData.totalHours || 0,
          account_status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating student:', error);
        throw error;
      }

      console.log('✅ Student created:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to create student:', error);
      throw error;
    }
  }

  /**
   * Update student data
   */
  static async updateStudent(sNumber, updateData) {
    try {
      console.log('📝 Updating student:', sNumber, updateData);
      
      const { data, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('s_number', sNumber.toLowerCase())
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating student:', error);
        throw error;
      }

      console.log('✅ Student updated:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to update student:', error);
      throw error;
    }
  }

  // ========== AUTHENTICATION ==========

  /**
   * Register student with improved flow
   */
  static async registerStudent(sNumber, password, name) {
    try {
      console.log('🚀 Starting registration for:', sNumber);

      // 1. Test connection first
      await this.testConnection();

      // 2. Check if student exists, if not create one
      let student = await this.getStudent(sNumber);
      if (!student) {
        console.log('👤 Student not found, creating new record...');
        student = await this.createStudent({
          sNumber: sNumber,
          name: name || sNumber,
          totalHours: 0
        });
      }

      // 3. Check if already has auth record
      const existingAuth = await this.getAuthUser(sNumber);
      if (existingAuth) {
        throw new Error('Account already exists. Please use the login page.');
      }

      // 4. Hash password
      console.log('🔐 Hashing password...');
      const passwordHash = await this.hashPassword(password);

      // 5. Create auth record
      console.log('🔑 Creating auth record...');
      const { data: authUser, error: authError } = await supabase
        .from('auth_users')
        .insert([{
          s_number: sNumber.toLowerCase(),
          password_hash: passwordHash
        }])
        .select()
        .single();

      if (authError) {
        console.error('❌ Error creating auth record:', authError);
        throw authError;
      }

      console.log('✅ Auth record created:', { id: authUser.id, s_number: authUser.s_number });

      // 6. Update student status
      await this.updateStudent(sNumber, {
        name: name || student.name,
        account_status: 'active',
        account_created: new Date().toISOString()
      });

      console.log('✅ Registration completed successfully for:', sNumber);

      return {
        success: true,
        user: {
          id: student.id,
          sNumber: sNumber.toLowerCase(),
          name: name || student.name,
          role: 'student'
        }
      };
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  }

  /**
   * Login student with improved flow
   */
  static async loginStudent(sNumber, password) {
    try {
      console.log('🚀 Starting login for:', sNumber);

      // 1. Test connection first
      await this.testConnection();

      // 2. Get auth record
      const authUser = await this.getAuthUser(sNumber);
      if (!authUser) {
        throw new Error('No account found. Please register first.');
      }

      // 3. Verify password
      console.log('🔐 Verifying password...');
      const isValidPassword = await this.verifyPassword(password, authUser.password_hash);
      if (!isValidPassword) {
        throw new Error('Incorrect password.');
      }

      // 4. Get student data
      const student = await this.getStudent(sNumber);
      if (!student) {
        throw new Error('Student record not found.');
      }

      // 5. Update last login
      await this.updateStudent(sNumber, {
        last_login: new Date().toISOString()
      });

      console.log('✅ Login successful for:', sNumber);

      return {
        success: true,
        user: {
          id: student.id,
          sNumber: sNumber.toLowerCase(),
          name: student.name,
          role: student.role || 'student',
          totalHours: student.total_hours
        }
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  static async changePassword(sNumber, oldPassword, newPassword) {
    try {
      // 1. Get auth record
      const authUser = await this.getAuthUser(sNumber);
      if (!authUser) {
        throw new Error('Account not found');
      }

      // 2. Verify old password
      const isValidOldPassword = await this.verifyPassword(oldPassword, authUser.password_hash);
      if (!isValidOldPassword) {
        throw new Error('Current password is incorrect');
      }

      // 3. Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // 4. Update password
      const { error } = await supabase
        .from('auth_users')
        .update({ password_hash: newPasswordHash })
        .eq('s_number', sNumber.toLowerCase());

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  }

  /**
   * Reset password (admin function)
   */
  static async resetPassword(sNumber, newPassword) {
    try {
      const newPasswordHash = await this.hashPassword(newPassword);

      const { error } = await supabase
        .from('auth_users')
        .update({ password_hash: newPasswordHash })
        .eq('s_number', sNumber.toLowerCase());

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  // ========== EVENTS MANAGEMENT ==========

  /**
   * Get all events with better error handling
   */
  static async getAllEvents() {
    try {
      console.log('📅 Getting all events...');
      
      // Simple query first - don't try to join tables if they might not exist
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date');

      if (error) {
        console.error('❌ Error getting events:', error);
        throw error;
      }
      
      console.log(`✅ Found ${data?.length || 0} events`);
      
      // Transform data to match existing structure
      return (data || []).map(event => ({
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        date: event.event_date,
        startTime: event.start_time,
        endTime: event.end_time,
        capacity: event.capacity,
        color: event.color,
        attendees: [], // We'll load these separately if needed
        createdBy: event.created_by,
        createdAt: event.created_at
      }));
    } catch (error) {
      console.error('Error getting events:', error);
      throw error;
    }
  }

  /**
   * Create event
   */
  static async createEvent(eventData) {
    try {
      console.log('📅 Creating event:', eventData.title);
      
      const { data, error } = await supabase
        .from('events')
        .insert([{
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          event_date: eventData.date,
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          capacity: eventData.capacity,
          color: eventData.color,
          created_by: eventData.createdBy || 'Admin'
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating event:', error);
        throw error;
      }
      
      console.log('✅ Event created:', data);
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  // ========== HOUR REQUESTS ==========

  /**
   * Submit hour request
   */
  static async submitHourRequest(requestData) {
    try {
      console.log('⏰ Submitting hour request...');
      
      const { data, error } = await supabase
        .from('hour_requests')
        .insert([{
          student_s_number: requestData.studentSNumber,
          student_name: requestData.studentName,
          event_name: requestData.eventName,
          event_date: requestData.eventDate,
          hours_requested: requestData.hoursRequested,
          description: requestData.description
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error submitting hour request:', error);
        throw error;
      }
      
      console.log('✅ Hour request submitted:', data);
      return data;
    } catch (error) {
      console.error('Error submitting hour request:', error);
      throw error;
    }
  }

  /**
   * Get hour requests for student
   */
  static async getStudentHourRequests(sNumber) {
    try {
      const { data, error } = await supabase
        .from('hour_requests')
        .select('*')
        .eq('student_s_number', sNumber.toLowerCase())
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting student hour requests:', error);
      throw error;
    }
  }

  /**
   * Get all hour requests (admin)
   */
  static async getAllHourRequests() {
    try {
      const { data, error } = await supabase
        .from('hour_requests')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all hour requests:', error);
      throw error;
    }
  }

  /**
   * Update hour request status
   */
  static async updateHourRequestStatus(requestId, status, adminNotes = '', reviewedBy = 'Admin') {
    try {
      // 1. Update request status
      const { data: request, error: updateError } = await supabase
        .from('hour_requests')
        .update({
          status: status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy,
          admin_notes: adminNotes
        })
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) throw updateError;

      // 2. If approved, update student's total hours
      if (status === 'approved') {
        const student = await this.getStudent(request.student_s_number);
        if (student) {
          const newTotalHours = parseFloat(student.total_hours || 0) + parseFloat(request.hours_requested);
          await this.updateStudent(request.student_s_number, {
            total_hours: newTotalHours,
            last_hour_update: new Date().toISOString()
          });
        }
      }

      return request;
    } catch (error) {
      console.error('Error updating hour request status:', error);
      throw error;
    }
  }

  // ========== SUPPORT QUESTIONS ==========

  /**
   * Submit support question
   */
  static async submitSupportQuestion(questionData) {
    try {
      const { data, error } = await supabase
        .from('support_questions')
        .insert([{
          name: questionData.name,
          s_number: questionData.sNumber,
          subject: questionData.subject,
          message: questionData.message,
          user_type: questionData.userType || 'student'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error submitting support question:', error);
      throw error;
    }
  }

  /**
   * Get all support questions (admin)
   */
  static async getAllSupportQuestions() {
    try {
      const { data, error } = await supabase
        .from('support_questions')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting support questions:', error);
      throw error;
    }
  }
}

export default SupabaseService;