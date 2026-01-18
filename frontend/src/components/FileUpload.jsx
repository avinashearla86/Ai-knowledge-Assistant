import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast'; // Import Toast
import { uploadFile } from '../api';
import styles from './FileUpload.module.css';

export default function FileUpload({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploading(true);

      // This creates the Loading -> Success/Error popup flow automatically
      await toast.promise(
        uploadFile(file),
        {
          loading: 'Uploading file...',
          success: 'File uploaded successfully!',
          error: (err) => `Upload failed: ${err.message}`,
        }
      ).then(() => {
        onUploadSuccess();
      }).catch((err) => {
        console.error(err);
      }).finally(() => {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      });
    }
  };

  return (
    <div>
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} accept=".pdf,.docx,.txt" />
      <button className={styles.uploadBtn} onClick={() => fileInputRef.current.click()} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload File(s)'}
      </button>
    </div>
  );
}