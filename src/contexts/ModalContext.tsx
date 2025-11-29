import { createContext, useContext, useState, ReactNode } from 'react';

interface ModalConfig {
  visible?: boolean;
  title: string;
  message: string;
  onCancel?: (() => void) | null;
  onConfirm?: (() => void) | null;
  cancelText?: string;
  confirmText?: string;
  confirmButtonColor?: string;
  confirmTextColor?: string;
  icon?: string;
  iconColor?: string;
  destructive?: boolean;
}

interface ModalContextType {
  showModal: (config: Omit<ModalConfig, 'visible'>) => void;
  hideModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider = ({ children }: ModalProviderProps) => {
  const [modal, setModal] = useState<ModalConfig>({
    visible: false,
    title: '',
    message: '',
    onCancel: null,
    onConfirm: null,
    cancelText: 'Cancel',
    confirmText: 'Confirm',
    confirmButtonColor: '#f1ca3b',
    confirmTextColor: 'white',
    icon: 'alert-circle',
    iconColor: '#f1ca3b',
    destructive: false
  });

  const showModal = (modalConfig: Omit<ModalConfig, 'visible'>) => {
    setModal({
      visible: true,
      ...modalConfig
    });
  };

  const hideModal = () => {
    setModal(prev => ({ ...prev, visible: false }));
  };

  const handleCancel = () => {
    if (modal.onCancel) {
      modal.onCancel();
    }
    hideModal();
  };

  const handleConfirm = () => {
    if (modal.onConfirm) {
      modal.onConfirm();
    }
    hideModal();
  };

  // Enhanced modal component with proper styling and icons
  const SimpleModal = () => {
    if (!modal.visible) return null;

    const getIcon = () => {
      switch (modal.icon) {
        case 'checkmark-circle':
          return (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          );
        case 'alert-circle':
          return (
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          );
        case 'trash':
          return (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          );
        default:
          return (
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          );
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={hideModal}>
        <div 
          className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl" 
          onClick={(e) => e.stopPropagation()}
        >
          {getIcon()}
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">{modal.title}</h2>
          <p className="text-gray-600 mb-6 text-center">{modal.message}</p>
          
          <div className="flex gap-3 justify-center">
            {modal.cancelText && modal.cancelText !== '' && (
              <button
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition-colors"
              >
                {modal.cancelText}
              </button>
            )}
            {modal.confirmText && modal.confirmText !== '' && (
              <button
                onClick={handleConfirm}
                className="px-6 py-2 rounded-lg text-white font-medium transition-colors"
                style={{
                  backgroundColor: modal.confirmButtonColor,
                  color: modal.confirmTextColor
                }}
              >
                {modal.confirmText}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      <SimpleModal />
    </ModalContext.Provider>
  );
};

