import axios from 'axios';
import type { Endpoint, RequestLog } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const api = {
  async generateUrl(): Promise<Endpoint> {
    const response = await apiClient.post('/api/generate-url');
    return response.data;
  },

  async getEndpoints(): Promise<Endpoint[]> {
    const response = await apiClient.get('/api/endpoints');
    return response.data;
  },

  async getRequestLogs(endpointId: string): Promise<RequestLog[]> {
    const response = await apiClient.get(`/api/endpoints/${endpointId}/logs`);
    return response.data;
  },

  async getRequestLog(logId: string): Promise<RequestLog> {
    const response = await apiClient.get(`/api/logs/${logId}`);
    return response.data;
  },

  async deleteEndpoint(endpointId: string): Promise<void> {
    await apiClient.delete(`/api/endpoints/${endpointId}`);
  }
};
