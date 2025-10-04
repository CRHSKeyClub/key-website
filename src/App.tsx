import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { EventsProvider } from './contexts/EventsContext';
import { HourProvider } from './contexts/HourContext';
import { ModalProvider } from './contexts/ModalContext';
import AppRouter from './router/AppRouter';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <EventsProvider>
          <HourProvider>
            <ModalProvider>
              <AppRouter />
            </ModalProvider>
          </HourProvider>
        </EventsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

