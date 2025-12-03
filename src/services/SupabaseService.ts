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

      // Test Supabase connection first
      console.log('🧪 Testing Supabase connection...');
      const { error: testError } = await supabase
        .from('students')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('❌ Supabase connection test failed:', testError);
        throw new Error(`Database connection failed: ${testError.message}`);
      }
      console.log('✅ Supabase connection test passed');

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
      
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('event_date');

      if (eventsError) {
        console.error('❌ Error getting events:', eventsError);
        throw eventsError;
      }
      
      if (!eventsData || eventsData.length === 0) {
        return [];
      }

      const eventIds = eventsData.map(event => event.id);
      
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('event_attendees')
        .select('*')
        .in('event_id', eventIds)
        .order('registered_at');

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

  static async getAllHourRequests() {
    try {
      const { data, error } = await supabase
        .from('hour_requests')
        .select('*')
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all hour requests:', error);
      throw error;
    }
  }

  static async searchHourRequests(searchTerm: string, status: string = 'pending', limit: number = 100) {
    try {
      let query = supabase
        .from('hour_requests')
        .select('*');

      // Filter by status if specified
      if (status !== 'all') {
        query = query.eq('status', status);
      }

      // Apply search - Supabase text search using ilike (case-insensitive)
      if (searchTerm.trim()) {
        const searchPattern = `%${searchTerm.trim()}%`;
        // Use .or() with proper Supabase PostgREST syntax
        // Format: column.operator.value,column2.operator.value
        query = query.or(`student_name.ilike.${searchPattern},student_s_number.ilike.${searchPattern},event_name.ilike.${searchPattern},description.ilike.${searchPattern}`);
      }

      // Order and limit
      query = query
        .order('submitted_at', { ascending: true })
        .limit(limit);

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching hour requests:', error);
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

      // If the request was approved, subtract the hours from the student's total
      if (request.status === 'approved' && request.student_s_number) {
        const studentSNumber = request.student_s_number;
        const student = await this.getStudent(studentSNumber);
        
        if (student) {
          const requestedHours = parseFloat(request.hours_requested || 0);
          const hoursType = (request.type || 'volunteering').toLowerCase();
          
          if (!isNaN(requestedHours) && requestedHours > 0) {
            if (hoursType === 'social') {
              // Subtract from social_hours
              const currentSocialHours = parseFloat(student.social_hours || 0);
              const newSocialHours = Math.max(0, currentSocialHours - requestedHours);
              
              await this.updateStudent(studentSNumber, {
                social_hours: newSocialHours,
                last_hour_update: new Date().toISOString()
              });
              
              console.log(`✅ Subtracted ${requestedHours} social credits from student ${studentSNumber}`);
              console.log(`   Previous: ${currentSocialHours}, New: ${newSocialHours}`);
            } else {
              // Subtract from volunteering_hours (default)
              const currentVolunteeringHours = parseFloat(student.volunteering_hours || 0);
              const newVolunteeringHours = Math.max(0, currentVolunteeringHours - requestedHours);
              
              await this.updateStudent(studentSNumber, {
                volunteering_hours: newVolunteeringHours,
                last_hour_update: new Date().toISOString()
              });
              
              console.log(`✅ Subtracted ${requestedHours} volunteering hours from student ${studentSNumber}`);
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

      const normalizedStatus = (status || '').toString().trim().toLowerCase();
      
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
            const newSocialHours = currentSocialHours + requestedHours;
            
            await this.updateStudent(studentSNumber, {
              social_hours: newSocialHours,
              last_hour_update: new Date().toISOString()
            });
            
            console.log(`✅ Added ${requestedHours} social credits to student ${studentSNumber}`);
          } else {
            // Default: Add approved hours to volunteering_hours
            const currentVolunteeringHours = parseFloat(student.volunteering_hours || 0);
            const newVolunteeringHours = currentVolunteeringHours + requestedHours;
            
            await this.updateStudent(studentSNumber, {
              volunteering_hours: newVolunteeringHours,
              last_hour_update: new Date().toISOString()
            });
            
            console.log(`✅ Added ${requestedHours} volunteering hours to student ${studentSNumber}`);
          }
          
          // The trigger will automatically update total_hours
          console.log('✅ Student hours updated successfully');

          await this.uploadProofPhotoToDrive({
            ...request,
            student_s_number: studentSNumber
          });
        }
      }

      return request;
    } catch (error) {
      console.error('❌ Error updating hour request status:', error);
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
      const { data, error } = await supabase
        .from('hour_requests')
        .select(
          `
            id,
            student_name,
            student_s_number,
            event_name,
            event_date,
            description,
            image_name,
            status,
            hours_requested,
            submitted_at,
            reviewed_at
          `
        )
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching proof photo library:', error);
        throw error;
      }

      const results = (data || [])
        .filter((request) => {
          if (!request?.description) {
            return false;
          }

          const hasPhoto = /\[PHOTO_DATA:(.*?)\]/.test(request.description) || /data:image\/[^;]+;base64,/.test(request.description);
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
          const photoToken = this.extractPhotoToken(request.description);
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
            description: request.description,
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

  static async getAllStudents() {
    try {
      // First get all students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('name', { ascending: true });
      
      if (studentsError) throw studentsError;
      if (!studentsData) return { data: [] };

      // Get all auth users (students who have created accounts)
      const { data: authUsers, error: authError } = await supabase
        .from('auth_users')
        .select('s_number');
      
      if (authError) {
        console.error('❌ Error getting auth users:', authError);
        // If we can't get auth users, return all students (fallback)
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
    } catch (error) {
      console.error('❌ Error getting all students:', error);
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
      const photoToken = this.extractPhotoToken(request?.description);
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

