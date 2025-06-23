const API_BASE_URL = 'https://api-server.krontiva.africa/api:uEBBwbSs/delika/onboarding';
const auth = "https://api-server.krontiva.africa/api:uEBBwbSs/login/delika/onboarding/auth/me";

interface LoginResponse {
  authToken: string;
}

interface UserData {
  id: string;
  created_at: number;
  email: string;
}

export const agentAuthService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    return response.json();
  },

  async getUserData(authToken: string): Promise<UserData> {
    const response = await fetch(`${auth}`, {
      method: 'GET',
        headers: {
            'Accept': 'application/json',
            'X-Xano-Authorization': `Bearer ${authToken}`,
            'X-Xano-Authorization-Only': 'true',
        }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    return response.json();
  },

  async storeSession(authToken: string): Promise<void> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3); // 3 days from now

    localStorage.setItem('agentAuthToken', authToken);
    localStorage.setItem('agentAuthExpiry', expiryDate.toISOString());
  },

  async getStoredSession(): Promise<string | null> {
    const token = localStorage.getItem('agentAuthToken');
    const expiry = localStorage.getItem('agentAuthExpiry');

    if (!token || !expiry) {
      return null;
    }

    if (new Date(expiry) < new Date()) {
      this.clearSession();
      return null;
    }

    return token;
  },

  clearSession(): void {
    localStorage.removeItem('agentAuthToken');
    localStorage.removeItem('agentAuthExpiry');
  },
}; 