import axios from 'axios';

const API_BASE_URL = 'https://api-server.krontiva.africa/api:uEBBwbSs';

interface Restaurant {
  id: number;
  name: string;
  location: string;
  branches?: any[];
  created_at: number;
  agent_id: number;
  status?: string;
  timestamp?: string;
}

export const restaurantService = {
  getRestaurantByAgentId: async (agentId: number): Promise<Restaurant[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/restaurants?agent_id=${agentId}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      throw error;
    }
  },

  addRestaurant: async (restaurantData: Partial<Restaurant>): Promise<Restaurant> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/restaurants`, restaurantData);
      return response.data;
    } catch (error: any) {
      // Check if it's a 404 error but the operation might have succeeded
      if (error.response?.status === 404) {
        // If the response contains data, the operation might have succeeded despite the 404
        if (error.response.data) {
          console.warn('Received 404 but operation appears successful');
          return error.response.data;
        }
      }
      console.error('Error adding restaurant:', error);
      throw error;
    }
  },

  updateRestaurant: async (restaurantId: number, updateData: Partial<Restaurant>): Promise<Restaurant> => {
    try {
      const response = await axios.put(`${API_BASE_URL}/restaurants/${restaurantId}`, updateData);
      return response.data;
    } catch (error: any) {
      // Check if it's a 404 error but the operation might have succeeded
      if (error.response?.status === 404) {
        if (error.response.data) {
          console.warn('Received 404 but operation appears successful');
          return error.response.data;
        }
      }
      console.error('Error updating restaurant:', error);
      throw error;
    }
  },

  deleteRestaurant: async (restaurantId: number): Promise<void> => {
    try {
      await axios.delete(`${API_BASE_URL}/restaurants/${restaurantId}`);
    } catch (error: any) {
      // Check if it's a 404 error but the operation might have succeeded
      if (error.response?.status === 404) {
        console.warn('Received 404 but delete operation might have succeeded');
        return;
      }
      console.error('Error deleting restaurant:', error);
      throw error;
    }
  }
};

export type { Restaurant }; 