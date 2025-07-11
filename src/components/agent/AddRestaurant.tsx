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
  full_name: string;
  phone_number: string;
  business_type: string;
  type_of_service: string;
  approval_status: string;
  Notes: string;
  address: string;
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

interface SavedDraft {
  id: string;
  timestamp: number;
  businessName: string;
  formData: RestaurantForm;
  selectedItems: SelectedItem[];
  step: number;
}

const libraries: ("places" | "drawing")[] = ["places"];

const AddRestaurant: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<RestaurantForm>({
    business_name: '',
    email: '',
    full_name: '',
    phone_number: '',
    business_type: '',
    type_of_service: '',
    approval_status: 'pending',
    Notes: '',
    address: '',
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
  const [uploadProgress] = useState<UploadProgress>({
    restaurant: 0,
    inventory: {},
    overall: 0
  });
  const autocompleteInput = useRef<HTMLInputElement>(null);
  const [selectedItemForPrice, setSelectedItemForPrice] = useState<InventoryItem | null>(null);
  const [itemPrice, setItemPrice] = useState<string>('');
  const [priceError, setPriceError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([]);
  const [showDraftPanel, setShowDraftPanel] = useState<boolean>(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

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
        types: ['establishment'],
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

  // Get unique subcategories from inventory items
  const getUniqueSubcategories = () => {
    const subcategories = inventoryItems.map(item => item.Subcategory);
    return Array.from(new Set(subcategories)).sort();
  };

  // Filter inventory items based on search query and selected category
  const getFilteredItems = () => {
    return inventoryItems.filter(item => {
      const matchesSearch = item.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.Subcategory.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.Subcategory === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  // Draft management functions
  const loadDraftsFromStorage = () => {
    try {
      const drafts = localStorage.getItem('restaurant_drafts');
      return drafts ? JSON.parse(drafts) : [];
    } catch (error) {
      console.error('Error loading drafts:', error);
      return [];
    }
  };

  const saveDraftToStorage = (draft: SavedDraft) => {
    try {
      const existingDrafts = loadDraftsFromStorage().filter((d: SavedDraft) => d.id !== draft.id);
      const updatedDrafts = [...existingDrafts, draft];
      localStorage.setItem('restaurant_drafts', JSON.stringify(updatedDrafts));
      setSavedDrafts(updatedDrafts);
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  const deleteDraft = (draftId: string) => {
    try {
      const updatedDrafts = savedDrafts.filter(draft => draft.id !== draftId);
      localStorage.setItem('restaurant_drafts', JSON.stringify(updatedDrafts));
      setSavedDrafts(updatedDrafts);
      if (currentDraftId === draftId) {
        setCurrentDraftId(null);
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  const loadDraft = (draft: SavedDraft) => {
    setFormData(draft.formData);
    setSelectedItems(draft.selectedItems);
    setStep(draft.step);
    setCurrentDraftId(draft.id);
    setShowDraftPanel(false);
  };

  const saveDraft = () => {
    if (!formData.business_name && selectedItems.length === 0) return;

    const draftId = currentDraftId || `draft_${Date.now()}`;
    const draft: SavedDraft = {
      id: draftId,
      timestamp: Date.now(),
      businessName: formData.business_name || 'Untitled Restaurant',
      formData,
      selectedItems,
      step
    };
    
    saveDraftToStorage(draft);
    setCurrentDraftId(draftId);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const agentId = await agentAuthService.getCurrentAgentId();
      
      const restaurantData = {
        ...formData,
        delika_onboarding_id: agentId,
        location: [], // Required empty array as per API spec
      };

      const response = await restaurantService.addRestaurant(restaurantData);
      console.log('response', response);
      
      // Clear any saved draft
      if (currentDraftId) {
        deleteDraft(currentDraftId);
      }

      onClose();
    } catch (error) {
      console.error('Error submitting restaurant:', error);
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

  // Add CSS for responsive grid
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .restaurant-form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      @media (max-width: 768px) {
        .restaurant-form-grid {
          grid-template-columns: 1fr;
        }
        .restaurant-form-grid .full-width {
          grid-column: span 1;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Load drafts on component mount
  useEffect(() => {
    const drafts = loadDraftsFromStorage();
    setSavedDrafts(drafts);
  }, []);

  // Auto-save draft when form data or selected items change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveDraft();
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [formData, selectedItems, step]);

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
          {step === 1 ? 'Add Restaurant Details' : step === 2 ? 'Select Menu Items' : 'Additional Notes'}
          {currentDraftId && (
            <span style={{
              marginLeft: '0.5rem',
              fontSize: '0.75rem',
              color: '#059669',
              fontWeight: 'normal'
            }}>
              • Auto-saved
            </span>
          )}
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Draft Panel Trigger */}
          {savedDrafts.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDraftPanel(!showDraftPanel)}
                onMouseEnter={() => setShowDraftPanel(true)}
                style={{
                  background: 'none',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  padding: '0.5rem',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                📄 {savedDrafts.length} Draft{savedDrafts.length > 1 ? 's' : ''}
              </button>

              {/* Draft Panel */}
              {showDraftPanel && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '0.5rem',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    padding: '1rem',
                    minWidth: '300px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    zIndex: 1000
                  }}
                  onMouseEnter={() => setShowDraftPanel(true)}
                  onMouseLeave={() => setShowDraftPanel(false)}
                >
                  <h3 style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    Saved Drafts
                  </h3>
                  
                  {savedDrafts.map(draft => (
                    <div
                      key={draft.id}
                      style={{
                        border: `1px solid ${currentDraftId === draft.id ? '#2563eb' : '#e5e7eb'}`,
                        borderRadius: '0.375rem',
                        padding: '0.75rem',
                        marginBottom: '0.5rem',
                        backgroundColor: currentDraftId === draft.id ? '#eff6ff' : 'white'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.5rem'
                      }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            margin: '0 0 0.25rem 0',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#1f2937'
                          }}>
                            {draft.businessName}
                          </h4>
                          <p style={{
                            margin: '0',
                            fontSize: '0.75rem',
                            color: '#6b7280'
                          }}>
                            Step {draft.step} • {new Date(draft.timestamp).toLocaleDateString()} at {new Date(draft.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {draft.selectedItems.length > 0 && (
                            <p style={{
                              margin: '0.25rem 0 0 0',
                              fontSize: '0.75rem',
                              color: '#059669'
                            }}>
                              {draft.selectedItems.length} item{draft.selectedItems.length > 1 ? 's' : ''} selected
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => loadDraft(draft)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Load
                          </button>
                          <button
                            onClick={() => deleteDraft(draft.id)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {savedDrafts.length > 3 && (
                    <p style={{
                      margin: '0.5rem 0 0 0',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      textAlign: 'center'
                    }}>
                      Showing recent drafts
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
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
      </div>

      {step === 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="restaurant-form-grid">
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
                Contact Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
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
                name="phone_number"
                value={formData.phone_number}
                onChange={handleFormChange}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem'
                }}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }} className="full-width">
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

            <div style={{ gridColumn: 'span 2' }} className="full-width">
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
                <div>
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

                <div>
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

                <div style={{ gridColumn: 'span 2' }} className="full-width">
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
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!formData.business_name || !formData.email || !formData.full_name || !formData.phone_number || !formData.business_type}
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              opacity: (!formData.business_name || !formData.email || !formData.full_name || !formData.phone_number || !formData.business_type) ? 0.5 : 1
            }}
          >
            Next: Select Menu Items
          </button>
        </div>
      ) : step === 2 ? (
        <div>
          {/* Search Bar */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Category Filters */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginRight: '1rem'
                }}>
                  Categories:
                </span>
                {getUniqueSubcategories().length > 10 && (
                  <button
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      color: '#6b7280'
                    }}
                  >
                    {showAllCategories ? 'Show Less' : `Show All (${getUniqueSubcategories().length})`}
                  </button>
                )}
              </div>
              
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                overflowX: 'auto',
                paddingBottom: '0.5rem',
                scrollbarWidth: 'thin'
              }}>
                <button
                  onClick={() => setSelectedCategory('all')}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderRadius: '1.5rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    backgroundColor: selectedCategory === 'all' ? '#2563eb' : '#f3f4f6',
                    color: selectedCategory === 'all' ? 'white' : '#374151',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  All ({inventoryItems.length})
                </button>
                {getUniqueSubcategories()
                  .slice(0, showAllCategories ? undefined : 10)
                  .map(subcategory => {
                    const count = inventoryItems.filter(item => item.Subcategory === subcategory).length;
                    return (
                      <button
                        key={subcategory}
                        onClick={() => setSelectedCategory(subcategory)}
                        style={{
                          padding: '0.5rem 1rem',
                          border: 'none',
                          borderRadius: '1.5rem',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          backgroundColor: selectedCategory === subcategory ? '#2563eb' : '#f3f4f6',
                          color: selectedCategory === subcategory ? 'white' : '#374151',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        {subcategory} ({count})
                      </button>
                    );
                  })}
                {!showAllCategories && getUniqueSubcategories().length > 10 && (
                  <button
                    onClick={() => setShowAllCategories(true)}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '2px dashed #d1d5db',
                      borderRadius: '1.5rem',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      color: '#6b7280',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    +{getUniqueSubcategories().length - 10} more
                  </button>
                )}
              </div>
            </div>

            {/* Results count */}
            <div style={{
              marginTop: '1rem',
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              Showing {getFilteredItems().length} of {inventoryItems.length} items
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {getFilteredItems().length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '3rem 1rem',
                color: '#6b7280'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>No items found</h3>
                <p style={{ margin: '0' }}>
                  {searchQuery ? 
                    `No items match "${searchQuery}"` : 
                    `No items in ${selectedCategory} category`
                  }
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  style={{
                    marginTop: '1rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              getFilteredItems().map(item => (
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
              ))
            )}
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
              onClick={() => setStep(3)}
              disabled={selectedItems.length === 0}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                opacity: selectedItems.length === 0 ? 0.5 : 1
              }}
            >
              Next: Add Notes
            </button>
          </div>
        </div>
      ) : step === 3 ? (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              color: '#374151',
              fontSize: '1rem',
              fontWeight: '500'
            }}>
              Additional Notes (Optional)
            </label>
            <textarea
              name="Notes"
              value={formData.Notes}
              onChange={(e) => setFormData({ ...formData, Notes: e.target.value })}
              placeholder="Add any additional information about your restaurant, special requirements, or notes for the approval team..."
              rows={6}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
            <p style={{
              margin: '0.5rem 0 0 0',
              fontSize: '0.75rem',
              color: '#6b7280'
            }}>
              This information will help us better understand your restaurant and process your application more efficiently.
            </p>
          </div>

          <div style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <h4 style={{
              margin: '0 0 0.75rem 0',
              color: '#374151',
              fontSize: '1rem',
              fontWeight: '600'
            }}>
              Application Summary
            </h4>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Business:</strong> {formData.business_name}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Type:</strong> {formData.business_type}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Contact:</strong> {formData.full_name}
              </p>
              <p style={{ margin: '0.25rem 0' }}>
                <strong>Menu Items:</strong> {selectedItems.length} items selected
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setStep(2)}
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
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                opacity: loading ? 0.5 : 1,
                fontWeight: '600'
              }}
            >
              {loading ? 'Submitting Application...' : 'Submit Restaurant Application'}
            </button>
          </div>
        </div>
      ) : (
        <div>
      {renderProgressBar()}
        </div>
      )}
    </div>
  );
};

export default AddRestaurant; 