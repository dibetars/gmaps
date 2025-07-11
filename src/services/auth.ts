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

interface AgentSignUpData {
  full_name: string;
  sex: string;
  email: string;
  momo_number: string;
  whatsapp_number: string;
  location: string;
  education_level: string;
}

const API_BASE_URL = 'https://api-server.krontiva.africa/api:uEBBwbSs';
const AUTH_BASE_URL = `${API_BASE_URL}/delika/onboarding`;
const AUTH_ME_URL = `${API_BASE_URL}/login/delika/onboarding/auth/me`;

export const agentAuthService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await axios.post(`${AUTH_BASE_URL}/login`, {
        email,
        password
      });
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  storeSession: async (token: string, userData: UserData): Promise<void> => {
    localStorage.setItem('agentAuthToken', token);
    localStorage.setItem('agentUserData', JSON.stringify(userData));
  },

  getStoredSession: async (): Promise<string | null> => {
    return localStorage.getItem('agentAuthToken');
  },

  getStoredUserData: async (): Promise<UserData | null> => {
    const data = localStorage.getItem('agentUserData');
    return data ? JSON.parse(data) : null;
  },

  clearSession: (): void => {
    localStorage.removeItem('agentAuthToken');
    localStorage.removeItem('agentUserData');
  },

  getUserData: async (token: string): Promise<UserData> => {
    try {
      const response = await axios.get(AUTH_ME_URL, {
        headers: {
          'Accept': 'application/json',
          'X-Xano-Authorization': `Bearer ${token}`,
          'X-Xano-Authorization-Only': 'true'
        }
      });
      const userData = {
        ...response.data,
        id: String(response.data.id) // Store ID as string
      };
      // Store the user data
      localStorage.setItem('agentUserData', JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  },

  signUp: async (signUpData: AgentSignUpData): Promise<void> => {
    try {
      await axios.post(`${API_BASE_URL}/delikaAgents`, signUpData);
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  },

  getCurrentAgentId: async (): Promise<string | null> => {
    try {
      const token = await agentAuthService.getStoredSession();
      if (!token) {
        return null;
      }
      const userData = await agentAuthService.getUserData(token);
      return String(userData.id);
    } catch (error) {
      console.error('Error getting current agent ID:', error);
      return null;
    }
  }
};

export type { UserData, AuthResponse, AgentSignUpData }; 