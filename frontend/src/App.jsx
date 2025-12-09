import React, { useState } from 'react';
import Chat from './components/Chat';
import FileUpload from './components/FileUpload';
import DocumentList from './components/DocumentList';

export default function App() {
  const [refreshDocs, setRefreshDocs] = useState(0);

  return (
    <div style={{ 
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f5f5',
      overflow: 'hidden'
    }}>
      {/* Fixed Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1.5rem 2rem',
        flexShrink: 0
      }}>
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          margin: 0
        }}>
          AI Personal Knowledge Assistant
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
          🔒 Upload documents • 🧠 Vector embeddings • 💬 RAG-powered chat
        </p>
      </div>

      {/* Main Content - Fixed Height Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '400px 1fr',
        gap: '1.5rem',
        padding: '1.5rem',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden'
      }}>
        
        {/* Left Panel - Documents */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* Fixed Upload Section */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            flexShrink: 0
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: '1rem',
              margin: '0 0 1rem 0'
            }}>
              📁 Upload Documents
            </h2>
            <FileUpload onUploadSuccess={() => setRefreshDocs(prev => prev + 1)} />
          </div>
          
          {/* Scrollable Documents List */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <DocumentList refresh={refreshDocs} />
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Fixed Chat Header */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #e5e7eb',
            flexShrink: 0
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: 0
            }}>
              💬 Chat with your Documents
            </h2>
          </div>
          
          {/* Chat Component (handles its own scrolling) */}
          <Chat />
        </div>
      </div>
    </div>
  );
}