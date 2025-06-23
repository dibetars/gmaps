interface ImageMeta {
  width: number;
  height: number;
}

interface ImageData {
  access: string;
  path: string;
  name: string;
  type: string;
  size: number;
  mime: string;
  meta: ImageMeta;
  url: string;
}

interface InventoryItem {
  id: string;
  Name: string;
  Category: string;
  Subcategory: string;
  image: ImageData;
}

interface PreInventoryItem {
  Name: string;
  Category: string;
  Subcategory: string;
  Restaurant: string;
  photoUpload: File;
  email: string;
  momoNumber: string;
  contactName: string;
  price: string;
}

const API_BASE_URL = 'https://api-server.krontiva.africa/api:uEBBwbSs';

export const inventoryService = {
  async getInventoryItems(): Promise<InventoryItem[]> {
    try {
      const authToken = localStorage.getItem('agentAuthToken');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/GetInv`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Xano-Authorization': `Bearer ${authToken}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch inventory items');
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      throw error;
    }
  },

  async addPreInventoryItem(item: PreInventoryItem): Promise<void> {
    try {
      const authToken = localStorage.getItem('agentAuthToken');
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const formData = new FormData();
      formData.append('Name', item.Name);
      formData.append('Category', item.Category);
      formData.append('Subcategory', item.Subcategory);
      formData.append('Restaurant', item.Restaurant);
      formData.append('photoUpload', item.photoUpload);
      formData.append('email', item.email);
      formData.append('momoNumber', item.momoNumber);
      formData.append('contactName', item.contactName);
      formData.append('price', item.price);

      const response = await fetch(`${API_BASE_URL}/delika_pre_inventory`, {
        method: 'POST',
        headers: {
          'X-Xano-Authorization': `Bearer ${authToken}`,
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to add inventory item');
      }
    } catch (error) {
      console.error('Error adding inventory item:', error);
      throw error;
    }
  }
}; 