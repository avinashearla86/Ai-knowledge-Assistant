import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast'; 
import { getDocuments, deleteDocument, updateDocument } from '../api';
import styles from './DocumentList.module.css';
import ConfirmationModal from './ConfirmationModal'; 

export default function DocumentList({ refresh }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  
  // Modal State
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: '', doc: null });

  const loadDocuments = async () => {
    try {
      const docs = await getDocuments();
      const safeDocs = (docs || []).map(d => ({ ...d, is_starred: !!d.is_starred, is_deleted: !!d.is_deleted }));
      setDocuments(safeDocs);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { loadDocuments(); }, [refresh]);

  // --- ACTIONS ---
  const handleToggleStar = async (doc) => {
    const newVal = !doc.is_starred;
    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, is_starred: newVal } : d));
    try { await updateDocument(doc.id, { is_starred: newVal }); } catch (error) { loadDocuments(); }
  };

  // --- MODAL CONFIGURATION ---
  const triggerDelete = (doc) => {
    setModalConfig({
      isOpen: true, type: 'soft-delete', doc,
      title: 'Move to Trash?',
      message: `Are you sure you want to move "${doc.filename}" to the trash?`,
      confirmText: 'Move to Trash', isDanger: true
    });
  };

  const triggerRestore = (doc) => {
    setModalConfig({
      isOpen: true, type: 'restore', doc,
      title: 'Restore Document?',
      message: `Are you sure you want to restore "${doc.filename}"?`,
      confirmText: 'Restore', isDanger: false
    });
  };

  const onConfirmAction = async () => {
    const { type, doc } = modalConfig;
    if (!doc) return;

    if (type === 'soft-delete') {
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, is_deleted: true } : d));
      await updateDocument(doc.id, { is_deleted: true });
      toast.success('Moved to trash');
    } else if (type === 'restore') {
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, is_deleted: false } : d));
      await updateDocument(doc.id, { is_deleted: false });
      toast.success('Restored successfully');
    }
    setModalConfig({ isOpen: false, type: '', doc: null });
  };

  // --- EDIT ---
  const startEditing = (doc) => { setEditingId(doc.id); setEditName(doc.filename); };
  const saveEdit = async () => {
    if (!editName.trim()) return;
    try {
      const updated = await updateDocument(editingId, { filename: editName });
      setDocuments(prev => prev.map(d => d.id === editingId ? { ...updated, is_starred: !!updated.is_starred, is_deleted: !!updated.is_deleted } : d));
      setEditingId(null);
      toast.success('Name updated');
    } catch (error) { toast.error('Update failed'); }
  };

  // --- FILTERING ---
  const activeDocs = documents.filter(d => !d.is_deleted);
  const deletedDocs = documents.filter(d => d.is_deleted);
  const recentDocs = [...activeDocs].sort((a, b) => new Date(b.upload_date) - new Date(a.upload_date)).slice(0, 4);
  const starredDocs = activeDocs.filter(d => d.is_starred);
  const allDocs = activeDocs;

  // --- RENDER HELPERS ---
  const renderCard = (doc) => (
    <div key={doc.id} className={styles.card}>
      <div className={styles.cardIcon}>📄</div>
      <div className={styles.cardContent}>
        <div className={styles.cardTitle} title={doc.filename}>{doc.filename}</div>
        <div className={styles.cardMeta}>{new Date(doc.upload_date).toLocaleDateString()}</div>
        <div className={styles.cardMeta}>{doc.chunk_count} chunks</div>
      </div>
      <button onClick={() => handleToggleStar(doc)} className={`${styles.cardStarBtn} ${doc.is_starred ? styles.starred : ''}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill={doc.is_starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
      </button>
    </div>
  );

  const renderRow = (doc, showActions = false, isRestoreMode = false) => (
    <div key={doc.id} className={styles.row}>
      {!isRestoreMode && (
        <button onClick={() => handleToggleStar(doc)} className={`${styles.starBtn} ${doc.is_starred ? styles.starred : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={doc.is_starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </button>
      )}
      <div className={styles.info}>
        {editingId === doc.id ? (
          <div className={styles.editWrapper}>
            <input className={styles.editInput} value={editName} onChange={e => setEditName(e.target.value)} autoFocus />
            <button onClick={saveEdit} className={styles.saveActionBtn}>Save</button>
            <button onClick={() => setEditingId(null)} className={styles.cancelActionBtn}>Cancel</button>
          </div>
        ) : (
          <div className={styles.nameWrapper}>
            <span className={styles.icon}>📄</span>
            <span className={styles.filename} title={doc.filename}>{doc.filename}</span>
          </div>
        )}
        <div className={styles.meta}>{new Date(doc.upload_date).toLocaleDateString()} • {doc.chunk_count} chunks</div>
      </div>
      <div className={styles.actions}>
        {isRestoreMode ? (
          <button onClick={() => triggerRestore(doc)} className={styles.restoreBtn}>Restore</button>
        ) : showActions && (
          <>
            <button onClick={() => startEditing(doc)} className={styles.iconBtn} title="Rename">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button onClick={() => triggerDelete(doc)} className={`${styles.iconBtn} ${styles.deleteBtn}`} title="Move to Trash">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </>
        )}
      </div>
    </div>
  );

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.container}>
      <ConfirmationModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onConfirm={onConfirmAction}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        isDanger={modalConfig.isDanger}
      />

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`} onClick={() => setActiveTab('all')}>All Documents</button>
        <button className={`${styles.tab} ${activeTab === 'deleted' ? styles.activeTab : ''}`} onClick={() => setActiveTab('deleted')}>Recently Deleted</button>
      </div>

      <div className={styles.list}>
        {activeTab === 'all' ? (
          <>
            {recentDocs.length > 0 && <div className={styles.section}><h4 className={styles.sectionTitle}>Recent</h4><div className={styles.gridContainer}>{recentDocs.map(doc => renderCard(doc))}</div></div>}
            {starredDocs.length > 0 && <div className={styles.section}><h4 className={styles.sectionTitle}>Starred</h4><div className={styles.gridContainer}>{starredDocs.map(doc => renderCard(doc))}</div></div>}
            <div className={styles.section}><h4 className={styles.sectionTitle}>All Documents ({allDocs.length})</h4>{allDocs.length === 0 ? <div className={styles.empty}>No documents uploaded yet.</div> : allDocs.map(doc => renderRow(doc, true))}</div>
          </>
        ) : (
          <div className={styles.section}>{deletedDocs.length === 0 ? <div className={styles.empty}>Trash is empty.</div> : deletedDocs.map(doc => renderRow(doc, false, true))}</div>
        )}
      </div>
    </div>
  );
}