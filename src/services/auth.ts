import axios from 'axios';

interface UserData {
  id: number;
  email: string;
  role: string;
}

interface AuthResponse {
  authToken: string;
  userData: UserData;
}

const API_BASE_URL = 'https://api-server.krontiva.africa/api:uEBBwbSs';

export const agentAuthService = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password
      });
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  storeSession: async (token: string): Promise<void> => {
    localStorage.setItem('agentAuthToken', token);
  },

  getStoredSession: async (): Promise<string | null> => {
    return localStorage.getItem('agentAuthToken');
  },

  clearSession: (): void => {
    localStorage.removeItem('agentAuthToken');
  },

  getUserData: async (token: string): Promise<UserData> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return {
        ...response.data,
        id: Number(response.data.id) // Ensure ID is a number
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  }
};

export type { UserData, AuthResponse }; 