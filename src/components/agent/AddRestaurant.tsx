import React, { useState, useEffect, useRef } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { restaurantService } from '../../services/restaurantService';
import { agentAuthService } from '../../services/auth';
import { useLoadScript } from '@react-google-maps/api';

interface Branch {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  phoneNumber: string;
  city: string;
}

interface RestaurantForm {
  business_name: string;
  email: string;
  contact_name: string;
  momo_number: string;
  business_type: string;
  branches: Branch[];
}

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

interface SelectedItem extends InventoryItem {
  price: number;
}

interface UploadProgress {
  restaurant: number;
  inventory: { [key: string]: number };
  overall: number;
}

const libraries: ("places" | "drawing")[] = ["places"];

const AddRestaurant: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<RestaurantForm>({
    business_name: '',
    email: '',
    contact_name: '',
    momo_number: '',
    business_type: '',
    branches: [{
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      phoneNumber: '',
      city: ''
    }]
  });
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    restaurant: 0,
    inventory: {},
    overall: 0
  });
  const autocompleteInput = useRef<HTMLInputElement>(null);
  const [selectedItemForPrice, setSelectedItemForPrice] = useState<InventoryItem | null>(null);
  const [itemPrice, setItemPrice] = useState<string>('');
  const [priceError, setPriceError] = useState<string>('');

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '') as string,
    libraries
  });

  useEffect(() => {
    // Load inventory items
    const fetchInventory = async () => {
      try {
        const items = await inventoryService.getInventoryItems();
        setInventoryItems(items);
      } catch (error) {
        console.error('Error fetching inventory:', error);
      }
    };
    fetchInventory();
  }, []);

  useEffect(() => {
    if (isLoaded && autocompleteInput.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInput.current, {
        types: ['address'],
        componentRestrictions: { country: 'GH' }
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
          const newBranches = [...formData.branches];
          newBranches[0] = {
            ...newBranches[0],
            address: place.formatted_address || '',
            latitude: place.geometry.location?.lat().toString() || '',
            longitude: place.geometry.location?.lng().toString() || '',
            city: place.address_components?.find(c => c.types.includes('locality'))?.long_name || ''
          };
          setFormData({ ...formData, branches: newBranches });
        }
      });
    }
  }, [isLoaded, formData]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('branch_')) {
      const [_, field] = name.split('_');
      const newBranches = [...formData.branches];
      newBranches[0] = { ...newBranches[0], [field]: value };
      setFormData({ ...formData, branches: newBranches });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newBranches = [...formData.branches];
    newBranches[0] = { ...newBranches[0], [name.replace('branch_', '')]: value };
    setFormData({ ...formData, branches: newBranches });
  };

  const handleItemSelect = (item: InventoryItem) => {
    setSelectedItemForPrice(item);
    setItemPrice('');
    setPriceError('');
  };

  const handlePriceSubmit = () => {
    if (!selectedItemForPrice) return;

    const price = Number(itemPrice);
    if (isNaN(price) || price <= 0) {
      setPriceError('Please enter a valid price greater than 0');
      return;
    }

    setSelectedItems([...selectedItems, { ...selectedItemForPrice, price }]);
    setSelectedItemForPrice(null);
    setItemPrice('');
    setPriceError('');
  };

  const updateOverallProgress = (restaurantProgress: number, inventoryProgress: { [key: string]: number }) => {
    const inventoryValues = Object.values(inventoryProgress);
    const avgInventoryProgress = inventoryValues.length > 0 
      ? inventoryValues.reduce((a, b) => a + b, 0) / inventoryValues.length 
      : 0;
    
    // Restaurant submission is 30% of overall progress, inventory uploads are 70%
    const overall = (restaurantProgress * 0.3) + (avgInventoryProgress * 0.7);
    
    setUploadProgress(prev => ({
      ...prev,
      overall: Math.round(overall)
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setUploadProgress({
      restaurant: 0,
      inventory: {},
      overall: 0
    });

    try {
      // Get the current user's ID
      const token = await agentAuthService.getStoredSession();
      if (!token) {
        throw new Error('No authentication token found');
      }
      const userData = await agentAuthService.getUserData(token);

      // Start restaurant approval submission
      setUploadProgress(prev => ({ ...prev, restaurant: 10 }));
      await restaurantService.submitRestaurantApproval({
        business_name: formData.business_name,
        address: formData.branches[0].address,
        email: formData.email,
        phone_number: formData.momo_number,
        business_type: formData.business_type,
        type_of_service: "Full Service",
        approval_status: "pending",
        full_name: formData.contact_name,
        branches: formData.branches,
        delika_onboarding_id: userData.id
      });
      setUploadProgress(prev => {
        const newProgress = { ...prev, restaurant: 100 };
        updateOverallProgress(100, prev.inventory);
        return newProgress;
      });

      // Upload inventory items
      for (const item of selectedItems) {
        setUploadProgress(prev => {
          const newInventory = { ...prev.inventory, [item.id]: 10 };
          updateOverallProgress(prev.restaurant, newInventory);
          return { ...prev, inventory: newInventory };
        });

        const response = await fetch(item.image.url);
        const blob = await response.blob();
        const file = new File([blob], item.image.name, { type: item.image.mime });

        await inventoryService.addPreInventoryItem({
          Name: item.Name,
          Category: item.Category,
          Subcategory: item.Subcategory,
          Restaurant: formData.business_name,
          photoUpload: file,
          email: formData.email,
          momoNumber: formData.momo_number,
          contactName: formData.contact_name,
          price: item.price.toString()
        });

        setUploadProgress(prev => {
          const newInventory = { ...prev.inventory, [item.id]: 100 };
          updateOverallProgress(prev.restaurant, newInventory);
          return { ...prev, inventory: newInventory };
        });
      }

      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => {
    if (!loading) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl w-96">
          <h3 className="text-lg font-semibold mb-4">Uploading...</h3>
          
          {/* Overall Progress */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm font-medium">{uploadProgress.overall}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress.overall}%` }}
              />
            </div>
          </div>

          {/* Restaurant Approval Progress */}
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm">Restaurant Approval</span>
              <span className="text-sm">{uploadProgress.restaurant}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress.restaurant}%` }}
              />
            </div>
          </div>

          {/* Inventory Items Progress */}
          {selectedItems.map(item => (
            <div key={item.id} className="mb-2">
              <div className="flex justify-between mb-1">
                <span className="text-sm truncate">{item.Name}</span>
                <span className="text-sm">{uploadProgress.inventory[item.id] || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress.inventory[item.id] || 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      padding: '2rem',
      maxWidth: '800px',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#1f2937',
          margin: 0
        }}>
          {step === 1 ? 'Add Restaurant Details' : 'Select Menu Items'}
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            color: '#6b7280',
            cursor: 'pointer'
          }}
        >
          ×
        </button>
      </div>

      {step === 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
              Business Name
            </label>
            <input
              type="text"
              name="business_name"
              value={formData.business_name}
              onChange={handleFormChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleFormChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
              Contact Name
            </label>
            <input
              type="text"
              name="contact_name"
              value={formData.contact_name}
              onChange={handleFormChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
              MoMo Number
            </label>
            <input
              type="text"
              name="momo_number"
              value={formData.momo_number}
              onChange={handleFormChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
              Business Type
            </label>
            <select
              value={formData.business_type}
              onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem'
              }}
            >
              <option value="">Select business type</option>
              <option value="Restaurant">Restaurant</option>
              <option value="Fast Food">Fast Food</option>
              <option value="Cafe">Cafe</option>
              <option value="Groceries">Groceries</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Online Store">Online Store</option>
              <option value="Supermarket">Supermarket</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
              Branch Name
            </label>
            <input
              type="text"
              name="branch_name"
              value={formData.branches[0].name}
              onChange={handleFormChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
              Branch Address
            </label>
            <input
              ref={autocompleteInput}
              type="text"
              name="branch_address"
              value={formData.branches[0].address}
              onChange={handleAddressChange}
              placeholder="Enter full address..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem'
              }}
            />
          </div>

          {!isLoaded && (
            <>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
                    Latitude
                  </label>
                  <input
                    type="text"
                    name="branch_latitude"
                    value={formData.branches[0].latitude}
                    onChange={handleAddressChange}
                    placeholder="e.g. 5.5584314"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem'
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
                    Longitude
                  </label>
                  <input
                    type="text"
                    name="branch_longitude"
                    value={formData.branches[0].longitude}
                    onChange={handleAddressChange}
                    placeholder="e.g. -0.1795864"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
                  City
                </label>
                <input
                  type="text"
                  name="branch_city"
                  value={formData.branches[0].city}
                  onChange={handleAddressChange}
                  placeholder="e.g. Accra Metropolitan"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem'
                  }}
                />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#374151' }}>
              Branch Phone Number
            </label>
            <input
              type="text"
              name="branch_phoneNumber"
              value={formData.branches[0].phoneNumber}
              onChange={handleFormChange}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem'
              }}
            />
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!formData.business_name || !formData.email || !formData.contact_name || !formData.momo_number || !formData.business_type}
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              opacity: (!formData.business_name || !formData.email || !formData.contact_name || !formData.momo_number || !formData.business_type) ? 0.5 : 1
            }}
          >
            Next: Select Menu Items
          </button>
        </div>
      ) : (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {inventoryItems.map(item => (
              <div
                key={item.id}
                onClick={() => handleItemSelect(item)}
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <img
                  src={item.image.url}
                  alt={item.Name}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '0.25rem',
                    marginBottom: '0.5rem'
                  }}
                />
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#1f2937' }}>{item.Name}</h4>
                <p style={{ margin: '0', fontSize: '0.875rem', color: '#6b7280' }}>
                  {item.Category.split(' > ')[1]} • {item.Subcategory}
                </p>
              </div>
            ))}
          </div>

          {/* Price Input Modal */}
          {selectedItemForPrice && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1100
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                padding: '2rem',
                width: '90%',
                maxWidth: '400px',
                position: 'relative'
              }}>
                <button
                  onClick={() => setSelectedItemForPrice(null)}
                  style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
                    background: 'none',
                    border: 'none',
                    fontSize: '1.25rem',
                    color: '#6b7280',
                    cursor: 'pointer'
                  }}
                >
                  ×
                </button>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <img
                    src={selectedItemForPrice.image.url}
                    alt={selectedItemForPrice.Name}
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '0.375rem'
                    }}
                  />
                  <div>
                    <h3 style={{
                      margin: '0 0 0.25rem 0',
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: '#1f2937'
                    }}>
                      {selectedItemForPrice.Name}
                    </h3>
                    <p style={{
                      margin: '0',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {selectedItemForPrice.Category.split(' > ')[1]} • {selectedItemForPrice.Subcategory}
                    </p>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label
                    htmlFor="price"
                    style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      color: '#374151',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    Enter Price (GH₵)
                  </label>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <div style={{
                      position: 'relative',
                      flex: 1
                    }}>
                      <span style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#6b7280'
                      }}>
                        GH₵
                      </span>
                      <input
                        id="price"
                        type="number"
                        value={itemPrice}
                        onChange={(e) => {
                          setItemPrice(e.target.value);
                          setPriceError('');
                        }}
                        placeholder="0.00"
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                          border: `1px solid ${priceError ? '#ef4444' : '#d1d5db'}`,
                          borderRadius: '0.375rem',
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                  </div>
                  {priceError && (
                    <p style={{
                      color: '#ef4444',
                      fontSize: '0.875rem',
                      marginTop: '0.5rem'
                    }}>
                      {priceError}
                    </p>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginTop: '1.5rem'
                }}>
                  <button
                    onClick={() => setSelectedItemForPrice(null)}
                    style={{
                      padding: '0.625rem 1.25rem',
                      backgroundColor: 'white',
                      color: '#1f2937',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePriceSubmit}
                    style={{
                      flex: 1,
                      padding: '0.625rem 1.25rem',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#1f2937', marginBottom: '1rem' }}>Selected Items:</h3>
            {selectedItems.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '0.5rem'
                }}
              >
                <img
                  src={item.image.url}
                  alt={item.Name}
                  style={{
                    width: '50px',
                    height: '50px',
                    objectFit: 'cover',
                    borderRadius: '0.25rem'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0', color: '#1f2937' }}>{item.Name}</p>
                  <p style={{ margin: '0', fontSize: '0.875rem', color: '#6b7280' }}>
                    GH₵ {item.price}
                  </p>
                </div>
                {uploadProgress.inventory[item.id] && (
                  <div style={{ width: '60px', textAlign: 'right', color: '#059669' }}>
                    {uploadProgress.inventory[item.id]}%
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setStep(1)}
              style={{
                padding: '0.75rem',
                backgroundColor: 'white',
                color: '#1f2937',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || selectedItems.length === 0}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                opacity: (loading || selectedItems.length === 0) ? 0.5 : 1
              }}
            >
              {loading ? 'Uploading...' : 'Complete Setup'}
            </button>
          </div>
        </div>
      )}
      {renderProgressBar()}
    </div>
  );
};

export default AddRestaurant; 