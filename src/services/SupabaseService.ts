import { supabase } from './supabaseClient';

type ProofPhotoStorageInfo = {
  bucket: string;
  path: string;
  fileName: string;
  mimeType: string;
};

class SupabaseService {
  
  /**
   * Hash password using Web Crypto API
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const salt = Math.random().toString(36).substring(2, 15);
      const saltedPassword = password + salt;
      
      const encoder = new TextEncoder();
      const data = encoder.encode(saltedPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      // Convert buffer to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return `${hashedPassword}:${salt}`;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against stored hash
   */
  static async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
      const [hash, salt] = storedHash.split(':');
      const saltedPassword = password + salt;
      
      const encoder = new TextEncoder();
      const data = encoder.encode(saltedPassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedInput = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashedInput === hash;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  // ========== STUDENT MANAGEMENT ==========

  static async getStudent(sNumber: string) {
    try {
      console.log('🔍 Getting student:', sNumber);
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('s_number', sNumber.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error('❌ Error getting student:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to get student:', error);
      throw error;
    }
  }

  /**
   * Search students by name or S-number
   * This is search-only to reduce egress - no bulk loading of all students
   * Returns up to 50 matching students
   */
  static async searchStudents(searchTerm: string, limit: number = 50) {
    try {
      if (!searchTerm || !searchTerm.trim()) {
        return { data: [] };
      }

      const searchPattern = `%${searchTerm.trim()}%`;
      
      // Search by name or S-number
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, s_number, name, email, volunteering_hours, social_hours, total_hours, tshirt_size, account_status, account_created, last_login')
        .or(`name.ilike.${searchPattern},s_number.ilike.${searchPattern}`)
        .order('name', { ascending: true })
        .limit(limit);

      if (studentsError) {
        if (studentsError.code === '57014' || studentsError.message?.includes('timeout')) {
          console.error('❌ Search timeout:', studentsError);
          return { data: [], error: studentsError };
        }
        throw studentsError;
      }

      if (!studentsData || studentsData.length === 0) {
        return { data: [] };
      }

      // Get auth users for students that have accounts (only for results)
      const studentSNumbers = studentsData.map(s => s.s_number?.toLowerCase()).filter(Boolean);
      
      if (studentSNumbers.length > 0) {
        const { data: authUsers } = await supabase
          .from('auth_users')
          .select('s_number')
          .in('s_number', studentSNumbers)
          .limit(limit);

        if (authUsers) {
          const accountSNumbers = new Set(
            authUsers.map((au: any) => (au.s_number || '').toLowerCase())
          );

          // Filter to only include students with accounts
          const studentsWithAccounts = studentsData.filter((student: any) => {
            const sNumber = (student.s_number || '').toLowerCase();
            return accountSNumbers.has(sNumber);
          });

          return { data: studentsWithAccounts };
        }
      }

      return { data: studentsData };
    } catch (error: any) {
      console.error('❌ Error searching students:', error);
      if (error.code === '57014' || error.message?.includes('timeout')) {
        return { data: [], error };
      }
      return { data: [], error };
    }
  }

  static async getAuthUser(sNumber: string) {
    try {
      console.log('🔍 Getting auth user:', sNumber);
      
      const { data, error } = await supabase
        .from('auth_users')
        .select('*')
        .eq('s_number', sNumber.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error('❌ Error getting auth user:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to get auth user:', error);
      throw error;
    }
  }

  static async createStudent(studentData: any) {
    try {
      console.log('👤 Creating student:', studentData.sNumber);
      console.log('📊 Student data being inserted:', {
        s_number: studentData.sNumber.toLowerCase(),
        name: studentData.name,
        email: studentData.email || null,
        volunteering_hours: 0,
        social_hours: 0,
        total_hours: 0,
        tshirt_size: studentData.tshirtSize || null,
        account_status: 'pending'
      });
      
      const { data, error } = await supabase
        .from('students')
        .insert([{
          s_number: studentData.sNumber.toLowerCase(),
          name: studentData.name,
          email: studentData.email || null,
          volunteering_hours: 0,
          social_hours: 0,
          total_hours: 0,
          tshirt_size: studentData.tshirtSize || null,
          account_status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating student:', error);
        console.error('❌ Student creation error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Student created successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to create student:', error);
      throw error;
    }
  }

  static async updateStudent(sNumber: string, updateData: any) {
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

  static async registerStudent(sNumber: string, password: string, name: string, tshirtSize?: string) {
    try {
      console.log('🚀 Starting registration for:', sNumber);
      console.log('📊 Registration data:', { sNumber, name, tshirtSize });

      // Note: Connection test removed to avoid timeout issues
      // Connection will be validated on actual queries

      let student = await this.getStudent(sNumber);
      console.log('👤 Student lookup result:', student ? 'Found existing student' : 'Student not found');
      
      if (!student) {
        console.log('👤 Student not found, creating new record...');
        student = await this.createStudent({
          sNumber: sNumber,
          name: name || sNumber,
          totalHours: 0,
          tshirtSize: tshirtSize
        });
        console.log('✅ Student record created:', student);
      }

      console.log('🔍 Checking for existing auth user...');
      const existingAuth = await this.getAuthUser(sNumber);
      if (existingAuth) {
        console.log('❌ Auth user already exists');
        throw new Error('Account already exists. Please use the login page.');
      }
      console.log('✅ No existing auth user found');

      console.log('🔐 Hashing password...');
      const passwordHash = await this.hashPassword(password);
      console.log('✅ Password hashed successfully');

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
        console.error('❌ Auth error details:', {
          message: authError.message,
          details: authError.details,
          hint: authError.hint,
          code: authError.code
        });
        throw authError;
      }
      console.log('✅ Auth record created successfully:', authUser);

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
          authId: authUser.id,
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

  static async loginStudent(sNumber: string, password: string) {
    try {
      console.log('🚀 Starting login for:', sNumber);

      const authUser = await this.getAuthUser(sNumber);
      if (!authUser) {
        throw new Error('No account found. Please register first.');
      }

      console.log('🔐 Verifying password...');
      const isValidPassword = await this.verifyPassword(password, authUser.password_hash);
      if (!isValidPassword) {
        throw new Error('Incorrect password.');
      }

      const student = await this.getStudent(sNumber);
      if (!student) {
        throw new Error('Student record not found.');
      }

      await this.updateStudent(sNumber, {
        last_login: new Date().toISOString()
      });

      console.log('✅ Login successful for:', sNumber);

      return {
        success: true,
        user: {
          id: student.id,
          authId: authUser.id,
          sNumber: sNumber.toLowerCase(),
          name: student.name,
          role: student.role || 'student',
          totalHours: student.total_hours,
          tshirtSize: student.tshirt_size
        }
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  }

  static async changePassword(sNumber: string, oldPassword: string, newPassword: string) {
    try {
      const authUser = await this.getAuthUser(sNumber);
      if (!authUser) {
        throw new Error('Account not found');
      }

      const isValidOldPassword = await this.verifyPassword(oldPassword, authUser.password_hash);
      if (!isValidOldPassword) {
        throw new Error('Current password is incorrect');
      }

      const newPasswordHash = await this.hashPassword(newPassword);

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

  static async resetPassword(sNumber: string, newPassword: string) {
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

  static async getAllEvents() {
    try {
      console.log('📅 Getting all events with attendees...');
      
      // Only load recent events (last 1 year) to reduce egress and improve performance
      // Reduced from 3 years to 1 year to save egress
      // Note: If you need to see older events, change this to 2-3 years
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      // Select only needed columns (not *) to reduce payload size
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, description, location, event_date, start_time, end_time, capacity, color, created_by, created_at')
        .gte('event_date', oneYearAgo.toISOString()) // Only recent events (reduced from 3 years to 1 year)
        .order('event_date')
        .limit(100); // Add limit to prevent loading too many events

      if (eventsError) {
        console.error('❌ Error getting events:', eventsError);
        throw eventsError;
      }
      
      if (!eventsData || eventsData.length === 0) {
        return [];
      }

      const eventIds = eventsData.map(event => event.id);
      
      // Select only needed columns for attendees (not *) to reduce egress
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('event_attendees')
        .select('id, event_id, student_id, name, email, registered_at')
        .in('event_id', eventIds)
        .order('registered_at')
        .limit(5000); // Limit attendees to prevent huge payloads

      if (attendeesError) {
        console.warn('⚠️ Continuing without attendees data');
      }

      let authUserMap: Record<string, string> = {};
      if (attendeesData && attendeesData.length > 0) {
        const uniqueStudentIds = Array.from(
          new Set(
            attendeesData
              .map((a: any) => a.student_id)
              .filter((id: any) => typeof id === 'string' && id.length > 0)
          )
        );
        if (uniqueStudentIds.length > 0) {
          const { data: authUsers, error: authErr } = await supabase
            .from('auth_users')
            .select('id, s_number')
            .in('id', uniqueStudentIds);
          if (!authErr && authUsers) {
            authUserMap = authUsers.reduce((map: Record<string, string>, au: any) => {
              map[au.id] = au.s_number;
              return map;
            }, {});
          }
        }
      }

      const attendeesByEvent: Record<string, any[]> = {};
      if (attendeesData) {
        attendeesData.forEach((attendee: any) => {
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

      const eventsWithAttendees = eventsData.map(event => {
        const eventAttendees = attendeesByEvent[event.id] || [];
        
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
          attendees: eventAttendees,
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

  static async getEventById(eventId: string) {
    try {
      console.log('📅 Getting event by ID with attendees:', eventId);
      
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

      const { data: attendeesData, error: attendeesError } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('event_id', eventId)
        .order('registered_at');

      if (attendeesError) {
        console.error('❌ Error getting attendees for event:', attendeesError);
      }

      let sNumberByStudentId: Record<string, string> = {};
      if (attendeesData && attendeesData.length > 0) {
        const uniqueStudentIds = Array.from(new Set(
          attendeesData
            .map((a: any) => a.student_id)
            .filter((id: any) => typeof id === 'string' && id.length > 0)
        ));
        if (uniqueStudentIds.length > 0) {
          const { data: authUsers, error: authErr } = await supabase
            .from('auth_users')
            .select('id, s_number')
            .in('id', uniqueStudentIds);
          if (!authErr && authUsers) {
            sNumberByStudentId = authUsers.reduce((acc: Record<string, string>, au: any) => {
              acc[au.id] = au.s_number;
              return acc;
            }, {});
          }
        }
      }

      const attendees = (attendeesData || []).map((attendee: any) => ({
        id: attendee.id,
        name: attendee.name,
        email: attendee.email,
        sNumber: sNumberByStudentId[attendee.student_id] || null,
        studentId: attendee.student_id,
        registeredAt: attendee.registered_at
      }));

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

  static async createEvent(eventData: any) {
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

  static async updateEvent(eventId: string, eventData: any) {
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

  static async deleteEvent(eventId: string) {
    try {
      console.log('🗑️ Deleting event:', eventId);
      
      console.log('🗑️ Deleting event attendees...');
      const { error: attendeesError } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId);

      if (attendeesError) {
        console.error('❌ Error deleting event attendees:', attendeesError);
        throw attendeesError;
      }

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

  static async signupForEvent(eventId: string, attendeeData: any) {
    try {
      console.log('✍️ Signing up for event:', eventId, attendeeData);
      
      let studentUuid = null;
      if (attendeeData.sNumber) {
        const auth = await this.getAuthUser(attendeeData.sNumber);
        if (auth && auth.id) {
          studentUuid = auth.id;
        }
      }
      let existingAttendee = null;
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

      const event = await this.getEventById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      if (event.attendees && event.attendees.length >= event.capacity) {
        throw new Error('Event is at full capacity');
      }

      const attendeeInsertData: any = {
        event_id: eventId,
        name: attendeeData.name,
        email: attendeeData.email,
        registered_at: new Date().toISOString()
      };
      if (studentUuid) attendeeInsertData.student_id = studentUuid;

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

  static async unregisterFromEvent(eventId: string, email: string, sNumber: string | null = null) {
    try {
      console.log('🚫 Unregistering from event:', eventId, email, sNumber);
      
      let studentId = null;
      
      if (sNumber) {
        const auth = await this.getAuthUser(sNumber);
        if (auth && auth.id) {
          studentId = auth.id;
        }
      }
      
      let deleteQuery = supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId);
      
      if (studentId) {
        deleteQuery = deleteQuery.eq('student_id', studentId);
      } else {
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

  static async submitHourRequest(requestData: any) {
    try {
      console.log('⏰ Submitting hour request to Supabase...');
      
      const insertData: any = {
        student_s_number: requestData.studentSNumber.toLowerCase(),
        student_name: requestData.studentName,
        event_name: requestData.eventName,
        event_date: requestData.eventDate,
        hours_requested: parseFloat(requestData.hoursRequested),
        description: requestData.description,
        type: requestData.type || 'volunteering', // Default to 'volunteering' if not specified
        status: 'pending',
        submitted_at: new Date().toISOString()
      };
      
      const descriptionParts: string[] = [];

      if (requestData.description) {
        descriptionParts.push(requestData.description.trim());
      }

      if (requestData.imageData) {
        descriptionParts.push(`[PHOTO_DATA:${requestData.imageData}]`);

        try {
          const { mimeType, base64Data } = this.parsePhotoToken(requestData.imageData);
          const studentIdentifier = this.sanitizeForFilename(requestData.studentSNumber || requestData.studentName || 'student');
          const eventIdentifier = this.sanitizeForFilename(requestData.eventName || 'event');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const extension = this.getExtensionFromMimeType(mimeType);
          const baseFileName = [studentIdentifier, eventIdentifier, timestamp].filter(Boolean).join('_') || `proof_${timestamp}`;
          const storageFileName = `${baseFileName}.${extension}`;

          const storageInfo = await this.uploadProofPhotoToStorage({
            base64Data,
            mimeType,
            studentIdentifier,
            eventIdentifier,
            fileName: storageFileName
          });

          descriptionParts.push(this.createStorageToken(storageInfo));
          insertData.image_name = storageInfo.fileName;
        } catch (storageError) {
          console.error('❌ Failed to upload proof photo to Supabase storage:', storageError);
          if (requestData.imageName && !insertData.image_name) {
            insertData.image_name = requestData.imageName;
          }
        }
      }

      insertData.description = descriptionParts.filter(Boolean).join('\n\n');
      
      if (!insertData.image_name && requestData.imageName) {
        insertData.image_name = requestData.imageName;
      }
      
      const { data, error } = await supabase
        .from('hour_requests')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error submitting hour request:', error);
        throw error;
      }
      
      console.log('✅ Hour request submitted successfully');
      return data;
    } catch (error: any) {
      console.error('❌ Error submitting hour request:', error);
      
      if (error.code === '23505') {
        throw new Error('Duplicate request detected. Please check if this request was already submitted.');
      } else if (error.code === '23503') {
        throw new Error('Student not found in system. Please contact your Key Club sponsor.');
      } else {
        throw new Error(`Failed to submit hour request: ${error.message}`);
      }
    }
  }

  // ========== BULK T-SHIRT SIZE UPDATES ==========

  static async bulkUpdateTshirtSizes(updates: Array<{sNumber: string, tshirtSize: string}>) {
    try {
      console.log('👕 Starting bulk t-shirt size update for', updates.length, 'students');
      
      const results = [];
      const errors = [];
      
      for (const update of updates) {
        try {
          const { data, error } = await supabase
            .from('students')
            .update({ tshirt_size: update.tshirtSize })
            .eq('s_number', update.sNumber.toLowerCase())
            .select('s_number, name, tshirt_size')
            .single();

          if (error) {
            errors.push({
              sNumber: update.sNumber,
              error: error.message,
              tshirtSize: update.tshirtSize
            });
          } else {
            results.push(data);
          }
        } catch (error: any) {
          errors.push({
            sNumber: update.sNumber,
            error: error?.message || String(error),
            tshirtSize: update.tshirtSize
          });
        }
      }

      console.log('✅ Bulk update completed:', results.length, 'successful,', errors.length, 'errors');
      
      return {
        success: true,
        updated: results,
        errors: errors,
        summary: {
          total: updates.length,
          successful: results.length,
          failed: errors.length
        }
      };
    } catch (error) {
      console.error('❌ Bulk t-shirt size update failed:', error);
      throw error;
    }
  }

  static async getStudentHourRequests(sNumber: string) {
    try {
      console.log(`📊 Getting student hour requests for ${sNumber} - Using select('*') to get all columns`);
      
      // Query both tables to get full history (pending from main, approved/rejected from archive)
      const [pendingData, archiveData] = await Promise.all([
        // Get pending requests from main table
        supabase
          .from('hour_requests')
          .select('*')
          .eq('student_s_number', sNumber.toLowerCase())
          .eq('status', 'pending')
          .order('submitted_at', { ascending: false }),
        
        // Get approved/rejected requests from archive table
        supabase
          .from('hour_requests_archive')
          .select('*')
          .eq('student_s_number', sNumber.toLowerCase())
          .in('status', ['approved', 'rejected'])
          .order('submitted_at', { ascending: false })
      ]);
      
      // Combine results (handle errors gracefully)
      const pending = pendingData.error && pendingData.error.code !== '42P01' 
        ? [] 
        : (pendingData.data || []);
      
      const archived = archiveData.error && archiveData.error.code !== '42P01'
        ? []
        : (archiveData.data || []);
      
      // Log what columns are actually returned
      if (pending.length > 0) {
        console.log(`📊 hour_requests table returned ${pending.length} pending rows`);
        console.log(`📊 Columns actually returned in first pending row:`, Object.keys(pending[0]));
        console.log(`📊 First pending row has description:`, 'description' in pending[0]);
        console.log(`📊 First pending row has descriptions:`, 'descriptions' in pending[0]);
      }
      
      if (archived.length > 0) {
        console.log(`📊 hour_requests_archive table returned ${archived.length} archived rows`);
        console.log(`📊 Columns actually returned in first archived row:`, Object.keys(archived[0]));
        console.log(`📊 First archived row has description:`, 'description' in archived[0]);
        console.log(`📊 First archived row has descriptions:`, 'descriptions' in archived[0]);
      }
      
      // If archive table doesn't exist, fall back to just main table
      if (archiveData.error && archiveData.error.code === '42P01') {
        console.log('ℹ️ Archive table not found, returning only pending requests');
        return pending;
      }
      
      // Combine and sort by submitted_at (newest first)
      const combined = [...pending, ...archived];
      combined.sort((a, b) => {
        const dateA = new Date(a.submitted_at).getTime();
        const dateB = new Date(b.submitted_at).getTime();
        return dateB - dateA; // Descending order
      });
      
      console.log(`📊 Total combined rows: ${combined.length}`);
      
      return combined;
    } catch (error) {
      console.error('Error getting student hour requests:', error);
      throw error;
    }
  }

  /**
   * Optimized loader for pending hour requests.
   * - Uses index-friendly pattern: WHERE status = 'pending' ORDER BY submitted_at ASC LIMIT N
   * - Returns a light list for the admin screen.
   * - Supports keyset pagination via lastSubmittedAt (no OFFSET).
   */
  static async getHourRequestsPage(
    lastSubmittedAt: string | null = null,
    pageSize: number = 25  // Reduced from 50 to 25 to reduce egress
  ) {
    try {
      const requestedColumns = 'id, student_s_number, student_name, event_name, event_date, hours_requested, type, status, submitted_at, reviewed_at, reviewed_by, image_name';
      console.log(`📊 Querying hour_requests table - Requested columns:`, requestedColumns);
      
      let query = supabase
        .from('hour_requests')
        .select(
          // Exclude description to reduce load - images loaded on-demand via button
          requestedColumns
        )
        .eq('status', 'pending')
        // ASC order so Postgres can walk the index efficiently
        .order('submitted_at', { ascending: true })
        .limit(pageSize);

      // Keyset pagination: only fetch rows *after* the last one we saw
      if (lastSubmittedAt) {
        query = query.gt('submitted_at', lastSubmittedAt);
      }

      const { data, error } = await query;

      if (error) {
        // Graceful handling for occasional timeouts
        if ((error as any).code === '57014' || (error as any).message?.includes('timeout')) {
          console.warn('⚠️ hour_requests page query timed out, returning empty page');
          return [];
        }
        throw error;
      }

      // Log what columns are actually returned
      if (data && data.length > 0) {
        console.log(`📊 hour_requests query returned ${data.length} rows`);
        console.log(`📊 Columns actually returned in first row:`, Object.keys(data[0]));
        console.log(`📊 Sample row data:`, {
          id: data[0].id,
          student_s_number: data[0].student_s_number,
          event_name: data[0].event_name,
          has_description: 'description' in data[0],
          has_descriptions: 'descriptions' in data[0],
          allKeys: Object.keys(data[0])
        });
      } else {
        console.log(`📊 hour_requests query returned 0 rows`);
      }

      // Already ASC (oldest first) which is what admins usually want.
      return data || [];
    } catch (error: any) {
      console.error('Error getting hour requests page:', error);
      if (error.code === '57014' || error.message?.includes('timeout')) {
        console.warn('⚠️ Returning empty page due to timeout');
        return [];
      }
      throw error;
    }
  }

  static async getAllHourRequests() {
    try {
      // Backwards-compatible wrapper: load the first page of pending requests.
      // Uses the optimized, index-friendly getHourRequestsPage() under the hood.
      // Reduced to 25 to minimize egress (was 50)
      const data = await this.getHourRequestsPage(null, 25);
      return data;
    } catch (error: any) {
      console.error('Error getting all hour requests:', error);
      // If it's a timeout, return empty array instead of throwing
      if (error.code === '57014' || error.message?.includes('timeout')) {
        console.warn('⚠️ Returning empty array due to timeout');
        return [];
      }
      throw error;
    }
  }

  static async searchHourRequests(searchTerm: string, status: string = 'pending', limit: number = 25) {  // Reduced default from 100 to 25 to save egress
    try {
      // Optimize: select only needed columns
      // Only search recent requests (last 2 years) to improve performance with large datasets
      // Note: Search will still work but only finds recent records. Remove date filter to search all records.
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      
      // Determine which table(s) to query based on status
      // - pending → hour_requests (main table, faster!)
      // - approved/rejected → hour_requests_archive (archive table)
      // - all → query both tables and combine
      
      if (status === 'all') {
        const requestedColumns = 'id, student_s_number, student_name, event_name, event_date, hours_requested, type, status, submitted_at, reviewed_at, reviewed_by, image_name';
        console.log(`📊 Searching both tables (all status) - Requested columns:`, requestedColumns);
        
        // Query both tables and combine results
        const [pendingData, archiveData] = await Promise.all([
          // Query pending from main table (exclude description to reduce load)
          supabase
            .from('hour_requests')
            .select(requestedColumns)
            .eq('status', 'pending')
            .gte('submitted_at', twoYearsAgo.toISOString())
            .order('submitted_at', { ascending: true })
            .limit(limit),
          
          // Query approved/rejected from archive table (exclude description to reduce load)
          supabase
            .from('hour_requests_archive')
            .select(requestedColumns)
            .in('status', ['approved', 'rejected'])
            .gte('submitted_at', twoYearsAgo.toISOString())
            .order('submitted_at', { ascending: true })
            .limit(limit)
        ]);
        
        // Handle errors gracefully
        if (pendingData.error && pendingData.error.code !== '42P01') {
          console.error('❌ Error querying pending requests:', pendingData.error);
        }
        if (archiveData.error && archiveData.error.code !== '42P01') {
          console.error('❌ Error querying archive requests:', archiveData.error);
        }
        
        let combined = [
          ...(pendingData.data || []),
          ...(archiveData.data || [])
        ];
        
        // Log what columns are actually returned
        if (combined.length > 0) {
          console.log(`📊 Combined search returned ${combined.length} rows`);
          console.log(`📊 Columns actually returned in first row:`, Object.keys(combined[0]));
        } else {
          console.log(`📊 Combined search returned 0 rows`);
        }
        
        // Apply search filter if provided
        if (searchTerm.trim()) {
          const searchPattern = searchTerm.trim().toLowerCase();
          combined = combined.filter(r => {
            // Check both 'description' and 'descriptions' field names
            const description = r.descriptions || r.description;
            return r.student_name?.toLowerCase().includes(searchPattern) ||
              r.student_s_number?.toLowerCase().includes(searchPattern) ||
              r.event_name?.toLowerCase().includes(searchPattern) ||
              description?.toLowerCase().includes(searchPattern);
          });
        }
        
        // Sort and limit combined results
        combined.sort((a, b) => {
          const dateA = new Date(a.submitted_at).getTime();
          const dateB = new Date(b.submitted_at).getTime();
          return dateA - dateB;
        });
        
        return combined.slice(0, limit);
      }
      
      // Query single table based on status
      const tableName = status === 'pending' ? 'hour_requests' : 'hour_requests_archive';
      
      const requestedColumns = 'id, student_s_number, student_name, event_name, event_date, hours_requested, type, status, submitted_at, reviewed_at, reviewed_by, image_name';
      console.log(`📊 Searching ${tableName} table - Requested columns:`, requestedColumns);
      
      // Exclude description to reduce load - images loaded on-demand via button
      let query = supabase
        .from(tableName)
        .select(requestedColumns)
        .eq('status', status)
        .gte('submitted_at', twoYearsAgo.toISOString())
        .limit(limit); // Add limit early to reduce data transfer

      // Apply search - Supabase text search using ilike (case-insensitive)
      if (searchTerm.trim()) {
        const searchPattern = `%${searchTerm.trim()}%`;
        // Use .or() with proper Supabase PostgREST syntax
        // Format: column.operator.value,column2.operator.value
        // Search on both 'description' and 'descriptions' column names
        query = query.or(`student_name.ilike.${searchPattern},student_s_number.ilike.${searchPattern},event_name.ilike.${searchPattern},description.ilike.${searchPattern},descriptions.ilike.${searchPattern}`);
      }

      // Order and limit
      query = query
        .order('submitted_at', { ascending: true })
        .limit(limit);

      const { data, error } = await query;

      if (error) {
        // Check for timeout errors
        if (error.code === '57014' || error.message?.includes('timeout')) {
          console.error('❌ Query timeout - database may be slow or need indexes. Error:', error);
          return [];
        }
        // If archive table doesn't exist yet, fall back to main table for backwards compatibility
        if (error.code === '42P01' && status !== 'pending') {
          console.log('ℹ️ Archive table not found, falling back to main table');
          // Retry with main table (will only find pending)
          return this.searchHourRequests(searchTerm, 'pending', limit);
        }
        throw error;
      }
      
      // Log what columns are actually returned
      if (data && data.length > 0) {
        console.log(`📊 ${tableName} search returned ${data.length} rows`);
        console.log(`📊 Columns actually returned in first row:`, Object.keys(data[0]));
      } else {
        console.log(`📊 ${tableName} search returned 0 rows`);
      }
      
      return data || [];
    } catch (error: any) {
      console.error('Error searching hour requests:', error);
      // If it's a timeout, return empty array instead of throwing
      if (error.code === '57014' || error.message?.includes('timeout')) {
        console.warn('⚠️ Returning empty array due to timeout');
        return [];
      }
      throw error;
    }
  }

  /**
   * Get full hour request details including description (with image data)
   * Use this to lazy-load images when viewing a specific request
   */
  static async getHourRequestDetails(requestId: string, status: string = 'pending') {
    try {
      const tableName = status === 'pending' ? 'hour_requests' : 'hour_requests_archive';
      
      // Helper function to normalize description field
      const normalizeDescription = (record: any): any => {
        if (!record) return record;
        
        // Create a new object to avoid mutation issues
        const normalized = { ...record };
        
        // Detect which field actually has data
        const hasDescriptions = 'descriptions' in normalized && normalized.descriptions != null && normalized.descriptions !== '';
        const hasDescription = 'description' in normalized && normalized.description != null && normalized.description !== '';
        
        console.log(`🔍 Detecting description field:`, {
          hasDescriptions,
          hasDescription,
          descriptionsType: typeof normalized.descriptions,
          descriptionsLength: hasDescriptions ? normalized.descriptions?.length : 'N/A',
          descriptionType: typeof normalized.description,
          descriptionLength: hasDescription ? normalized.description?.length : 'N/A'
        });
        
        // Always ensure 'description' field exists, prefer 'descriptions' if it has content
        if (hasDescriptions) {
          // 'descriptions' exists and has content - use it
          normalized.description = normalized.descriptions;
          console.log(`✅ Using 'descriptions' field (length: ${normalized.descriptions?.length}) and normalizing to 'description'`);
        } else if (hasDescription) {
          // 'description' exists and has content - already correct
          console.log(`✅ Using 'description' field (length: ${normalized.description?.length})`);
        } else {
          // Neither has content - set to null/undefined
          console.log(`⚠️ Neither 'descriptions' nor 'description' has content`);
          normalized.description = normalized.descriptions || normalized.description || null;
        }
        
        // Keep both fields for backwards compatibility but ensure 'description' is the canonical one
        return normalized;
      };
      
      // Use select('*') to get all columns including descriptions/description
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) {
        // If not found in first table, try the other one
        if (error.code === 'PGRST116') {
          const otherTable = status === 'pending' ? 'hour_requests_archive' : 'hour_requests';
          // Use select('*') to get all columns including descriptions/description
          const { data: otherData, error: otherError } = await supabase
            .from(otherTable)
            .select('*')
            .eq('id', requestId)
            .single();

          if (otherError) {
            console.error('❌ Error fetching hour request details:', otherError);
            throw otherError;
          }
          
          // Log what fields we got back
          console.log(`📋 Querying ${otherTable} table with select('*') (fallback)`);
          console.log(`📋 Got request from ${otherTable}, ALL columns returned:`, Object.keys(otherData || {}));
          console.log(`📋 Column details:`, {
            has_description: 'description' in (otherData || {}),
            has_descriptions: 'descriptions' in (otherData || {}),
            description_value: otherData?.description ? `[${typeof otherData.description}] length: ${otherData.description?.length || 0}` : 'null/undefined',
            descriptions_value: otherData?.descriptions ? `[${typeof otherData.descriptions}] length: ${otherData.descriptions?.length || 0}` : 'null/undefined',
            allColumns: Object.keys(otherData || {})
          });
          
          // Normalize the description field
          const normalized = normalizeDescription(otherData);
          
          const descriptionValue = normalized?.description || normalized?.descriptions;
          console.log(`📋 After normalization - Description value type:`, typeof descriptionValue);
          console.log(`📋 After normalization - Description length:`, descriptionValue?.length || 'null/undefined');
          if (descriptionValue) {
            console.log(`📋 After normalization - Description preview:`, descriptionValue.substring(0, 200));
          }
          console.log(`📋 After normalization - Final columns:`, Object.keys(normalized || {}));
          
          return normalized;
        }
        console.error('❌ Error fetching hour request details:', error);
        throw error;
      }

      // Log what fields we got back
      console.log(`📋 Querying ${tableName} table with select('*')`);
      console.log(`📋 Got request from ${tableName}, ALL columns returned:`, Object.keys(data || {}));
      console.log(`📋 Column details:`, {
        has_description: 'description' in (data || {}),
        has_descriptions: 'descriptions' in (data || {}),
        description_value: data?.description ? `[${typeof data.description}] length: ${data.description?.length || 0}` : 'null/undefined',
        descriptions_value: data?.descriptions ? `[${typeof data.descriptions}] length: ${data.descriptions?.length || 0}` : 'null/undefined',
        allColumns: Object.keys(data || {})
      });
      
      // Normalize the description field
      const normalized = normalizeDescription(data);
      
      const descriptionValue = normalized?.description || normalized?.descriptions;
      console.log(`📋 After normalization - Description value type:`, typeof descriptionValue);
      console.log(`📋 After normalization - Description length:`, descriptionValue?.length || 'null/undefined');
      if (descriptionValue) {
        console.log(`📋 After normalization - Description preview:`, descriptionValue.substring(0, 200));
      }
      console.log(`📋 After normalization - Final columns:`, Object.keys(normalized || {}));

      return normalized;
    } catch (error) {
      console.error('❌ Error fetching hour request details:', error);
      throw error;
    }
  }

  static async deleteHourRequest(requestId: string) {
    try {
      console.log('🗑️ Deleting hour request:', requestId);
      
      // First, get the request to check if it was approved
      const { data: request, error: fetchError } = await supabase
        .from('hour_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching hour request:', fetchError);
        throw fetchError;
      }

      if (!request) {
        throw new Error('Hour request not found');
      }

      // If the request was approved, revert the hours change
      if (request.status === 'approved' && request.student_s_number) {
        const studentSNumber = request.student_s_number;
        const student = await this.getStudent(studentSNumber);
        
        if (student) {
          const requestedHours = parseFloat(request.hours_requested || 0);
          const hoursType = (request.type || 'volunteering').toLowerCase();
          const eventName = (request.event_name || '').toLowerCase();
          // Check both 'descriptions' and 'description' field names
          const description = ((request.descriptions || request.description) || '').toLowerCase();
          
          // Check if this was an adjustment that REMOVED hours (so we should ADD them back)
          const wasRemoval = eventName.includes('removed') || 
                           eventName.includes('deleted') ||
                           description.includes('removed') ||
                           description.includes('deleted') ||
                           description.includes('subtracted');
          
          if (!isNaN(requestedHours) && requestedHours > 0) {
            if (hoursType === 'social') {
              const currentSocialHours = parseFloat(student.social_hours || 0);
              let newSocialHours;
              
              if (wasRemoval) {
                // This was a removal, so ADD hours back
                newSocialHours = currentSocialHours + requestedHours;
                console.log(`✅ Adding back ${requestedHours} social credits to student ${studentSNumber}`);
              } else {
                // This was an addition, so SUBTRACT hours
                newSocialHours = Math.max(0, currentSocialHours - requestedHours);
                console.log(`✅ Subtracting ${requestedHours} social credits from student ${studentSNumber}`);
              }
              
              await this.updateStudent(studentSNumber, {
                social_hours: newSocialHours,
                last_hour_update: new Date().toISOString()
              });
              
              console.log(`   Previous: ${currentSocialHours}, New: ${newSocialHours}`);
            } else {
              const currentVolunteeringHours = parseFloat(student.volunteering_hours || 0);
              let newVolunteeringHours;
              
              if (wasRemoval) {
                // This was a removal, so ADD hours back
                newVolunteeringHours = currentVolunteeringHours + requestedHours;
                console.log(`✅ Adding back ${requestedHours} volunteering hours to student ${studentSNumber}`);
              } else {
                // This was an addition, so SUBTRACT hours
                newVolunteeringHours = Math.max(0, currentVolunteeringHours - requestedHours);
                console.log(`✅ Subtracting ${requestedHours} volunteering hours from student ${studentSNumber}`);
              }
              
              await this.updateStudent(studentSNumber, {
                volunteering_hours: newVolunteeringHours,
                last_hour_update: new Date().toISOString()
              });
              
              console.log(`   Previous: ${currentVolunteeringHours}, New: ${newVolunteeringHours}`);
            }
          }
        }
      }
      
      // Now delete the request
      const { error } = await supabase
        .from('hour_requests')
        .delete()
        .eq('id', requestId);

      if (error) {
        console.error('❌ Error deleting hour request:', error);
        throw error;
      }
      
      console.log('✅ Hour request deleted successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Error deleting hour request:', error);
      throw new Error(`Failed to delete hour request: ${error.message}`);
    }
  }

  static async updateHourRequestStatus(
    requestId: string, 
    status: string, 
    adminNotes: string = '', 
    reviewedBy: string = 'Admin', 
    hoursRequested: number | null = null
  ) {
    try {
      console.log('🔄 Starting hour request status update:', { requestId, status, adminNotes, reviewedBy, hoursRequested });
      
      const normalizedStatus = (status || '').toString().trim().toLowerCase();
      const isApprovedOrRejected = normalizedStatus === 'approved' || normalizedStatus === 'rejected';
      let request: any = null;
      
      // If approving/rejecting, move directly to archive table instead of updating in place
      if (isApprovedOrRejected) {
        // First, get the current request from the pending table
        const { data: pendingRequest, error: fetchError } = await supabase
          .from('hour_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (fetchError) {
          console.error('❌ Error fetching pending request:', fetchError);
          throw fetchError;
        }

        if (!pendingRequest) {
          throw new Error(`Request ${requestId} not found in pending table`);
        }

        // Insert into archive table with updated status
        const { data: archivedRequest, error: archiveError } = await supabase
          .from('hour_requests_archive')
          .insert({
            ...pendingRequest,
            status: normalizedStatus,
            reviewed_at: new Date().toISOString(),
            reviewed_by: reviewedBy,
            admin_notes: adminNotes,
            archived_at: new Date().toISOString()
          })
          .select()
          .single();

        if (archiveError) {
          // If archive table doesn't exist or insert fails, try fallback
          if (archiveError.code === '42P01') {
            console.warn('⚠️ Archive table does not exist, updating in place instead');
            // Fallback to regular update (trigger should handle it)
            const { data: updatedRequestData, error: updateError } = await supabase
              .from('hour_requests')
              .update({
                status: normalizedStatus,
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
            
            // Set request for shared approval logic below
            request = updatedRequestData;
          } else {
            console.error('❌ Error archiving request:', archiveError);
            throw archiveError;
          }
        } else {
          // Archive succeeded, now delete from pending table
          const { error: deleteError } = await supabase
            .from('hour_requests')
            .delete()
            .eq('id', requestId);

          if (deleteError) {
            console.error('❌ Error deleting request from pending table:', deleteError);
            // Don't throw - the request is already archived, just log the error
            console.warn('⚠️ Request archived but could not be deleted from pending table. This is okay.');
          }

          console.log('✅ Request moved to archive table:', archivedRequest.id);

          // Use archived request for approval logic
          request = archivedRequest;
        }
      } else {
        // For other status changes (shouldn't happen, but handle it)
        const { data: updatedRequest, error: updateError } = await supabase
          .from('hour_requests')
          .update({
            status: normalizedStatus,
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
        
        // For non-approved/rejected, return early
        return updatedRequest;
      }

      // Approval logic - only runs if status is approved
      if (normalizedStatus === 'approved' && request) {
        const studentSNumber = request.student_s_number;
        if (!studentSNumber) {
          console.error('❌ No student S-number found in request');
          return request;
        }
        
        const student = await this.getStudent(studentSNumber);
        if (student) {
          let requestedHours = hoursRequested !== null ? parseFloat(hoursRequested as any) : parseFloat(request.hours_requested);
          
          if (isNaN(requestedHours) || requestedHours <= 0) {
            console.error('❌ Invalid or missing hours_requested in request');
            return request;
          }
          
          // Get the type from the request (default to 'volunteering' for backwards compatibility)
          const hoursType = (request.type || 'volunteering').toLowerCase();
          
          if (hoursType === 'social') {
            // Add approved hours to social_hours
            const currentSocialHours = parseFloat(student.social_hours || 0);
            const currentVolunteeringHours = parseFloat(student.volunteering_hours || 0);
            const newSocialHours = currentSocialHours + requestedHours;
            const newTotalHours = newSocialHours + currentVolunteeringHours; // Explicitly calculate total
            
            const updateResult = await this.updateStudent(studentSNumber, {
              social_hours: newSocialHours,
              total_hours: newTotalHours, // Explicitly set total_hours as backup (trigger should also handle this)
              last_hour_update: new Date().toISOString()
            });
            
            if (!updateResult) {
              throw new Error(`Failed to update student ${studentSNumber} hours`);
            }
            
            console.log(`✅ Added ${requestedHours} social credits to student ${studentSNumber}`);
            console.log(`📊 Updated hours: ${currentSocialHours} → ${newSocialHours} social, ${newTotalHours} total`);
          } else {
            // Default: Add approved hours to volunteering_hours
            const currentVolunteeringHours = parseFloat(student.volunteering_hours || 0);
            const currentSocialHours = parseFloat(student.social_hours || 0);
            const newVolunteeringHours = currentVolunteeringHours + requestedHours;
            const newTotalHours = newVolunteeringHours + currentSocialHours; // Explicitly calculate total
            
            const updateResult = await this.updateStudent(studentSNumber, {
              volunteering_hours: newVolunteeringHours,
              total_hours: newTotalHours, // Explicitly set total_hours as backup (trigger should also handle this)
              last_hour_update: new Date().toISOString()
            });
            
            if (!updateResult) {
              throw new Error(`Failed to update student ${studentSNumber} hours`);
            }
            
            console.log(`✅ Added ${requestedHours} volunteering hours to student ${studentSNumber}`);
            console.log(`📊 Updated hours: ${currentVolunteeringHours} → ${newVolunteeringHours} volunteering, ${newTotalHours} total`);
          }
          
          // Verify the update succeeded by fetching the student again
          const updatedStudent = await this.getStudent(studentSNumber);
          if (updatedStudent) {
            const actualTotal = parseFloat(updatedStudent.total_hours || 0);
            const expectedTotal = parseFloat(updatedStudent.volunteering_hours || 0) + parseFloat(updatedStudent.social_hours || 0);
            
            if (Math.abs(actualTotal - expectedTotal) > 0.01) {
              console.warn(`⚠️ Total hours mismatch! Expected ${expectedTotal}, got ${actualTotal}. Updating...`);
              // Fix total_hours if it doesn't match
              await this.updateStudent(studentSNumber, {
                total_hours: expectedTotal
              });
            } else {
              console.log('✅ Student hours verified and correct in database');
            }
          }

          await this.uploadProofPhotoToDrive({
            ...request,
            student_s_number: studentSNumber
          });
        }
      }

      // Return the archived/updated request
      return request;
    } catch (error) {
      console.error('❌ Error updating hour request status:', error);
      throw error;
    }
  }

  static async updateHourRequestType(requestId: string, newType: 'volunteering' | 'social') {
    try {
      console.log('🔄 Updating hour request type:', { requestId, newType });
      
      const { data: updatedRequest, error } = await supabase
        .from('hour_requests')
        .update({
          type: newType
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating request type:', error);
        throw error;
      }

      console.log('✅ Request type updated successfully');
      return updatedRequest;
    } catch (error) {
      console.error('❌ Error updating hour request type:', error);
      throw error;
    }
  }

  static async updateHourRequestHours(requestId: string, newHours: number) {
    try {
      console.log('🔄 Updating hour request hours:', { requestId, newHours });
      
      const { data: updatedRequest, error } = await supabase
        .from('hour_requests')
        .update({
          hours_requested: newHours
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating request hours:', error);
        throw error;
      }

      console.log('✅ Request hours updated successfully');
      return updatedRequest;
    } catch (error) {
      console.error('❌ Error updating hour request hours:', error);
      throw error;
    }
  }

  static async getProofPhotoLibrary(options: {
    status?: string;
    searchTerm?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<Array<{
    id: string;
    studentName?: string | null;
    studentNumber?: string | null;
    eventName?: string | null;
    eventDate?: string | null;
    status?: string | null;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    hoursRequested?: number | null;
    description?: string | null;
    fileName: string;
    mimeType: string;
    base64Data: string;
    dataUrl: string;
  }>> {
    try {
      const { status, searchTerm, startDate, endDate } = options;

      // Limit to recent records and smaller page size to reduce egress
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);  // Reduced from 1 year to 6 months to save egress

      // Try using the archive view first (combines both tables)
      // Falls back to main table if view doesn't exist (backwards compatible)
      // Reduced fields and limit to minimize egress
      let query = supabase
        .from('hour_requests_archive')
        .select(
          `
            id,
            student_name,
            student_s_number,
            event_name,
            event_date,
            image_name,
            status,
            hours_requested,
            submitted_at,
            reviewed_at
          `
        )
        .gte('submitted_at', sixMonthsAgo.toISOString())  // Reduced from 1 year to 6 months
        .order('submitted_at', { ascending: false })
        .limit(150);  // Reduced from 300 to 150 to save egress

      let { data, error } = await query;

      // If archive table doesn't exist, fall back to main table
      if (error && (error as any).code === '42P01') {
        console.log('ℹ️ Archive table not found, querying main table');
        query = supabase
          .from('hour_requests')
          .select(
            `
              id,
              student_name,
              student_s_number,
              event_name,
              event_date,
              image_name,
              status,
              hours_requested,
              submitted_at,
              reviewed_at
            `
          )
          .gte('submitted_at', sixMonthsAgo.toISOString())  // Reduced from 1 year to 6 months
          .order('submitted_at', { ascending: false })
          .limit(150);  // Reduced from 300 to 150 to save egress
        
        const result = await query;
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('❌ Error fetching proof photo library:', error);
        // Gracefully handle timeouts by returning an empty library instead of crashing
        if ((error as any).code === '57014' || (error as any).message?.includes('timeout')) {
          return [];
        }
        throw error;
      }

      const results = (data || [])
        .filter((request) => {
          // Check both 'descriptions' and 'description' field names
          const description = request?.descriptions || request?.description;
          if (!description) {
            return false;
          }

          const hasPhoto = /\[PHOTO_DATA:(.*?)\]/.test(description) || /data:image\/[^;]+;base64,/.test(description);
          if (!hasPhoto) {
            return false;
          }

          if (status && request.status !== status) {
            return false;
          }

          if (startDate && request.submitted_at && new Date(request.submitted_at) < new Date(startDate)) {
            return false;
          }

          if (endDate && request.submitted_at && new Date(request.submitted_at) > new Date(endDate)) {
            return false;
          }

          if (searchTerm) {
            const normalizedSearch = searchTerm.trim().toLowerCase();
            const fieldsToSearch = [
              request.student_name,
              request.student_s_number,
              request.event_name,
              request.event_date,
              request.status
            ]
              .filter(Boolean)
              .map((value) => value.toString().toLowerCase());

            const matchesSearch = fieldsToSearch.some((value) => value.includes(normalizedSearch));

            if (!matchesSearch) {
              return false;
            }
          }

          return true;
        })
        .map((request) => {
          // Check both 'descriptions' and 'description' field names
          const description = request?.descriptions || request?.description;
          const photoToken = this.extractPhotoToken(description);
          if (!photoToken) {
            return null;
          }

          const { mimeType, base64Data } = this.parsePhotoToken(photoToken);
          if (!base64Data) {
            return null;
          }

          const extension = mimeType.split('/')[1] || 'jpg';
          const fallbackFileNameParts = [
            this.sanitizeForFilename(request.student_name || request.student_s_number || 'student'),
            this.sanitizeForFilename(request.event_name || 'event'),
            request.id
          ].filter(Boolean);

          const fallbackBaseName = fallbackFileNameParts.join('_') || 'proof';
          const fallbackFileName = `${fallbackBaseName}.${extension}`;
          const fileName = request.image_name || fallbackFileName;

          const dataUrl = base64Data.startsWith('data:')
            ? base64Data
            : `data:${mimeType};base64,${base64Data}`;

          return {
            id: request.id,
            studentName: request.student_name,
            studentNumber: request.student_s_number,
            eventName: request.event_name,
            eventDate: request.event_date,
            status: request.status,
            submittedAt: request.submitted_at,
            reviewedAt: request.reviewed_at,
            hoursRequested: request.hours_requested,
            description: description,
            fileName,
            mimeType,
            base64Data,
            dataUrl
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      return results;
    } catch (error) {
      console.error('❌ Error building proof photo library:', error);
      throw error;
    }
  }

  // ========== MEETING MANAGEMENT ==========

  static generateAttendanceCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static async getAllMeetings() {
    try {
      const { data: meetings, error } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: false });

      if (error) throw error;
      return meetings || [];
    } catch (error) {
      console.error('❌ Error getting meetings:', error);
      throw error;
    }
  }

  static async createMeeting(meetingData: any) {
    try {
      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert([{
          meeting_date: meetingData.meetingDate,
          meeting_type: meetingData.meetingType,
          attendance_code: meetingData.attendanceCode,
          is_open: meetingData.isOpen || false,
          created_by: meetingData.createdBy,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return meeting;
    } catch (error) {
      console.error('❌ Error creating meeting:', error);
      throw error;
    }
  }

  static async updateMeeting(meetingId: string, updates: any) {
    try {
      const { data: meeting, error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', meetingId)
        .select()
        .single();

      if (error) throw error;
      return meeting;
    } catch (error) {
      console.error('❌ Error updating meeting:', error);
      throw error;
    }
  }

  static async deleteMeeting(meetingId: string) {
    try {
      await supabase
        .from('meeting_attendance')
        .delete()
        .eq('meeting_id', meetingId);
      
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Error deleting meeting:', error);
      throw error;
    }
  }

  static async getStudentAttendance(studentSNumber: string) {
    try {
      console.log('📋 Getting attendance for student:', studentSNumber);
      
      const { data: attendance, error } = await supabase
        .from('meeting_attendance')
        .select(`
          *,
          meetings (
            id,
            meeting_date,
            meeting_type,
            is_open
          )
        `)
        .eq('student_s_number', studentSNumber.toLowerCase())
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('❌ Error getting student attendance:', error);
        throw error;
      }

      console.log('✅ Student attendance retrieved:', attendance?.length || 0, 'records');
      return attendance || [];
    } catch (error) {
      console.error('❌ Failed to get student attendance:', error);
      throw error;
    }
  }

  static async markAttendance(attendanceData: {
    student_s_number: string;
    meeting_id: string;
    attendance_code: string;
    session_type?: string;
  }) {
    const { student_s_number, meeting_id, attendance_code, session_type = 'both' } = attendanceData;
    return this.submitAttendance(meeting_id, student_s_number, attendance_code, session_type);
  }

  static async deleteAttendance(attendanceId: string) {
    try {
      console.log('🗑️ Deleting attendance record:', attendanceId);
      
      const { error } = await supabase
        .from('meeting_attendance')
        .delete()
        .eq('id', attendanceId);

      if (error) {
        console.error('❌ Error deleting attendance record:', error);
        throw error;
      }
      
      console.log('✅ Attendance record deleted successfully');
      return true;
    } catch (error: any) {
      console.error('❌ Error deleting attendance record:', error);
      throw new Error(`Failed to delete attendance record: ${error.message}`);
    }
  }

  static async submitAttendance(meetingId: string, studentSNumber: string, attendanceCode: string, sessionType: string = 'both') {
    try {
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (meetingError) throw meetingError;
      if (!meeting) throw new Error('Meeting not found');
      if (!meeting.is_open) throw new Error('Attendance submission is closed for this meeting');
      if (meeting.attendance_code !== attendanceCode) throw new Error('Invalid attendance code');

      const { data: existingAttendance } = await supabase
        .from('meeting_attendance')
        .select('*')
        .eq('meeting_id', meetingId)
        .eq('student_s_number', studentSNumber.toLowerCase())
        .single();

      if (existingAttendance) {
        throw new Error('You have already submitted attendance for this meeting');
      }

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

      if (error) throw error;
      return attendance;
    } catch (error) {
      console.error('❌ Error submitting attendance:', error);
      throw error;
    }
  }

  static async bulkImportAttendance(attendanceData: Array<{
    student_s_number: string;
    meeting_date: string;
    attendance_code?: string;
    session_type?: string;
  }>) {
    try {
      console.log('📋 Starting bulk attendance import for', attendanceData.length, 'records');
      
      // Get unique dates to create/get meetings
      const uniqueDates = [...new Set(attendanceData.map(a => a.meeting_date))];
      const meetingMap: Record<string, string> = {};
      
      // Create or get meetings for each date
      for (const date of uniqueDates) {
        const { data: existingMeetings } = await supabase
          .from('meetings')
          .select('id')
          .eq('meeting_date', date)
          .limit(1);
        
        let meetingId: string;
        
        if (existingMeetings && existingMeetings.length > 0) {
          meetingId = existingMeetings[0].id;
          console.log(`✅ Meeting for ${date} already exists: ${meetingId}`);
        } else {
          // Create new meeting
          const { data: newMeeting, error: meetingError } = await supabase
            .from('meetings')
            .insert([{
              meeting_date: date,
              meeting_type: 'General Meeting',
              attendance_code: 'ATTEND',
              is_open: false,
              created_by: 'admin',
              created_at: new Date().toISOString()
            }])
            .select()
            .single();
          
          if (meetingError) {
            console.error(`❌ Error creating meeting for ${date}:`, meetingError);
            throw meetingError;
          }
          
          meetingId = newMeeting.id;
          console.log(`✅ Created meeting for ${date}: ${meetingId}`);
        }
        
        meetingMap[date] = meetingId;
      }
      
      // Insert attendance records
      const results = {
        success: 0,
        errors: 0,
        skipped: 0,
        errorDetails: [] as Array<{ student: string; date: string; error: string }>
      };
      
      for (const record of attendanceData) {
        const meetingId = meetingMap[record.meeting_date];
        if (!meetingId) {
          results.errors++;
          results.errorDetails.push({
            student: record.student_s_number,
            date: record.meeting_date,
            error: 'No meeting ID found for date'
          });
          continue;
        }
        
        // Check if attendance already exists
        const { data: existing } = await supabase
          .from('meeting_attendance')
          .select('id')
          .eq('meeting_id', meetingId)
          .eq('student_s_number', record.student_s_number.toLowerCase())
          .limit(1);
        
        if (existing && existing.length > 0) {
          results.skipped++;
          continue;
        }
        
        const { error } = await supabase
          .from('meeting_attendance')
          .insert([{
            meeting_id: meetingId,
            student_s_number: record.student_s_number.toLowerCase(),
            attendance_code: record.attendance_code || 'IMPORTED',
            session_type: record.session_type || 'both',
            submitted_at: new Date().toISOString()
          }]);
        
        if (error) {
          results.errors++;
          results.errorDetails.push({
            student: record.student_s_number,
            date: record.meeting_date,
            error: error.message
          });
          console.error(`❌ Error inserting attendance for ${record.student_s_number}:`, error);
        } else {
          results.success++;
        }
      }
      
      console.log(`✅ Bulk import complete! Success: ${results.success}, Skipped: ${results.skipped}, Errors: ${results.errors}`);
      return results;
    } catch (error) {
      console.error('❌ Error in bulk attendance import:', error);
      throw error;
    }
  }

  // ========== ANNOUNCEMENTS ==========

  static async getAllAnnouncements() {
    try {
      const { data: announcements, error } = await supabase
        .from('announcements')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      return announcements || [];
    } catch (error) {
      console.error('❌ Error getting announcements:', error);
      throw error;
    }
  }

  static async createAnnouncement(announcementData: any) {
    try {
      const insertData: any = {
        title: announcementData.title,
        message: announcementData.message,
        created_by: announcementData.createdBy || 'admin',
        date: new Date().toISOString()
      };

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

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Failed to create announcement:', error);
      throw error;
    }
  }

  static async deleteAnnouncement(announcementId: string) {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Failed to delete announcement:', error);
      throw error;
    }
  }

  static async getAllStudents(limit: number = 500) {  // Reduced default from 1000 to 500 to save egress
    try {
      // Optimize: Select only needed columns and add pagination/timeout handling
      // Reduced limit from 5000 to 1000 for better performance with large datasets
      // Note: If you have more than 1000 students, consider using search/filter instead
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, s_number, name, email, volunteering_hours, social_hours, total_hours, tshirt_size, account_status, account_created, last_login')
        .order('name', { ascending: true })
        .limit(limit); // Use parameterized limit (default 500) to save egress
      
      if (studentsError) {
        // Check for timeout errors
        if (studentsError.code === '57014' || studentsError.message?.includes('timeout')) {
          console.error('❌ Query timeout - database may be slow or need indexes. Error:', studentsError);
          return { data: [], error: studentsError };
        }
        throw studentsError;
      }
      if (!studentsData) return { data: [] };

      // Get all auth users (students who have created accounts) - optimized with limit
      const { data: authUsers, error: authError } = await supabase
        .from('auth_users')
        .select('s_number')
        .limit(limit); // Match students limit to save egress
      
      if (authError) {
        console.error('❌ Error getting auth users:', authError);
        // If we can't get auth users due to timeout, return all students (fallback)
        if (authError.code === '57014' || authError.message?.includes('timeout')) {
          console.warn('⚠️ Auth users query timed out, returning all students');
          return { data: studentsData };
        }
        // For other errors, still try to return students
        return { data: studentsData };
      }

      // Create a set of S-numbers that have accounts
      const accountSNumbers = new Set(
        (authUsers || []).map((au: any) => (au.s_number || '').toLowerCase())
      );

      // Filter to only include students with accounts
      const studentsWithAccounts = studentsData.filter((student: any) => {
        const sNumber = (student.s_number || student.student_s_number || '').toLowerCase();
        return accountSNumbers.has(sNumber);
      });
      
      return { data: studentsWithAccounts };
    } catch (error: any) {
      console.error('❌ Error getting all students:', error);
      // If it's a timeout, return empty array instead of throwing
      if (error.code === '57014' || error.message?.includes('timeout')) {
        console.warn('⚠️ Returning empty array due to timeout');
        return { data: [], error };
      }
      return { data: [], error };
    }
  }

  static async getAllStudentsForExport() {
    try {
      // Get ALL students from the database without filtering by account status
      // This is used for exports where we want complete data
      // Note: This may timeout with very large datasets (>10,000 students)
      // If it times out, consider adding pagination or date filtering
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('name', { ascending: true });
      
      if (studentsError) {
        // Check for timeout errors
        if (studentsError.code === '57014' || studentsError.message?.includes('timeout')) {
          console.error('❌ Export query timeout - dataset may be too large. Consider adding pagination.');
          return { data: [], error: studentsError };
        }
        throw studentsError;
      }
      if (!studentsData) return { data: [] };
      
      return { data: studentsData };
    } catch (error: any) {
      console.error('❌ Error getting all students for export:', error);
      return { data: [], error };
    }
  }

  static async updateStudentHours(
    studentId: string, 
    newHours: number, 
    hoursType: 'volunteering' | 'social' | 'total' = 'total',
    createAuditRecord?: {
      studentSNumber: string;
      studentName: string;
      reason: string;
      eventName?: string;
    }
  ) {
    try {
      // Round hours to nearest 0.5
      const roundToHalf = (num: number) => Math.round(num * 2) / 2;
      const roundedHours = roundToHalf(newHours);
      
      console.log('📊 Updating student hours:', studentId, 'to', roundedHours, 'type:', hoursType);
      
      // Get current student data first (needed for audit trail and for 'total' type)
      const { data: studentBefore } = await supabase
        .from('students')
        .select('s_number, name, volunteering_hours, social_hours, total_hours')
        .eq('id', studentId)
        .single();
      
      if (!studentBefore) {
        throw new Error('Student not found');
      }

      const currentVolunteering = parseFloat(studentBefore.volunteering_hours || 0) || 0;
      const currentSocial = parseFloat(studentBefore.social_hours || 0) || 0;
      const currentTotal = parseFloat(studentBefore.total_hours || 0) || 0;
      
      let updateData: any = {};
      let hoursAdded = { volunteering: 0, social: 0 };
      
      if (hoursType === 'volunteering') {
        // Update volunteering_hours, trigger will update total_hours
        updateData = { volunteering_hours: roundedHours };
        hoursAdded.volunteering = roundedHours - currentVolunteering;
      } else if (hoursType === 'social') {
        // Update social_hours, trigger will update total_hours
        updateData = { social_hours: roundedHours };
        hoursAdded.social = roundedHours - currentSocial;
      } else {
        // For 'total', we need to adjust the total while preserving the ratio
        const currentTotalCalc = currentVolunteering + currentSocial;
        
        if (currentTotalCalc > 0) {
          // Preserve the ratio and round to nearest 0.5
          const volunteeringRatio = currentVolunteering / currentTotalCalc;
          const socialRatio = currentSocial / currentTotalCalc;
          
          // Calculate new hours preserving ratio
          let newVolunteering = roundedHours * volunteeringRatio;
          let newSocial = roundedHours * socialRatio;
          
          // Round to nearest 0.5
          newVolunteering = roundToHalf(newVolunteering);
          newSocial = roundToHalf(newSocial);
          
          // Ensure they sum to the new total (adjust if needed due to rounding)
          const sum = newVolunteering + newSocial;
          if (Math.abs(sum - roundedHours) > 0.01) {
            // Adjust the larger category to match the total
            const diff = roundedHours - sum;
            if (newVolunteering >= newSocial) {
              newVolunteering = roundToHalf(newVolunteering + diff);
            } else {
              newSocial = roundToHalf(newSocial + diff);
            }
          }
          
          updateData = {
            volunteering_hours: Math.max(0, newVolunteering),
            social_hours: Math.max(0, newSocial)
          };
          hoursAdded.volunteering = newVolunteering - currentVolunteering;
          hoursAdded.social = newSocial - currentSocial;
        } else {
          // If no hours yet, add all to volunteering (rounded to 0.5)
          updateData = { volunteering_hours: roundedHours };
          hoursAdded.volunteering = roundedHours;
        }
      }
      
      const { data: studentAfter, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', studentId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating student hours:', error);
        throw error;
      }
      
      // Create audit record if hours changed and audit info provided
      if (createAuditRecord && (hoursAdded.volunteering !== 0 || hoursAdded.social !== 0)) {
        try {
          // Create separate records for volunteering and social if both changed
          if (hoursAdded.volunteering !== 0) {
            const isAddition = hoursAdded.volunteering > 0;
            await this.createApprovedHourRequest({
              studentSNumber: createAuditRecord.studentSNumber || studentBefore.s_number || '',
              studentName: createAuditRecord.studentName || studentBefore.name || 'Unknown',
              eventName: createAuditRecord.eventName || `Manual Adjustment - ${isAddition ? 'Added' : 'Removed'} ${Math.abs(hoursAdded.volunteering)} volunteering hours`,
              eventDate: new Date().toISOString().split('T')[0],
              hoursRequested: Math.abs(hoursAdded.volunteering), // Always positive for the record
              description: `Manual ${hoursType} hour adjustment by admin. ${createAuditRecord.reason || 'No reason provided'}. Original volunteering hours: ${currentVolunteering}, New volunteering hours: ${studentAfter.volunteering_hours || 0}, Adjustment: ${isAddition ? '+' : ''}${hoursAdded.volunteering}`,
              type: 'volunteering',
              adminNotes: createAuditRecord.reason || 'Admin adjustment',
              reviewedBy: 'Admin'
            });
          }
          
          if (hoursAdded.social !== 0) {
            const isAddition = hoursAdded.social > 0;
            await this.createApprovedHourRequest({
              studentSNumber: createAuditRecord.studentSNumber || studentBefore.s_number || '',
              studentName: createAuditRecord.studentName || studentBefore.name || 'Unknown',
              eventName: createAuditRecord.eventName || `Manual Adjustment - ${isAddition ? 'Added' : 'Removed'} ${Math.abs(hoursAdded.social)} social credits`,
              eventDate: new Date().toISOString().split('T')[0],
              hoursRequested: Math.abs(hoursAdded.social), // Always positive for the record
              description: `Manual ${hoursType} hour adjustment by admin. ${createAuditRecord.reason || 'No reason provided'}. Original social credits: ${currentSocial}, New social credits: ${studentAfter.social_hours || 0}, Adjustment: ${isAddition ? '+' : ''}${hoursAdded.social}`,
              type: 'social',
              adminNotes: createAuditRecord.reason || 'Admin adjustment',
              reviewedBy: 'Admin'
            });
          }
        } catch (auditError: any) {
          // Log but don't fail if audit record creation fails
          console.warn('⚠️ Failed to create audit record (hours still updated):', auditError.message);
        }
      }
      
      console.log('✅ Student hours updated successfully');
      return studentAfter;
    } catch (error: any) {
      console.error('❌ Error updating student hours:', error);
      throw new Error(`Failed to update student hours: ${error.message}`);
    }
  }

  static async updateStudentHoursBoth(studentId: string, volunteeringHours: number, socialHours: number) {
    try {
      console.log('📊 Updating student hours (both):', studentId, 'volunteering:', volunteeringHours, 'social:', socialHours);
      
      // Update both hours atomically in a single operation
      const updateData = {
        volunteering_hours: volunteeringHours,
        social_hours: socialHours
      };
      
      const { data, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', studentId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating student hours:', error);
        throw error;
      }
      
      console.log('✅ Student hours updated successfully (both types)');
      return data;
    } catch (error: any) {
      console.error('❌ Error updating student hours:', error);
      throw new Error(`Failed to update student hours: ${error.message}`);
    }
  }

  static async createApprovedHourRequest(requestData: {
    studentSNumber: string;
    studentName: string;
    eventName: string;
    eventDate: string;
    hoursRequested: number;
    description: string;
    type: 'volunteering' | 'social';
    adminNotes: string;
    reviewedBy?: string;
  }) {
    try {
      console.log('📝 Creating approved hour request for audit trail...');
      
      const insertData: any = {
        student_s_number: requestData.studentSNumber.toLowerCase(),
        student_name: requestData.studentName,
        event_name: requestData.eventName,
        event_date: requestData.eventDate,
        hours_requested: requestData.hoursRequested,
        description: requestData.description,
        type: requestData.type || 'volunteering',
        status: 'approved',
        submitted_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
        reviewed_by: requestData.reviewedBy || 'Admin',
        admin_notes: requestData.adminNotes
      };
      
      const { data, error } = await supabase
        .from('hour_requests')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating approved hour request:', error);
        throw error;
      }
      
      console.log('✅ Approved hour request created successfully (no hours added - already updated)');
      return data;
    } catch (error: any) {
      console.error('❌ Error creating approved hour request:', error);
      throw new Error(`Failed to create approved hour request: ${error.message}`);
    }
  }

  private static extractPhotoToken(description?: string | null) {
    if (!description) return null;

    const dataUrlMatch = description.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/);
    if (dataUrlMatch && dataUrlMatch[0]) {
      return dataUrlMatch[0];
    }

    const embeddedMatch = description.match(/\[PHOTO_DATA:(.*?)\]/);
    if (embeddedMatch && embeddedMatch[1]) {
      return embeddedMatch[1];
    }

    return null;
  }

  private static parsePhotoToken(rawToken: string) {
    const dataUrlRegex = /^data:([^;]+);base64,(.+)$/;
    const match = rawToken.match(dataUrlRegex);

    if (match && match[1] && match[2]) {
      return {
        mimeType: match[1],
        base64Data: match[2]
      };
    }

    return {
      mimeType: 'image/jpeg',
      base64Data: rawToken
    };
  }

  private static getProofPhotoBucket() {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_PROOF_PHOTO_BUCKET) {
      return import.meta.env.VITE_PROOF_PHOTO_BUCKET as string;
    }
    return 'proof-photos';
  }

  private static createStorageToken(info: ProofPhotoStorageInfo) {
    const parts = [
      info.bucket ?? '',
      info.path ?? '',
      info.mimeType ?? '',
      info.fileName ?? ''
    ].map((part) => encodeURIComponent(part));

    return `[PHOTO_STORAGE:${parts.join('|')}]`;
  }

  private static base64ToUint8Array(base64: string) {
    const normalized = (base64 || '').replace(/\s+/g, '');

    if (typeof globalThis.atob === 'function') {
      const binaryString = globalThis.atob(normalized);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }

    if (typeof (globalThis as any).Buffer !== 'undefined') {
      return Uint8Array.from((globalThis as any).Buffer.from(normalized, 'base64'));
    }

    throw new Error('Base64 decoding is not supported in this environment.');
  }

  private static getExtensionFromMimeType(mimeType: string) {
    if (!mimeType) {
      return 'jpg';
    }
    const subtype = mimeType.split('/')[1] || 'jpeg';
    return subtype.split('+')[0];
  }

  private static async uploadProofPhotoToStorage(params: {
    base64Data: string;
    mimeType: string;
    studentIdentifier: string;
    eventIdentifier: string;
    fileName: string;
  }): Promise<ProofPhotoStorageInfo> {
    const bucket = this.getProofPhotoBucket();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomSuffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto.randomUUID as () => string)()
      : Math.random().toString(36).slice(2);

    const safeSegments = [
      params.studentIdentifier || 'student',
      params.eventIdentifier || 'event',
      timestamp,
      randomSuffix
    ].map((segment) => segment.replace(/[^a-zA-Z0-9-_]+/g, '_'));

    const pathSegments = safeSegments.filter(Boolean);
    const finalFileName = params.fileName || `${safeSegments[0] || 'proof'}_${timestamp}.${this.getExtensionFromMimeType(params.mimeType)}`;
    const storagePath = `${pathSegments.join('/')}/${finalFileName}`.replace(/\/+/g, '/');

    const bytes = this.base64ToUint8Array(params.base64Data);
    const blob = new Blob([bytes], { type: params.mimeType || 'image/jpeg' });

    const { error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, blob, {
        contentType: params.mimeType || 'image/jpeg',
        upsert: true
      });

    if (error) {
      throw error;
    }

    return {
      bucket,
      path: storagePath,
      fileName: finalFileName,
      mimeType: params.mimeType || 'image/jpeg'
    };
  }

  private static sanitizeForFilename(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
  }

  private static getProofUploadEndpoint() {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_UPLOAD_PROOF_ENDPOINT) {
      return import.meta.env.VITE_UPLOAD_PROOF_ENDPOINT as string;
    }
    return '/.netlify/functions/upload-proof';
  }

  private static async uploadProofPhotoToDrive(request: any) {
    try {
      // Check both 'descriptions' and 'description' field names
      const description = request?.descriptions || request?.description;
      const photoToken = this.extractPhotoToken(description);
      if (!photoToken) {
        console.log('ℹ️ No proof photo found for request', request?.id);
        return;
      }

      const { mimeType, base64Data } = this.parsePhotoToken(photoToken);
      if (!base64Data) {
        console.warn('⚠️ Proof photo data missing after parsing for request', request?.id);
        return;
      }

      const studentIdentifier = this.sanitizeForFilename(request?.student_s_number || request?.student_name || 'student');
      const eventIdentifier = this.sanitizeForFilename(request?.event_name || 'event');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      const fileNameParts = [studentIdentifier, eventIdentifier, timestamp].filter(Boolean);
      const fileNameBase = fileNameParts.join('_') || `proof_${timestamp}`;
      const extension = mimeType.split('/')[1] || 'jpg';
      const fileName = `${fileNameBase}.${extension}`;

      const endpoint = this.getProofUploadEndpoint();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          base64Data,
          mimeType,
          fileName,
          metadata: {
            requestId: request?.id,
            studentName: request?.student_name,
            studentNumber: request?.student_s_number,
            eventName: request?.event_name,
            eventDate: request?.event_date,
            uploadedAt: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to upload proof photo to Drive:', errorText);
      } else {
        const result = await response.json();
        console.log('✅ Proof photo uploaded to Drive:', result);
      }
    } catch (error) {
      console.error('❌ Error uploading proof photo to Drive:', error);
    }
  }
}

export default SupabaseService;

