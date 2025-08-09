import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EventsProvider } from './contexts/EventsContext';
import { HourProvider } from './contexts/HourContext';
import { ModalProvider } from './contexts/ModalContext';
import AppNavigator from './navigation/AppNavigator';
import { preventFocusOnHidden } from './utils/AccessibilityHelper';
import { applyChromeOptimizations } from './utils/ChromeCompatibilityHelper';

function AuthenticatedApp() {
  const { isAuthenticated, isAdmin } = useAuth();
  
  useEffect(() => {
    console.log("Auth state in App:", { isAuthenticated, isAdmin });
  }, [isAuthenticated, isAdmin]);

  return (
    <>
      <StatusBar style="auto" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  // Add web-specific styles to override body overflow and fix accessibility
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Override the default Expo web styles that disable body scrolling
      const style = document.createElement('style');
      style.textContent = `
        body {
          overflow: auto !important;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        html {
          overflow: auto !important;
        }
        #root {
          overflow: auto !important;
        }
        /* Fix ARIA accessibility issues */
        [aria-hidden="true"] {
          pointer-events: none !important;
        }
        [aria-hidden="true"] * {
          pointer-events: none !important;
        }
        /* Ensure focused elements are not hidden */
        [aria-hidden="true"]:focus,
        [aria-hidden="true"] *:focus {
          outline: none !important;
        }
        /* Prevent focus on hidden elements */
        [aria-hidden="true"] {
          tabindex: -1 !important;
        }
        /* Fix Chrome-specific rendering issues */
        * {
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
        }
        /* Prevent layout shifts */
        .scroll-view {
          will-change: auto !important;
        }
        /* Hide scrollbars while keeping scroll functionality */
        ::-webkit-scrollbar {
          width: 0px;
          height: 0px;
          background: transparent;
        }
        
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        
        ::-webkit-scrollbar-thumb {
          background: transparent;
        }
        
        /* Firefox scrollbar hiding */
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        
        /* Fix for HP Envy Chrome compatibility */
        @media screen and (-webkit-min-device-pixel-ratio: 0) {
          * {
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
          }
        }
        
        /* Ensure modals and overlays can extend beyond viewport */
        .modal-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          z-index: 999 !important;
        }
        
        /* Fix for React Native Modal on web */
        [data-testid="modal"] {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 999 !important;
        }
        
        /* Fix for sidebar clipping issues */
        [data-testid="modal"] {
          overflow: visible !important;
        }
        
        /* Specific fix for menu modal */
        .menu-modal {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 9999 !important;
        }
        
        /* Ensure absolute positioned elements can extend beyond container */
        .absolute-container {
          overflow: visible !important;
        }
        
        /* Force menu modal to be on top */
        [data-testid="modal"] {
          z-index: 9999 !important;
        }
        
        /* Ensure React Native Modal appears above everything */
        .react-native-modal {
          z-index: 9999 !important;
        }
        
        /* Specific styling for ConfirmationDialog */
        [data-testid="modal"] {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 99999 !important;
          overflow: visible !important;
        }
        
        /* Ensure the dialog container is properly positioned */
        [data-testid="modal"] > div {
          position: relative !important;
          z-index: 100000 !important;
        }
        
        /* Force modal to be at the very top level */
        body > div[data-testid="modal"] {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 999999 !important;
          pointer-events: auto !important;
        }
        
        /* Override any parent container constraints */
        * {
          overflow: visible !important;
        }
        
        /* Ensure modal is not constrained by parent containers */
        [data-testid="modal"] {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 999999 !important;
          overflow: visible !important;
          pointer-events: auto !important;
        }
      `;
      document.head.appendChild(style);
      
      // Inject Google Analytics (gtag.js) for web builds
      const existingGtagScript = document.querySelector(
        'script[src*="googletagmanager.com/gtag/js?id=G-83LGR20KDG"]'
      );
      if (!existingGtagScript) {
        const gtagScriptElement = document.createElement('script');
        gtagScriptElement.async = true;
        gtagScriptElement.src =
          'https://www.googletagmanager.com/gtag/js?id=G-83LGR20KDG';
        document.head.appendChild(gtagScriptElement);

        const gtagInlineScript = document.createElement('script');
        gtagInlineScript.text = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);} 
          gtag('js', new Date());

          gtag('config', 'G-83LGR20KDG');
        `;
        document.head.appendChild(gtagInlineScript);
      }

      // Apply focus management
      preventFocusOnHidden();
      
      // Apply Chrome-specific optimizations for HP Envy and similar devices
      applyChromeOptimizations();
      
      // Set up a mutation observer to handle dynamically added elements
      const observer = new MutationObserver(() => {
        preventFocusOnHidden();
        applyChromeOptimizations();
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-hidden', 'style']
      });
      
      return () => {
        observer.disconnect();
      };
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthProvider>
          <EventsProvider>
            <HourProvider>
              <ModalProvider>
                <AuthenticatedApp />
              </ModalProvider>
            </HourProvider>
          </EventsProvider>
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}