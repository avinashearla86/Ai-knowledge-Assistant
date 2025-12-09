import React, { useEffect, useState } from 'react';
import { getDocuments, deleteDocument } from '../api';

export default function DocumentList({ refresh }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [refresh]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await deleteDocument(id);
      loadDocuments();
    } catch (error) {
      alert('Error deleting document: ' + error.message);
    }
  };

  if (loading) return <div>Loading documents...</div>;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      minHeight: 0 
    }}>
      <h3 style={{ 
        fontSize: '1.25rem', 
        fontWeight: '600', 
        marginBottom: '1rem',
        flexShrink: 0,
        margin: '0 0 1rem 0'
      }}>
        Documents ({documents.length})
      </h3>
      
      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        minHeight: 0
      }}>
        {documents.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
            No documents uploaded yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {documents.map(doc => (
              <div
                key={doc.id}
                style={{
                  backgroundColor: '#f9fafb',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontWeight: '600', 
                    marginBottom: '0.25rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    📄 {doc.filename}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {doc.chunk_count} chunks • {new Date(doc.upload_date).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginLeft: '1rem',
                    flexShrink: 0
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}