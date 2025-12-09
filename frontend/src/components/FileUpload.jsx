import React, { useState } from 'react';
import { uploadFile } from '../api';

export default function FileUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    try {
      await uploadFile(file);
      setFile(null);
      onUploadSuccess();
      alert('File uploaded successfully!');
    } catch (error) {
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#2563eb' : '#d1d5db'}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          textAlign: 'center',
          backgroundColor: dragActive ? '#eff6ff' : 'white',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
      >
        <input
          type="file"
          id="file-upload"
          onChange={handleChange}
          accept=".pdf,.docx,.txt"
          style={{ display: 'none' }}
        />
        <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📁</div>
          <p style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '0.5rem' }}>
            {file ? file.name : 'Drop your file here or click to browse'}
          </p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Supported: PDF, DOCX, TXT (Max 10MB)
          </p>
        </label>
      </div>
      
      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          style={{
            marginTop: '1rem',
            width: '100%',
            padding: '0.75rem',
            backgroundColor: uploading ? '#d1d5db' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: uploading ? 'not-allowed' : 'pointer'
          }}
        >
          {uploading ? 'Uploading...' : 'Upload and Process'}
        </button>
      )}
    </div>
  );
}