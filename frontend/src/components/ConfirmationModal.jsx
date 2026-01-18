// frontend/src/components/ConfirmationModal.jsx
import React from 'react';
import styles from './ConfirmationModal.module.css';

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", isDanger = false }) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
          <button 
            onClick={() => { onConfirm(); onClose(); }} 
            className={`${styles.confirmBtn} ${isDanger ? styles.danger : ''}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}