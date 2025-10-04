import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import SupabaseService from '../services/SupabaseService';

interface User {
  sNumber: string;
  name: string;
  role: string;
  totalHours?: string | number;
  id?: string;
  authId?: string;
  loginTime: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: User | null;
  loginAsAdmin: (email: string, password: string) => Promise<boolean>;
  loginAsStudent: (sNumber: string, password: string) => Promise<boolean>;
  registerStudent: (sNumber: string, password: string, name: string) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  resetPassword: (sNumber: string, newPassword: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  loading: boolean;
  showAnimation: boolean;
  triggerAnimation: () => void;
  hideAnimation: () => void;
  showSplashAnimation: boolean;
  hideSplashAnimation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);
  const [showSplashAnimation, setShowSplashAnimation] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = localStorage.getItem('user');
        
        if (userData) {
          const parsedUser = JSON.parse(userData);
          console.log("Found stored user data:", parsedUser);
          
          if (parsedUser && (parsedUser.sNumber || parsedUser.role)) {
            setUser(parsedUser);
            
            if (parsedUser.sNumber === 'admin' || parsedUser.role === 'admin') {
              console.log("Restoring admin session");
              setIsAuthenticated(true);
              setIsAdmin(true);
            } 
            else if (parsedUser.sNumber && parsedUser.sNumber.startsWith('s')) {
              console.log("Restoring student session");
              setIsAuthenticated(true);
              setIsAdmin(false);
            } 
            else {
              console.log("Invalid stored user data - clearing");
              await clearAuthData();
            }
          } else {
            console.log("Invalid user data structure - clearing");
            await clearAuthData();
          }
        } else {
          console.log("No stored authentication found");
          setIsAuthenticated(false);
          setIsAdmin(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        await clearAuthData();
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const clearAuthData = async () => {
    try {
      localStorage.removeItem('user');
    } catch (e) {
      console.log("localStorage clear failed:", e);
    }
    
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setShowAnimation(false);
  };

  const storeUserData = async (userData: User) => {
    const userDataString = JSON.stringify(userData);
    localStorage.setItem('user', userDataString);
  };

  const triggerAnimation = () => {
    setShowAnimation(true);
  };

  const hideAnimation = () => {
    setShowAnimation(false);
  };

  const hideSplashAnimation = () => {
    setShowSplashAnimation(false);
  };

  const loginAsAdmin = async (email: string, password: string) => {
    try {
      console.log("Attempting admin login:", email);
      
      // Simple admin check - enhance with Supabase later
      if (email === 'admin@example.com' && password === 'password') {
        const adminUser: User = {
          sNumber: 'admin',
          name: 'Admin User',
          role: 'admin',
          totalHours: '0',
          id: 'admin-user',
          loginTime: new Date().toISOString()
        };
        
        await storeUserData(adminUser);
        setUser(adminUser);
        setIsAuthenticated(true);
        setIsAdmin(true);
        
        console.log("Admin login successful");
        return true;
      }
      
      alert('Invalid admin credentials.');
      return false;
    } catch (error) {
      console.error('Admin login error:', error);
      alert('An unexpected error occurred during login.');
      return false;
    }
  };

  const loginAsStudent = async (sNumber: string, password: string) => {
    try {
      console.log("Attempting student login with S-Number:", sNumber);
      
      if (!sNumber.startsWith('s')) {
        alert('Please enter a valid S-Number starting with "s".');
        return false;
      }
      
      const result = await SupabaseService.loginStudent(sNumber, password);
      
      if (result.success) {
        const studentUser: User = {
          ...result.user,
          loginTime: new Date().toISOString()
        };
        
        console.log("Student user object created:", studentUser);
        
        await storeUserData(studentUser);
        setUser(studentUser);
        setIsAuthenticated(true);
        setIsAdmin(false);
        
        console.log("Student login successful");
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Student login error:', error);
      alert(error.message || 'An unexpected error occurred during login.');
      return false;
    }
  };

  const registerStudent = async (sNumber: string, password: string, name: string) => {
    try {
      console.log("Attempting student registration:", sNumber);
      
      if (!sNumber.startsWith('s')) {
        alert('Please enter a valid S-Number starting with "s".');
        return false;
      }
      
      const result = await SupabaseService.registerStudent(sNumber, password, name);
      
      if (result.success) {
        console.log("Student registration successful");
        alert('Account created successfully! You can now log in.');
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Student registration error:', error);
      alert(error.message || 'An unexpected error occurred during registration.');
      return false;
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      if (!user?.sNumber) {
        throw new Error('No user logged in');
      }
      
      const result = await SupabaseService.changePassword(user.sNumber, oldPassword, newPassword);
      
      if (result.success) {
        alert('Password changed successfully');
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Password change error:', error);
      alert(error.message || 'Failed to change password');
      return false;
    }
  };

  const resetPassword = async (sNumber: string, newPassword: string) => {
    try {
      if (!isAdmin) {
        throw new Error('Only admins can reset passwords');
      }
      
      const result = await SupabaseService.resetPassword(sNumber, newPassword);
      
      if (result.success) {
        alert('Password reset successfully');
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Password reset error:', error);
      alert(error.message || 'Failed to reset password');
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log("Logging out user");
      await clearAuthData();
      console.log("User logged out");
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setShowAnimation(false);
      return false;
    }
  };

  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAdmin,
        user,
        loginAsAdmin,
        loginAsStudent,
        registerStudent,
        changePassword,
        resetPassword,
        logout,
        loading,
        showAnimation,
        triggerAnimation,
        hideAnimation,
        showSplashAnimation,
        hideSplashAnimation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

