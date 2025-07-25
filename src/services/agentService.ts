import axios from 'axios';

interface Agent {
  id: number;
  created_at: number;
  full_name: string;
  sex: string;
  email: string;
  momo_number: string;
  whatsapp_number: string;
  location: string;
  education_level: string;
  approved: boolean;
}

const API_BASE_URL = 'https://api-server.krontiva.africa/api:uEBBwbSs';

export const agentService = {
  getAllAgents: async (): Promise<Agent[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/delika_agents`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  },

  updateAgentStatus: async (agent: Agent): Promise<Agent> => {
    try {
      const response = await axios.put(`${API_BASE_URL}/delika_agents/${agent.id}`, agent);
      return response.data;
    } catch (error: any) {
      // Check if it's a 404 error but the operation might have succeeded
      if (error.response?.status === 404) {
        if (error.response.data) {
          console.warn('Received 404 but operation appears successful');
          return error.response.data;
        }
      }
      console.error('Error updating agent:', error);
      throw error;
    }
  }
};

export type { Agent }; 