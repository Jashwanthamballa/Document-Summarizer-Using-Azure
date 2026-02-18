import axios from 'axios';
import {
  MultiPDFResponse,
  UploadSessionResponse,
  SummaryResponse,
  SessionsResponse,
} from '../types/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: '/api', // Proxied to http://localhost:8000 by Vite
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes timeout for long-running operations
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: any) => {
    console.error('API Error:', error);
    
    if (error.response?.status === 422) {
      throw new Error('Invalid input data. Please check your files and try again.');
    }
    
    if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    }
    
    throw error;
  }
);

export class ApiService {
  /**
   * Upload single PDF file (backward compatibility)
   */
  static async uploadSinglePDF(file: File): Promise<SummaryResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<SummaryResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  /**
   * Upload multiple PDF files
   */
  static async uploadMultiplePDFs(files: File[]): Promise<UploadSessionResponse> {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    const response = await api.post<UploadSessionResponse>('/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  /**
   * Get session results by session ID
   */
  static async getSessionResults(sessionId: string): Promise<MultiPDFResponse> {
    const response = await api.get<MultiPDFResponse>(`/session/${sessionId}`);
    return response.data;
  }

  /**
   * Poll session results until completion
   */
  static async pollSessionResults(
    sessionId: string,
    onProgress?: (response: MultiPDFResponse) => void,
    maxAttempts: number = 60 // 5 minutes with 5-second intervals
  ): Promise<MultiPDFResponse> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await this.getSessionResults(sessionId);
        
        if (onProgress) {
          onProgress(response);
        }
        
        if (response.status === 'completed' || response.status === 'failed' || response.status === 'partial') {
          return response;
        }
        
        // Wait 5 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
        
      } catch (error: any) {
        console.error('Error polling session results:', error);
        
        // If it's a 404, the session might not exist yet, keep trying
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error('Polling timeout: Session did not complete within expected time');
  }

  /**
   * Test connection to PromptFlow
   */
  static async testConnection(): Promise<{ status: string; message: string }> {
    const response = await api.post('/test-connection');
    return response.data;
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<{ status: string; service: string }> {
    const response = await api.get('/health');
    return response.data;
  }

  /**
   * List recent sessions (if implemented)
   */
  static async listRecentSessions(limit: number = 10): Promise<SessionsResponse> {
    const response = await api.get(`/sessions?limit=${limit}`);
    return response.data;
  }
}

export default ApiService;