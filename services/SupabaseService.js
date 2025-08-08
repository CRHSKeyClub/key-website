// services/SupabaseService.js - UPDATED with all missing methods
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
          authId: authUser.id, // UUID from auth_users
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
          authId: authUser.id, // UUID from auth_users for relations
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
   * Get all events WITH attendees - FIXED VERSION
   */
  static async getAllEvents() {
    try {
      console.log('📅 Getting all events with attendees...');
      
      // Step 1: Get all events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('event_date');

      if (eventsError) {
        console.error('❌ Error getting events:', eventsError);
        throw eventsError;
      }
      
      console.log(`✅ Found ${eventsData?.length || 0} events`);
      
      if (!eventsData || eventsData.length === 0) {
        return [];
      }

      // Step 2: Get all attendees for all events in one query
      const eventIds = eventsData.map(event => event.id);
      
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('event_attendees')
        .select('*')
        .in('event_id', eventIds)
        .order('registered_at');

      if (attendeesError) {
        console.error('❌ Error getting attendees:', attendeesError);
        // Don't throw here - we can still return events without attendees
        console.warn('⚠️ Continuing without attendees data');
      }

      console.log(`✅ Found ${attendeesData?.length || 0} total attendees across all events`);

      // Step 2.5: Resolve sNumbers in batch via auth_users lookup (using student_id UUIDs)
      let authUserMap = {};
      if (attendeesData && attendeesData.length > 0) {
        const uniqueStudentIds = Array.from(
          new Set(
            attendeesData
              .map(a => a.student_id)
              .filter(id => typeof id === 'string' && id.length > 0)
          )
        );
        if (uniqueStudentIds.length > 0) {
          const { data: authUsers, error: authErr } = await supabase
            .from('auth_users')
            .select('id, s_number')
            .in('id', uniqueStudentIds);
          if (!authErr && authUsers) {
            authUserMap = authUsers.reduce((map, au) => {
              map[au.id] = au.s_number;
              return map;
            }, {});
          } else if (authErr) {
            console.warn('⚠️ Could not resolve auth users for attendees:', authErr.message);
          }
        }
      }

      // Step 3: Group attendees by event_id (with sNumber when available)
      const attendeesByEvent = {};
      if (attendeesData) {
        attendeesData.forEach(attendee => {
          if (!attendeesByEvent[attendee.event_id]) {
            attendeesByEvent[attendee.event_id] = [];
          }
          attendeesByEvent[attendee.event_id].push({
            id: attendee.id,
            name: attendee.name,
            email: attendee.email,
            sNumber: authUserMap[attendee.student_id] || null,
            studentId: attendee.student_id,
            registeredAt: attendee.registered_at
          });
        });
      }

      // Step 4: Transform events and attach attendees
      const eventsWithAttendees = eventsData.map(event => {
        const eventAttendees = attendeesByEvent[event.id] || [];
        
        console.log(`Event "${event.title}": ${eventAttendees.length} attendees`);
        
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          location: event.location,
          date: event.event_date,
          startTime: event.start_time,
          endTime: event.end_time,
          capacity: event.capacity,
          color: event.color,
          attendees: eventAttendees, // includes attendees for counts in public view
          createdBy: event.created_by,
          createdAt: event.created_at
        };
      });

      console.log('✅ Events loaded with attendees successfully');
      return eventsWithAttendees;
      
    } catch (error) {
      console.error('❌ Error getting events:', error);
      throw error;
    }
  }

  /**
   * Get single event with attendees
   */
  static async getEventById(eventId) {
    try {
      console.log('📅 Getting event by ID with attendees:', eventId);
      
      // Get the event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        console.error('❌ Error getting event:', eventError);
        throw eventError;
      }

      if (!eventData) {
        return null;
      }

      // Get attendees for this event
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('event_id', eventId)
        .order('registered_at');

      if (attendeesError) {
        console.error('❌ Error getting attendees for event:', attendeesError);
        // Continue without attendees rather than failing
      }

      // Resolve sNumbers from auth_users using student_id UUIDs
      let sNumberByStudentId = {};
      if (attendeesData && attendeesData.length > 0) {
        const uniqueStudentIds = Array.from(new Set(
          attendeesData
            .map(a => a.student_id)
            .filter(id => typeof id === 'string' && id.length > 0)
        ));
        if (uniqueStudentIds.length > 0) {
          const { data: authUsers, error: authErr } = await supabase
            .from('auth_users')
            .select('id, s_number')
            .in('id', uniqueStudentIds);
          if (!authErr && authUsers) {
            sNumberByStudentId = authUsers.reduce((acc, au) => {
              acc[au.id] = au.s_number;
              return acc;
            }, {});
          } else if (authErr) {
            console.warn('⚠️ Could not resolve auth users for single event:', authErr.message);
          }
        }
      }

      const attendees = (attendeesData || []).map(attendee => ({
        id: attendee.id,
        name: attendee.name,
        email: attendee.email,
        sNumber: sNumberByStudentId[attendee.student_id] || null,
        studentId: attendee.student_id,
        registeredAt: attendee.registered_at
      }));

      console.log(`✅ Found event "${eventData.title}" with ${attendees.length} attendees`);

      return {
        id: eventData.id,
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        date: eventData.event_date,
        startTime: eventData.start_time,
        endTime: eventData.end_time,
        capacity: eventData.capacity,
        color: eventData.color,
        attendees: attendees,
        createdBy: eventData.created_by,
        createdAt: eventData.created_at
      };
      
    } catch (error) {
      console.error('❌ Error getting event by ID:', error);
      throw error;
    }
  }

  /**
   * Create new event - MISSING METHOD ADDED
   */
  static async createEvent(eventData) {
    try {
      console.log('➕ Creating new event:', eventData.title);
      
      const { data, error } = await supabase
        .from('events')
        .insert([{
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          event_date: eventData.date,
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          capacity: parseInt(eventData.capacity),
          color: eventData.color || '#4287f5',
          created_by: eventData.createdBy || 'admin',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating event:', error);
        throw error;
      }

      console.log('✅ Event created successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to create event:', error);
      throw error;
    }
  }

  /**
   * Update existing event - MISSING METHOD ADDED
   */
  static async updateEvent(eventId, eventData) {
    try {
      console.log('📝 Updating event:', eventId);
      
      const { data, error } = await supabase
        .from('events')
        .update({
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          event_date: eventData.date,
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          capacity: parseInt(eventData.capacity),
          color: eventData.color || '#4287f5',
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating event:', error);
        throw error;
      }

      console.log('✅ Event updated successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to update event:', error);
      throw error;
    }
  }

  /**
   * Delete event - MISSING METHOD ADDED
   */
  static async deleteEvent(eventId) {
    try {
      console.log('🗑️ Deleting event:', eventId);
      
      // First, delete all attendees for this event
      console.log('🗑️ Deleting event attendees...');
      const { error: attendeesError } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId);

      if (attendeesError) {
        console.error('❌ Error deleting event attendees:', attendeesError);
        throw attendeesError;
      }

      // Then delete the event itself
      console.log('🗑️ Deleting event record...');
      const { data, error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error deleting event:', error);
        throw error;
      }

      console.log('✅ Event deleted successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to delete event:', error);
      throw error;
    }
  }

  /**
   * Sign up for event - UPDATED TO USE STUDENT_ID
   */
  static async signupForEvent(eventId, attendeeData) {
    try {
      console.log('✍️ Signing up for event:', eventId, attendeeData);
      
      // Try to resolve auth user's UUID for student_id
      let studentUuid = null;
      if (attendeeData.sNumber) {
        const auth = await this.getAuthUser(attendeeData.sNumber);
        if (auth && auth.id) {
          studentUuid = auth.id; // UUID from auth_users
        }
      }
      
      // Check if already registered (by student_id if available, otherwise by email)
      let existingAttendee = null;
      // Check by student_id if available (UUID)
      if (studentUuid) {
        const { data: existingByStudentId, error: checkError1 } = await supabase
          .from('event_attendees')
          .select('id, email')
          .eq('event_id', eventId)
          .eq('student_id', studentUuid)
          .maybeSingle();

        if (checkError1) {
          console.error('❌ Error checking existing attendee by student_id:', checkError1);
          throw checkError1;
        }
        if (existingByStudentId) existingAttendee = existingByStudentId;
      }

      // If not found by student_id, check by email as fallback
      if (!existingAttendee && attendeeData.email) {
        const { data: existingByEmail, error: checkError2 } = await supabase
          .from('event_attendees')
          .select('id, email')
          .eq('event_id', eventId)
          .eq('email', attendeeData.email)
          .maybeSingle();

        if (checkError2) {
          console.error('❌ Error checking existing attendee by email:', checkError2);
          throw checkError2;
        }
        
        if (existingByEmail) {
          existingAttendee = existingByEmail;
        }
      }

      if (existingAttendee) {
        throw new Error('You are already registered for this event');
      }

      // Check event capacity
      const event = await this.getEventById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      if (event.attendees && event.attendees.length >= event.capacity) {
        throw new Error('Event is at full capacity');
      }

      // Prepare attendee data
      const attendeeInsertData = {
        event_id: eventId,
        name: attendeeData.name,
        email: attendeeData.email,
        registered_at: new Date().toISOString()
      };
      // Include student_id when we have a UUID
      if (studentUuid) attendeeInsertData.student_id = studentUuid;

      // Add attendee
      const { data, error } = await supabase
        .from('event_attendees')
        .insert([attendeeInsertData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error signing up for event:', error);
        throw error;
      }

      console.log('✅ Successfully signed up for event:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to sign up for event:', error);
      throw error;
    }
  }

  /**
   * Get attendees for a specific event
   */
  static async getEventAttendees(eventId) {
    try {
      console.log('👥 Getting attendees for event:', eventId);
      
      const { data: attendeesData, error } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('event_id', eventId)
        .order('registered_at', { ascending: true });

      if (error) {
        console.error('❌ Error getting event attendees:', error);
        throw error;
      }

      // Join to students to expose s_number in public events modal
      const attendees = (attendeesData || []).map(attendee => ({
        id: attendee.id,
        name: attendee.name,
        email: attendee.email,
        sNumber: attendee.s_number,
        studentId: attendee.student_id,
        registeredAt: attendee.registered_at
      }));

      console.log(`✅ Found ${attendees.length} attendees for event ${eventId}`);
      return attendees;
    } catch (error) {
      console.error('❌ Failed to get event attendees:', error);
      throw error;
    }
  }

  /**
   * Find a user's registration for an event using student UUID (auth_users.id) or email
   */
  static async findEventRegistration(eventId, sNumber = null, email = null) {
    try {
      // 1) Try by student_id via auth_users UUID
      if (sNumber) {
        const auth = await this.getAuthUser(sNumber);
        if (auth && auth.id) {
          const { data, error } = await supabase
            .from('event_attendees')
            .select('*')
            .eq('event_id', eventId)
            .eq('student_id', auth.id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }
          if (data) {
            return {
              id: data.id,
              name: data.name,
              email: data.email,
              studentId: data.student_id,
              registeredAt: data.registered_at,
            };
          }
        }
      }

      // 2) Fallback by email
      if (email) {
        const { data, error } = await supabase
          .from('event_attendees')
          .select('*')
          .eq('event_id', eventId)
          .eq('email', email)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        if (data) {
          return {
            id: data.id,
            name: data.name,
            email: data.email,
            studentId: data.student_id,
            registeredAt: data.registered_at,
          };
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error finding event registration:', error);
      throw error;
    }
  }

  /**
   * Unregister from an event - UPDATED TO USE STUDENT_ID
   */
  static async unregisterFromEvent(eventId, email, sNumber = null) {
    try {
      console.log('🚫 Unregistering from event:', eventId, email, sNumber);
      
      let studentId = null;
      
      // Resolve UUID from auth_users if possible
      if (sNumber) {
        const auth = await this.getAuthUser(sNumber);
        if (auth && auth.id) {
          studentId = auth.id;
          console.log('🔗 Using auth user UUID for unregister student_id:', studentId);
        } else {
          const student = await this.getStudent(sNumber);
          if (student && typeof student.id === 'string' && student.id.includes('-')) {
            studentId = student.id;
            console.log('👤 Using student UUID for unregister student_id:', studentId);
          }
        }
      }
      
      let deleteQuery = supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId);
      
      // Try to delete by student_id first if available
      if (studentId) {
        deleteQuery = deleteQuery.eq('student_id', studentId);
      } else {
        // Fallback to email
        deleteQuery = deleteQuery.eq('email', email);
      }
      
      const { error } = await deleteQuery;

      if (error) {
        console.error('❌ Error unregistering from event:', error);
        throw error;
      }

      console.log('✅ Successfully unregistered from event');
      return true;
    } catch (error) {
      console.error('❌ Failed to unregister from event:', error);
      throw error;
    }
  }

  // ========== HOUR REQUESTS ==========

  /**
   * Submit hour request with optional image filename
   */
  static async submitHourRequest(requestData) {
    try {
      console.log('⏰ Submitting hour request to Supabase...');
      console.log('📋 Request data:', {
        studentSNumber: requestData.studentSNumber,
        eventName: requestData.eventName,
        hoursRequested: requestData.hoursRequested,
        hasImage: !!requestData.imageName
      });
      
      // Prepare the data for insertion
      const insertData = {
        student_s_number: requestData.studentSNumber.toLowerCase(),
        student_name: requestData.studentName,
        event_name: requestData.eventName,
        event_date: requestData.eventDate,
        hours_requested: parseFloat(requestData.hoursRequested),
        description: requestData.description,
        status: 'pending', // Default status
        submitted_at: new Date().toISOString()
      };
      
      // Add image filename if available (just the filename, not URLs)
      if (requestData.imageName) {
        insertData.image_name = requestData.imageName;
      }
      
      // Note: Image data processing skipped - database doesn't have image_data column
      console.log('📎 Image data processing skipped - using filename only');
      
      console.log('💾 Inserting hour request into database...');
      
      const { data, error } = await supabase
        .from('hour_requests')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error submitting hour request:', error);
        console.error('❌ Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('✅ Hour request submitted successfully:', {
        id: data.id,
        status: data.status,
        student: data.student_s_number,
        hours: data.hours_requested,
        imageName: data.image_name
      });
      
      return data;
    } catch (error) {
      console.error('❌ Error submitting hour request:', error);
      
      // Provide more specific error messages
      if (error.code === '23505') {
        throw new Error('Duplicate request detected. Please check if this request was already submitted.');
      } else if (error.code === '23503') {
        throw new Error('Student not found in system. Please contact your Key Club sponsor.');
      } else if (error.message.includes('permission')) {
        throw new Error('Database permission error. Please contact support.');
      } else {
        throw new Error(`Failed to submit hour request: ${error.message}`);
      }
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
  static async updateHourRequestStatus(requestId, status, adminNotes = '', reviewedBy = 'Admin', hoursRequested = null) {
    try {
      console.log('🔄 Starting hour request status update:', { requestId, status, adminNotes, reviewedBy, hoursRequested });
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

      if (updateError) {
        console.error('❌ Error updating request status:', updateError);
        throw updateError;
      }

      console.log('✅ Request status updated successfully:', request);
      const normalizedStatus = (status || '').toString().trim().toLowerCase();
      console.log('🔔 Status value received:', status, '| Normalized:', normalizedStatus);
      if (normalizedStatus === 'approved') {
        console.log('📝 Full request object at approval:', request);
        if (!request) {
          console.error('❌ No request object found after update!');
          return request;
        }
        const studentSNumber = request.student_s_number || request.s_number;
        if (!studentSNumber) {
          console.error('❌ No student S-number found in request:', request);
          return request;
        }
        const student = await this.getStudent(studentSNumber);
        console.log('👤 Current student data:', student);
        if (student) {
          const currentHours = parseFloat(student.total_hours || 0);
          let requestedHours = hoursRequested !== null ? parseFloat(hoursRequested) : parseFloat(request.hours_requested);
          console.log('🧪 Type of requestedHours:', typeof requestedHours, 'Value:', requestedHours);
          if (isNaN(requestedHours) || requestedHours <= 0) {
            console.error('❌ Invalid or missing hours_requested in request:', request);
            return request;
          }
          const newTotalHours = currentHours + requestedHours;
          console.log('📊 Hours calculation:', {
            currentHours,
            requestedHours,
            newTotalHours
          });
          const updateResult = await this.updateStudent(studentSNumber, {
            total_hours: newTotalHours,
            last_hour_update: new Date().toISOString()
          });
          console.log('✅ Student hours updated successfully:', updateResult);
        } else {
          console.error('❌ Student not found:', studentSNumber);
        }
      } else {
        console.warn('⚠️ Approval logic skipped: status was not "approved" (got:', status, ')');
      }

      return request;
    } catch (error) {
      console.error('❌ Error updating hour request status:', error);
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

  /**
   * Update support question (admin response)
   */
  static async updateSupportQuestion(questionId, updateData) {
    try {
      console.log('📝 Updating support question:', questionId, updateData);
      
      const { data, error } = await supabase
        .from('support_questions')
        .update(updateData)
        .eq('id', questionId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating support question:', error);
        throw error;
      }
      
      console.log('✅ Support question updated:', data);
      return data;
    } catch (error) {
      console.error('Error updating support question:', error);
      throw error;
    }
  }

  /**
   * Reset student password (corrected for your actual table structure)
   */
  static async resetStudentPassword(sNumber, newPassword) {
    try {
      console.log('🔒 Starting password reset for:', sNumber);
      
      // 1. Validate inputs
      if (!sNumber || !newPassword) {
        throw new Error('S-Number and password are required');
      }
      
      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      // 2. Check if student exists
      console.log('🔍 Checking if student exists...');
      const student = await this.getStudent(sNumber);
      if (!student) {
        console.error('❌ Student not found:', sNumber);
        throw new Error('Student not found in system');
      }
      console.log('✅ Student found:', student.s_number);

      // 3. Check if auth user exists
      console.log('🔍 Checking if auth user exists...');
      const authUser = await this.getAuthUser(sNumber);
      if (!authUser) {
        console.error('❌ Auth user not found:', sNumber);
        throw new Error('No account found for this S-Number');
      }
      console.log('✅ Auth user found:', authUser.s_number);

      // 4. Hash the new password
      console.log('🔐 Hashing new password...');
      const newPasswordHash = await this.hashPassword(newPassword);
      console.log('✅ Password hashed successfully');

      // 5. Update the password using your actual table columns
      console.log('💾 Updating password in database...');
      
      const { data: updateData, error: updateError } = await supabase
        .from('auth_users')
        .update({ 
          password_hash: newPasswordHash,
          updated_at: new Date().toISOString() // Use your existing updated_at column
        })
        .eq('s_number', sNumber.toLowerCase())
        .select();

      if (updateError) {
        console.error('❌ Database update error details:', {
          error: updateError,
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log('✅ Password updated in database:', updateData);

      // 6. Update student record to track password reset (optional)
      console.log('📝 Updating student record...');
      try {
        await this.updateStudent(sNumber, {
          last_password_reset: new Date().toISOString(),
          account_status: 'active'
        });
        console.log('✅ Student record updated');
      } catch (studentUpdateError) {
        console.warn('⚠️ Student record update failed (non-critical):', studentUpdateError);
        // Don't throw here - password was already updated successfully
      }

      console.log('✅ Password reset completed successfully for:', sNumber);

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      console.error('❌ Password reset failed:', {
        error: error,
        message: error.message,
        stack: error.stack,
        sNumber: sNumber
      });
      
      // Re-throw with more specific error message
      if (error.message.includes('Database update failed')) {
        throw error;
      } else if (error.message.includes('not found')) {
        throw error;
      } else {
        throw new Error(`Password reset failed: ${error.message}`);
      }
    }
  }

  /**
   * Alternative minimal version if you prefer simplicity
   */
  static async resetStudentPasswordSimple(sNumber, newPassword) {
    try {
      console.log('🔒 Resetting password for:', sNumber);
      
      // Hash password
      const newPasswordHash = await this.hashPassword(newPassword);
      
      // Update password and timestamp
      const { data, error } = await supabase
        .from('auth_users')
        .update({ 
          password_hash: newPasswordHash,
          updated_at: new Date().toISOString()
        })
        .eq('s_number', sNumber.toLowerCase())
        .select();

      if (error) {
        console.error('Update error:', error);
        throw new Error(`Failed to update password: ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error('No user found with that S-Number');
      }

      console.log('✅ Password updated successfully');
      return { success: true, message: 'Password reset successfully' };
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Get all students (admin)
   */
  static async getAllStudents() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return { data };
    } catch (error) {
      console.error('❌ Error getting all students:', error);
      return { data: [], error };
    }
  }

  // ========== MEETING MANAGEMENT ==========

  /**
   * Generate a random attendance code
   */
  static generateAttendanceCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get all meetings for the current school year
   */
  static async getAllMeetings() {
    try {
      console.log('📅 Getting all meetings...');
      
      const { data: meetings, error } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false });

      if (error) {
        console.error('❌ Error getting meetings:', error);
        throw error;
      }

      console.log(`✅ Found ${meetings?.length || 0} meetings`);
      return meetings || [];
    } catch (error) {
      console.error('❌ Error getting meetings:', error);
      throw error;
    }
  }

  /**
   * Get meeting by ID
   */
  static async getMeetingById(meetingId) {
    try {
      console.log('📅 Getting meeting by ID:', meetingId);
      
      const { data: meeting, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (error) {
        console.error('❌ Error getting meeting:', error);
        throw error;
      }

      return meeting;
    } catch (error) {
      console.error('❌ Error getting meeting by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new meeting
   */
  static async createMeeting(meetingData) {
    try {
      console.log('📅 Creating new meeting...');
      
      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert([{
          meeting_date: meetingData.meetingDate,
          meeting_type: meetingData.meetingType, // 'morning' or 'afternoon'
          attendance_code: meetingData.attendanceCode,
          is_open: meetingData.isOpen || false,
          created_by: meetingData.createdBy,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating meeting:', error);
        throw error;
      }

      console.log('✅ Meeting created successfully:', meeting);
      return meeting;
    } catch (error) {
      console.error('❌ Error creating meeting:', error);
      throw error;
    }
  }

  /**
   * Update meeting (open/close attendance, change code, etc.)
   */
  static async updateMeeting(meetingId, updateData) {
    try {
      console.log('📅 Updating meeting:', meetingId);
      
      const { data: meeting, error } = await supabase
        .from('meetings')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', meetingId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating meeting:', error);
        throw error;
      }

      console.log('✅ Meeting updated successfully:', meeting);
      return meeting;
    } catch (error) {
      console.error('❌ Error updating meeting:', error);
      throw error;
    }
  }

  /**
   * Delete a meeting
   */
  static async deleteMeeting(meetingId) {
    try {
      console.log('🗑️ Deleting meeting:', meetingId);
      
      // First, let's check if the meeting exists
      const { data: existingMeeting, error: checkError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (checkError) {
        console.error('❌ Error checking if meeting exists:', checkError);
        throw new Error(`Meeting not found: ${checkError.message}`);
      }

      console.log('✅ Meeting exists:', existingMeeting);
      
      // First delete related attendance records
      console.log('🗑️ Deleting attendance records for meeting:', meetingId);
      const { data: attendanceData, error: attendanceError, count: attendanceCount } = await supabase
        .from('meeting_attendance')
        .delete()
        .eq('meeting_id', meetingId)
        .select();

      if (attendanceError) {
        console.error('❌ Error deleting attendance records:', attendanceError);
        throw attendanceError;
      }

      console.log('✅ Attendance records deleted successfully:', attendanceData);
      console.log('📊 Attendance records deleted count:', attendanceCount);
      
      // Then delete the meeting
      console.log('🗑️ Deleting meeting record:', meetingId);
      const { data: meetingData, error: meetingError, count: meetingCount } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId)
        .select();

      if (meetingError) {
        console.error('❌ Error deleting meeting:', meetingError);
        throw meetingError;
      }

      console.log('✅ Meeting deleted successfully:', meetingData);
      console.log('📊 Meeting records deleted count:', meetingCount);
      
      // Verify deletion
      const { data: verifyMeeting, error: verifyError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (verifyError && verifyError.code === 'PGRST116') {
        console.log('✅ Verification: Meeting successfully deleted (not found)');
      } else if (verifyMeeting) {
        console.warn('⚠️ Verification: Meeting still exists after deletion attempt');
        throw new Error('Meeting still exists after deletion attempt');
      }

      return true;
    } catch (error) {
      console.error('❌ Error deleting meeting:', error);
      throw error;
    }
  }

  /**
   * Get attendance for a specific meeting
   */
  static async getMeetingAttendance(meetingId) {
    try {
      console.log('📊 Getting attendance for meeting:', meetingId);
      
      // First get the attendance records
      const { data: attendance, error } = await supabase
        .from('meeting_attendance')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('submitted_at');

      if (error) {
        console.error('❌ Error getting meeting attendance:', error);
        throw error;
      }

      // Then get student names for each attendance record
      const attendanceWithNames = await Promise.all(
        (attendance || []).map(async (record) => {
          try {
            const { data: student, error: studentError } = await supabase
              .from('students')
              .select('name, s_number')
              .eq('s_number', record.student_s_number)
              .single();

            if (studentError) {
              console.warn(`⚠️ Could not find student for ${record.student_s_number}:`, studentError);
              return {
                ...record,
                students: {
                  name: 'Unknown Student',
                  s_number: record.student_s_number
                }
              };
            }

            return {
              ...record,
              students: student
            };
          } catch (error) {
            console.warn(`⚠️ Error getting student info for ${record.student_s_number}:`, error);
            return {
              ...record,
              students: {
                name: 'Unknown Student',
                s_number: record.student_s_number
              }
            };
          }
        })
      );

      console.log(`✅ Found ${attendanceWithNames.length} attendance records`);
      return attendanceWithNames;
    } catch (error) {
      console.error('❌ Error getting meeting attendance:', error);
      throw error;
    }
  }

  /**
   * Get open meetings for students
   */
  static async getOpenMeetings() {
    try {
      console.log('📅 Getting open meetings...');
      
      const { data: meetings, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('is_open', true)
        .order('meeting_date', { ascending: false });

      if (error) {
        console.error('❌ Error getting open meetings:', error);
        throw error;
      }

      console.log(`✅ Found ${meetings?.length || 0} open meetings`);
      return meetings || [];
    } catch (error) {
      console.error('❌ Error getting open meetings:', error);
      throw error;
    }
  }

  /**
   * Get student's attendance history
   */
  static async getStudentAttendanceHistory(studentSNumber) {
    try {
      console.log('📊 Getting attendance history for student:', studentSNumber);
      
      // First get the attendance records
      const { data: attendance, error } = await supabase
        .from('meeting_attendance')
        .select('*')
        .eq('student_s_number', studentSNumber.toLowerCase())
        .order('submitted_at');

      if (error) {
        console.error('❌ Error getting student attendance:', error);
        throw error;
      }

      // Then get meeting info for each attendance record
      const attendanceWithMeetings = await Promise.all(
        (attendance || []).map(async (record) => {
          try {
            const { data: meeting, error: meetingError } = await supabase
              .from('meetings')
              .select('meeting_date, meeting_type, is_open')
              .eq('id', record.meeting_id)
              .single();

            if (meetingError) {
              console.warn(`⚠️ Could not find meeting for ${record.meeting_id}:`, meetingError);
              return {
                ...record,
                meetings: {
                  meeting_date: 'Unknown Date',
                  meeting_type: 'unknown',
                  is_open: false
                }
              };
            }

            return {
              ...record,
              meetings: meeting
            };
          } catch (error) {
            console.warn(`⚠️ Error getting meeting info for ${record.meeting_id}:`, error);
            return {
              ...record,
              meetings: {
                meeting_date: 'Unknown Date',
                meeting_type: 'unknown',
                is_open: false
              }
            };
          }
        })
      );

      console.log(`✅ Found ${attendanceWithMeetings.length} attendance records for student`);
      return attendanceWithMeetings;
    } catch (error) {
      console.error('❌ Error getting student attendance:', error);
      throw error;
    }
  }

  /**
   * Get student's attendance records (alias for getStudentAttendanceHistory)
   */
  static async getStudentAttendance(studentSNumber) {
    return this.getStudentAttendanceHistory(studentSNumber);
  }

  /**
   * Get student's missed meetings count
   */
  static async getStudentMissedMeetings(studentSNumber) {
    try {
      console.log('📊 Getting missed meetings for student:', studentSNumber);
      
      // Get all meetings for the current school year
      const allMeetings = await this.getAllMeetings();
      
      // Get student's attendance
      const studentAttendance = await this.getStudentAttendance(studentSNumber);
      
      // Find meetings where student didn't attend AND the meeting date has passed
      const attendedMeetingIds = studentAttendance.map(a => a.meeting_id);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      
      const missedMeetings = allMeetings.filter(meeting => {
        const meetingDate = new Date(meeting.meeting_date);
        meetingDate.setHours(0, 0, 0, 0);
        
        // Only count as missed if:
        // 1. Student didn't attend
        // 2. Meeting date has passed
        return !attendedMeetingIds.includes(meeting.id) && meetingDate < today;
      });

      console.log(`✅ Student missed ${missedMeetings.length} meetings (only counting past meetings)`);
      return missedMeetings;
    } catch (error) {
      console.error('❌ Error getting missed meetings:', error);
      throw error;
    }
  }

  /**
   * Submit attendance for a meeting
   */
  static async submitAttendance(meetingId, studentSNumber, attendanceCode, sessionType = 'both') {
    try {
      console.log('✅ Submitting attendance for meeting:', meetingId);
      console.log('👤 Student:', studentSNumber);
      console.log('🔑 Code:', attendanceCode);
      console.log('⏰ Session:', sessionType);
      
      // First, verify the meeting exists and is open
      const meeting = await this.getMeetingById(meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }
      
      if (!meeting.is_open) {
        throw new Error('Attendance submission is closed for this meeting');
      }
      
      if (meeting.attendance_code !== attendanceCode) {
        throw new Error('Invalid attendance code');
      }

      // Check if student already submitted attendance
      const { data: existingAttendance, error: checkError } = await supabase
        .from('meeting_attendance')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('student_s_number', studentSNumber.toLowerCase())
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error checking existing attendance:', checkError);
        throw checkError;
      }

      if (existingAttendance) {
        throw new Error('You have already submitted attendance for this meeting');
      }

      // Submit attendance
      const { data: attendance, error } = await supabase
        .from('meeting_attendance')
        .insert([{
          meeting_id: meetingId,
          student_s_number: studentSNumber.toLowerCase(),
          attendance_code: attendanceCode,
          session_type: sessionType,
          submitted_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error submitting attendance:', error);
        throw error;
      }

      console.log('✅ Attendance submitted successfully:', attendance);
      return attendance;
    } catch (error) {
      console.error('❌ Error submitting attendance:', error);
      throw error;
    }
  }

  // ========== ANNOUNCEMENTS MANAGEMENT ==========

  /**
   * Get all announcements
   */
  static async getAllAnnouncements() {
    try {
      console.log('📢 Getting all announcements...');
      
      const { data: announcements, error } = await supabase
        .from('announcements')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Error getting announcements:', error);
        throw error;
      }

      console.log(`✅ Found ${announcements?.length || 0} announcements`);
      return announcements || [];
    } catch (error) {
      console.error('❌ Error getting announcements:', error);
      throw error;
    }
  }

  /**
   * Create new announcement with optional image
   */
  static async createAnnouncement(announcementData) {
    try {
      console.log('📢 Creating new announcement:', announcementData.title);
      
      const insertData = {
        title: announcementData.title,
        message: announcementData.message,
        created_by: announcementData.createdBy || 'admin',
        date: new Date().toISOString()
      };

      // Add image data if provided
      if (announcementData.imageUrl) {
        insertData.image_url = announcementData.imageUrl;
      }
      if (announcementData.imageFilename) {
        insertData.image_filename = announcementData.imageFilename;
      }

      const { data, error } = await supabase
        .from('announcements')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating announcement:', error);
        throw error;
      }

      console.log('✅ Announcement created successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to create announcement:', error);
      throw error;
    }
  }

  /**
   * Delete announcement
   */
  static async deleteAnnouncement(announcementId) {
    try {
      console.log('🗑️ Deleting announcement:', announcementId);
      
      const { data, error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error deleting announcement:', error);
        throw error;
      }

      console.log('✅ Announcement deleted successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to delete announcement:', error);
      throw error;
    }
  }

  /**
   * Upload image to Supabase Storage
   */
  static async uploadAnnouncementImage(imageUri, filename) {
    try {
      console.log('📤 Uploading announcement image:', filename);
      console.log('📤 Image URI type:', typeof imageUri);
      console.log('📤 Image URI:', imageUri);
      
      // Handle different image formats
      let imageBlob;
      
      if (typeof imageUri === 'string') {
        // Handle string URIs (file://, http://, https://, data:)
        if (imageUri.startsWith('file://') || imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
          // Fetch the image and convert to blob
          const response = await fetch(imageUri);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
          }
          imageBlob = await response.blob();
        } else if (imageUri.startsWith('data:')) {
          // Handle data URLs
          const response = await fetch(imageUri);
          imageBlob = await response.blob();
        } else {
          throw new Error('Unsupported image URI format');
        }
      } else if (imageUri instanceof Blob) {
        // Direct blob
        imageBlob = imageUri;
      } else if (imageUri && typeof imageUri === 'object' && imageUri.uri) {
        // Handle React Native image object with uri property
        const response = await fetch(imageUri.uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        imageBlob = await response.blob();
      } else {
        console.error('❌ Unsupported image format:', imageUri);
        throw new Error('Unsupported image format. Please try selecting a different image.');
      }

      // Validate that we have a blob
      if (!imageBlob) {
        throw new Error('Failed to process image');
      }

      console.log('📤 Image blob size:', imageBlob.size, 'bytes');
      console.log('📤 Image blob type:', imageBlob.type);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('announcement-images')
        .upload(filename, imageBlob, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Error uploading image:', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('announcement-images')
        .getPublicUrl(filename);

      console.log('✅ Image uploaded successfully:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ Failed to upload image:', error);
      throw error;
    }
  }
}

export default SupabaseService;