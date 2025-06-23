interface Branch {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  phoneNumber: string;
  city: string;
}

interface Restaurant {
  id: string;
  created_at: number;
  business_name: string;
  address: string;
  email: string;
  phone_number: string;
  business_type: string;
  type_of_service: string;
  approval_status: string;
  full_name: string;
  delika_onboarding_id: string;
  Notes: string;
  branches: Branch[];
}

const API_BASE_URL = 'https://api-server.krontiva.africa/api:uEBBwbSs';

export const restaurantService = {
  async getRestaurantByAgentId(delikaOnboardingId: string): Promise<Restaurant[]> {
    try {
      const authToken = localStorage.getItem('agentAuthToken');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/agentRestaurant/${delikaOnboardingId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Xano-Authorization': `Bearer ${authToken}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch restaurant data');
      }

      const data = await response.json();
      console.log('Restaurant Data:', data); // Console log the fetched data
      return data;
    } catch (error) {
      console.error('Error fetching restaurant data:', error);
      throw error;
    }
  },

  async submitRestaurantApproval(restaurantData: Omit<Restaurant, 'id' | 'created_at'>): Promise<Restaurant> {
    try {
      const authToken = localStorage.getItem('agentAuthToken');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/delika_restaurant_approvals`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Xano-Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(restaurantData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit restaurant approval');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error submitting restaurant approval:', error);
      throw error;
    }
  }
}; 