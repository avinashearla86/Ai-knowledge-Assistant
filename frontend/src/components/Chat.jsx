import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast'; // Toast for messages
import { sendMessage, getChatHistory, clearChatHistory } from '../api';
import styles from './Chat.module.css';
import ConfirmationModal from './ConfirmationModal'; // Import Modal

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal State
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  useEffect(() => { loadChatHistory(); }, []);

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory();
      const formattedMessages = [];
      history.reverse().forEach(chat => {
        formattedMessages.push({ role: 'user', content: chat.user_message });
        formattedMessages.push({ role: 'assistant', content: chat.assistant_message, sources: chat.sources });
      });
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await sendMessage(currentInput);
      setMessages(prev => [...prev, { role: 'assistant', content: response.assistant_message, sources: response.sources }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + error.message }]);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  // Logic to clear chat after confirmation
  const handleClearConfirm = async () => {
    try {
      await clearChatHistory();
      setMessages([]);
      toast.success('Conversation cleared successfully');
    } catch (error) {
      toast.error('Failed to clear conversation');
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. The Confirmation Modal */}
      <ConfirmationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleClearConfirm}
        title="Clear Conversation?"
        message="This will remove all messages from this chat history. You cannot undo this."
        confirmText="Clear Chat"
        isDanger={true}
      />

      <div className={styles.messagesArea}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>👋</div>
            <p className={styles.emptyTitle}>Welcome to your Personal Knowledge Assistant</p>
            <p className={styles.emptySubtitle}>Upload documents to the left and ask me anything about them.</p>
          </div>
        ) : (
          <>
            <div className={styles.clearButtonWrapper}>
              {/* 2. Button opens the modal instead of window.confirm */}
              <button onClick={() => setIsModalOpen(true)} className={styles.clearButton}>
                Clear Conversation
              </button>
            </div>
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.messageWrapperUser : styles.messageWrapperAssistant}`}>
                <div className={`${styles.messageBubble} ${msg.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAssistant}`}>
                  <div className={styles.markdownContent}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                        ul: ({node, ...props}) => <ul className={styles.markdownList} {...props} />,
                        ol: ({node, ...props}) => <ol className={styles.markdownList} {...props} />,
                        li: ({node, ...props}) => <li className={styles.markdownListItem} {...props} />,
                        a: ({node, ...props}) => <a className={styles.markdownLink} target="_blank" rel="noopener noreferrer" {...props} />,
                        code: ({node, inline, ...props}) => inline ? <code className={styles.inlineCode} {...props} /> : <code className={styles.blockCode} {...props} />
                      }}>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.sources && msg.sources.length > 0 && <div className={styles.sources}><strong>📚 Sources:</strong> {msg.sources.join(', ')}</div>}
                </div>
              </div>
            ))}
            {loading && <div className={styles.loadingWrapper}><div className={styles.loadingBubble}><div className={styles.typingDot}></div><div className={styles.typingDot}></div><div className={styles.typingDot}></div></div></div>}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()} placeholder="Ask a question about your documents..." disabled={loading} className={styles.input} />
          <button onClick={handleSend} disabled={loading || !input.trim()} className={styles.sendButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}