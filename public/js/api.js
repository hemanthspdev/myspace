/* ===================================
   MYSPACE V2 - API CLIENT
=================================== */

console.log('API.js loading...');

const API_BASE_URL = 'http://localhost:3001/api';

// ===================================
// API HELPER
// ===================================

class API {
  static getToken() {
    return localStorage.getItem('token');
  }
  
  static async request(endpoint, options = {}) {
    const token = this.getToken();
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      }
    };
    
    try {
      console.log(`API Request: ${options.method || 'GET'} ${API_BASE_URL}${endpoint}`);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();
      
      console.log(`API Response (${response.status}):`, data);
      
      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      
      // Check if it's a network error
      if (error.message === 'Failed to fetch') {
        throw new Error('Cannot connect to server. Make sure the server is running on http://localhost:3001');
      }
      
      throw error;
    }
  }
  
  // Auth
  static async register(name, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
  }
  
  static async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }
  
  static async getCurrentUser() {
    return this.request('/auth/me');
  }
  
  // User
  static async updateSettings(settings) {
    return this.request('/user/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }
  
  // Tasks
  static async getTasks() {
    return this.request('/tasks');
  }
  
  static async createTask(task) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    });
  }
  
  static async updateTask(id, updates) {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }
  
  static async deleteTask(id) {
    return this.request(`/tasks/${id}`, {
      method: 'DELETE'
    });
  }
  
  // Notes
  static async getNotes() {
    return this.request('/notes');
  }
  
  static async createNote(note) {
    return this.request('/notes', {
      method: 'POST',
      body: JSON.stringify(note)
    });
  }
  
  static async updateNote(id, updates) {
    return this.request(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }
  
  static async deleteNote(id) {
    return this.request(`/notes/${id}`, {
      method: 'DELETE'
    });
  }
  
  // Sessions
  static async getSessions() {
    return this.request('/sessions');
  }
  
  static async createSession(session) {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(session)
    });
  }
  
  // Analytics
  static async getAnalytics() {
    return this.request('/analytics');
  }
}

console.log('API.js loaded successfully!');
console.log('API class:', API);

window.API = API;