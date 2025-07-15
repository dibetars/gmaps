import axios from 'axios';

const API_BASE_URL = 'https://api-server.krontiva.africa/api:uEBBwbSs';

interface Restaurant {
  id?: string;
  business_name: string;
  address: string;
  email: string;
  phone_number: string;
  business_type: string;
  type_of_service: string;
  approval_status: string;
  full_name: string;
  delika_onboarding_id: string | null;
  Notes: string;
  branches: Array<{
  name: string;
    address: string;
    latitude: string;
    longitude: string;
    phoneNumber: string;
    city: string;
  }>;
  created_at?: number;
}

export const restaurantService = {
  getRestaurantByAgentId: async (agentId: number | string): Promise<Restaurant[]> => {
    try {
      console.log('agentId', agentId);
      // Ensure agentId is passed as a string
      const response = await axios.get(`${API_BASE_URL}/agentRestaurant/${String(agentId)}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      throw error;
    }
  },

  addRestaurant: async (restaurantData: Partial<Restaurant>): Promise<Restaurant> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/delika_restaurant_approvals`, restaurantData);
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

  updateRestaurant: async (restaurantId: string, updateData: Partial<Restaurant>): Promise<Restaurant> => {
    try {
      const response = await axios.put(`${API_BASE_URL}/delika_restaurant_approvals/${restaurantId}`, updateData);
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

  deleteRestaurant: async (restaurantId: string): Promise<void> => {
    try {
      await axios.delete(`${API_BASE_URL}/delika_restaurant_approvals/${restaurantId}`);
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