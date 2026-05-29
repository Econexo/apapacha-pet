import React from 'react';
import { Modal } from 'react-native';
import { ToastProvider } from './Toast';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function OverlayModal({ visible, onClose, children }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <ToastProvider>
        {children}
      </ToastProvider>
    </Modal>
  );
}
