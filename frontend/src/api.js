import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${API_URL}/api/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const getDocuments = async () => {
  const response = await axios.get(`${API_URL}/api/documents`);
  return response.data;
};

export const updateDocument = async (id, updates) => {
  const response = await axios.patch(`${API_URL}/api/documents/${id}`, updates);
  return response.data;
};

export const deleteDocument = async (id) => {
  const response = await axios.delete(`${API_URL}/api/documents/${id}`);
  return response.data;
};

export const sendMessage = async (message) => {
  const response = await axios.post(`${API_URL}/api/chat`, { message });
  return response.data;
};

export const getChatHistory = async () => {
  const response = await axios.get(`${API_URL}/api/chat/history`);
  return response.data;
};

export const clearChatHistory = async () => {
  const response = await axios.delete(`${API_URL}/api/chat/history`);
  return response.data;
};