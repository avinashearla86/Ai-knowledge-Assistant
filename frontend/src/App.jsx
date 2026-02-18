import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast'; // Import Toaster
import Chat from './components/Chat';
import FileUpload from './components/FileUpload';
import DocumentList from './components/DocumentList';
import styles from './App.module.css';

export default function App() {
  const [refreshDocs, setRefreshDocs] = useState(0);

  return (
    <div className={styles.app}>
      {/* Enables Popups Globally */}
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          duration: 4000,
          style: {
            marginTop: '20px',
          },
        }} 
      />
      
      <div className={styles.mainContent}>
        <div className={styles.left}>
          <div className={styles.hubHeader}>
            <div>
              <h2 className={styles.hubTitle}>Personal Knowledge Assistant</h2>
              <p className={styles.hubSubtitle}>Manage your AI context</p>
            </div>
            <FileUpload onUploadSuccess={() => setRefreshDocs(prev => prev + 1)} />
          </div>
          <div className={styles.documentsSection}>
            <DocumentList refresh={refreshDocs} />
          </div>
        </div>

        <div className={styles.Right}>
          <div className={styles.rightPanel}>
            <div className={styles.chatHeader}>
              <h2 className={styles.chatTitle}>💬 Chat with your Documents</h2>
            </div>
            <Chat />
          </div>
        </div>
      </div>
    </div>
  );
}