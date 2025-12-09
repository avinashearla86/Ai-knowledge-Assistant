import React, { useState, useRef, useEffect } from 'react';
import { sendMessage, getChatHistory, clearChatHistory } from '../api';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Load chat history on component mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory();
      const formattedMessages = [];
      history.reverse().forEach(chat => {
        formattedMessages.push({
          role: 'user',
          content: chat.user_message
        });
        formattedMessages.push({
          role: 'assistant',
          content: chat.assistant_message,
          sources: chat.sources
        });
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
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.assistant_message,
        sources: response.sources
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error: ' + error.message
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!confirm('Are you sure you want to clear the chat history?')) return;
    
    try {
      await clearChatHistory();
      setMessages([]);
    } catch (error) {
      alert('Error clearing chat history: ' + error.message);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      flex: 1,
      minHeight: 0,
      overflow: 'hidden'
    }}>
      {/* Scrollable Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        backgroundColor: '#f9fafb',
        minHeight: 0
      }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '3rem', color: '#6b7280' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
            <p style={{ margin: '0 0 0.5rem 0' }}>Ask questions about your uploaded documents!</p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>Upload documents first, then I'll answer based only on your files.</p>
          </div>
        ) : (
          <>
            {messages.length > 0 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                marginBottom: '1rem' 
              }}>
                <button
                  onClick={handleClearChat}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  🗑️ Clear Chat
                </button>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '1rem'
                }}
              >
                <div style={{
                  maxWidth: '75%',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  backgroundColor: msg.role === 'user' ? '#2563eb' : 'white',
                  color: msg.role === 'user' ? 'white' : 'black',
                  boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {msg.content}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{
                      marginTop: '0.75rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #e5e7eb',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      <strong>📚 Sources:</strong> {msg.sources.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  backgroundColor: 'white',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #e5e7eb',
                    borderTopColor: '#2563eb',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Fixed Input Area */}
      <div style={{
        borderTop: '1px solid #e5e7eb',
        padding: '1rem',
        backgroundColor: 'white',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask a question about your documents..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2563eb'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: (loading || !input.trim()) ? '#d1d5db' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
              fontWeight: '500',
              fontSize: '1rem',
              transition: 'background-color 0.2s'
            }}
          >
            {loading ? '⏳' : '➤'} Send
          </button>
        </div>
      </div>
    </div>
  );
}