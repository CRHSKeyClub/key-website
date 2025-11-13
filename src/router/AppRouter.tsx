import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import SplashAnimationScreen from '../screens/SplashAnimationScreen';
import Navbar from '../components/Navbar';

// Auth Screens
import LandingScreen from '../screens/LandingScreen';
import AdminLoginScreen from '../screens/AdminLoginScreen';
import StudentLoginScreen from '../screens/StudentLoginScreen';
import StudentVerificationScreen from '../screens/StudentVerificationScreen';
import StudentAccountCreationScreen from '../screens/StudentAccountCreationScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Main Screens
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import EventScreen from '../screens/EventScreen';
import EventCreationScreen from '../screens/EventCreationScreen';
import EventDeletionScreen from '../screens/EventDeletionScreen';
import AttendeeListScreen from '../screens/AttendeeListScreen';
import OfficersScreen from '../screens/OfficersScreen';
import ContactScreen from '../screens/ContactScreen';
import HourRequestScreen from '../screens/HourRequestScreen';
import StudentHourRequestsScreen from '../screens/StudentHourRequestsScreen';
import AdminHourManagementScreen from '../screens/AdminHourManagementScreen';
import AnnouncementsScreen from '../screens/AnnouncementsScreen';
import CreateAnnouncementScreen from '../screens/CreateAnnouncementScreen';
import AdminStudentManagementScreen from '../screens/AdminStudentManagementScreen';
import AdminMeetingManagementScreen from '../screens/AdminMeetingManagementScreen';
import AdminTshirtManagementScreen from '../screens/AdminTshirtManagementScreen';
import StudentMeetingAttendanceScreen from '../screens/StudentMeetingAttendanceScreen';
import SocialMediaScreen from '../screens/SocialMediaScreen';
import PublicEventsScreen from '../screens/PublicEventsScreen';
import NewsletterScreen from '../screens/NewsletterScreen';
import AnimationScreen from '../screens/AnimationScreen';
import AdminPhotoLibraryScreen from '../screens/AdminPhotoLibraryScreen';

// Layout component for authenticated routes with navbar
function AuthenticatedLayout() {
  return (
    <Navbar>
      <Outlet />
    </Navbar>
  );
}

function AppRouter() {
  const { isAuthenticated, loading, showAnimation, showSplashAnimation, hideSplashAnimation } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return <LoadingScreen />;
  }

  // Show initial splash animation when app first loads
  if (showSplashAnimation) {
    return <SplashAnimationScreen onAnimationComplete={hideSplashAnimation} />;
  }

  // Show animation screen when logging in
  if (showAnimation) {
    return <AnimationScreen />;
  }

  return (
    <Routes>
      {!isAuthenticated ? (
        // Auth Routes
        <>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/admin-login" element={<AdminLoginScreen />} />
          <Route path="/student-login" element={<StudentLoginScreen />} />
          <Route path="/student-verification" element={<StudentVerificationScreen />} />
          <Route path="/student-registration" element={<StudentAccountCreationScreen />} />
          <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
          <Route path="/public-events" element={<PublicEventsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        // Authenticated Routes with Navbar
        <Route element={<AuthenticatedLayout />}>
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/event/:eventId" element={<EventScreen />} />
          <Route path="/event-creation" element={<EventCreationScreen />} />
          <Route path="/event-deletion" element={<EventDeletionScreen />} />
          <Route path="/attendee-list/:eventId" element={<AttendeeListScreen />} />
          <Route path="/officers" element={<OfficersScreen />} />
          <Route path="/contact" element={<ContactScreen />} />
          <Route path="/hour-request" element={<HourRequestScreen />} />
          <Route path="/hour-requests" element={<StudentHourRequestsScreen />} />
          <Route path="/admin-hour-management" element={<AdminHourManagementScreen />} />
          <Route path="/announcements" element={<AnnouncementsScreen />} />
          <Route path="/create-announcement" element={<CreateAnnouncementScreen />} />
          <Route path="/admin-students" element={<AdminStudentManagementScreen />} />
          <Route path="/admin-meetings" element={<AdminMeetingManagementScreen />} />
          <Route path="/admin-tshirt-management" element={<AdminTshirtManagementScreen />} />
          <Route path="/admin-photo-library" element={<AdminPhotoLibraryScreen />} />
          <Route path="/meeting-attendance" element={<StudentMeetingAttendanceScreen />} />
          <Route path="/social-media" element={<SocialMediaScreen />} />
          <Route path="/public-events" element={<PublicEventsScreen />} />
          <Route path="/newsletters" element={<NewsletterScreen />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      )}
    </Routes>
  );
}

export default AppRouter;

