import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Split, Truck, AlertTriangle, ClipboardCheck, FileText, DollarSign, Package, Quote, Map, Download, Printer, ExternalLink, CornerDownRight } from 'lucide-react';
import { SplitOrderModal } from './SplitOrderModal';
import { CreateManifestModal } from './CreateManifestModal';
import { AssignmentTab } from './AssignmentTab';

interface OrderDetailsProps {
  orderId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function OrderDetails({ orderId, onClose, onUpdate }: OrderDetailsProps) {
  const [order, setOrder] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState<any>(null);
  const [editedLocations, setEditedLocations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showCreateManifestModal, setShowCreateManifestModal] = useState(false);
  const [availableManifests, setAvailableManifests] = useState<any[]>([]);
  const [selectedManifest, setSelectedManifest] = useState<string>('');
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'legs' | 'details' | 'commodities' | 'quotes' | 'documents'>('legs');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [commodities, setCommodities] = useState([
    { id: 1, description: 'Electronics', qty: 3, type: 'Boxes', length: '24', width: '24', height: '24', pieces: 3, weight: '450', lf: '1', class: 'A' },
    { id: 2, description: 'Furniture', qty: 2, type: 'Pallets', length: '48', width: '48', height: '60', pieces: 2, weight: '850', lf: '4', class: 'B' }
  ]);
  const [charges, setCharges] = useState([
    { id: 1, description: 'Line Haul', amount: 850, currency: 'USD' },
    { id: 2, description: 'Fuel Surcharge', amount: 120, currency: 'USD' },
    { id: 3, description: 'Accessorial Charges', amount: 75, currency: 'USD' }
  ]);
  const [locationData, setLocationData] = useState<{
    countries: { id: string; name: string }[];
    states: { id: string; name: string; country_id: string }[];
    cities: { id: string; name: string; state_id: string }[];
  }>({
    countries: [],
    states: [],
    cities: []
  });

  useEffect(() => {
    fetchOrderDetails();
    loadCountries();
  }, [orderId]);

  // This effect loads the necessary state and city data when entering edit mode
  useEffect(() => {
    if (isEditing && editedLocations.length > 0) {
      // For each location, load the appropriate states and cities
      const loadLocationDependencies = async () => {
        for (const location of editedLocations) {
          if (location.country_id) {
            await loadStates(location.country_id);
            if (location.state_id) {
              await loadCities(location.state_id);
            }
          }
        }
      };
      
      loadLocationDependencies();
    }
  }, [isEditing, editedLocations]);

  const loadCountries = async () => {
    try {
      const { data: countries, error } = await supabase
        .from('countries')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      if (countries) {
        setLocationData(prev => ({ ...prev, countries }));
      }
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  const loadStates = async (countryId: string) => {
    try {
      // Check if we already have states for this country
      if (locationData.states.some(state => state.country_id === countryId)) {
        return;
      }
      
      const { data: states, error } = await supabase
        .from('states')
        .select('id, name, country_id')
        .eq('country_id', countryId)
        .order('name');
      
      if (error) throw error;
      
      if (states) {
        setLocationData(prev => ({ 
          ...prev, 
          states: [...prev.states.filter(s => s.country_id !== countryId), ...states]
        }));
      }
    } catch (error) {
      console.error('Error loading states:', error);
    }
  };

  const loadCities = async (stateId: string) => {
    try {
      // Check if we already have cities for this state
      if (locationData.cities.some(city => city.state_id === stateId)) {
        return;
      }
      
      const { data: cities, error } = await supabase
        .from('cities')
        .select('id, name, state_id')
        .eq('state_id', stateId)
        .order('name');
      
      if (error) throw error;
      
      if (cities) {
        setLocationData(prev => ({ 
          ...prev, 
          cities: [...prev.cities.filter(c => c.state_id !== stateId), ...cities]
        }));
      }
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const handleCountryChange = async (locationId: string, countryId: string) => {
    setEditedLocations(prev => prev.map(loc =>
      loc.id === locationId ? {
        ...loc,
        country_id: countryId,
        state_id: '',
        city_id: '',
        city: {
          ...loc.city,
          state: {
            ...loc.city?.state,
            country: {
              id: countryId,
              name: locationData.countries.find(c => c.id === countryId)?.name || ''
            }
          }
        }
      } : loc
    ));
    await loadStates(countryId);
  };

  const handleStateChange = async (locationId: string, stateId: string) => {
    setEditedLocations(prev => prev.map(loc =>
      loc.id === locationId ? {
        ...loc,
        state_id: stateId,
        city_id: '',
        city: {
          ...loc.city,
          state: {
            id: stateId,
            name: locationData.states.find(s => s.id === stateId)?.name || '',
            country: loc.city?.state?.country || null
          }
        }
      } : loc
    ));
    await loadCities(stateId);
  };

  const handleCityChange = (locationId: string, cityId: string) => {
    setEditedLocations(prev => prev.map(loc =>
      loc.id === locationId ? {
        ...loc,
        city_id: cityId,
        city: {
          id: cityId,
          name: locationData.cities.find(c => c.id === cityId)?.name || '',
          state: loc.city?.state || null
        }
      } : loc
    ));
  };

  const fetchOrderDetails = async () => {
    setIsLoading(true);
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          *,
          locations (
            *,
            city:cities (
              id,
              name,
              state:states (
                id,
                name,
                country:countries (
                  id,
                  name
                )
              )
            )
          ),
          order_legs (
            *,
            manifest:manifests (
              id,
              number,
              status
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      setOrder(order);
      setEditedOrder(order);
      
      // Properly initialize editedLocations with all necessary IDs
      const mappedLocations = order.locations.map(loc => {
        // Ensure we properly capture all hierarchical IDs
        return {
          ...loc,
          country_id: loc.city?.state?.country?.id || '',
          state_id: loc.city?.state?.id || '',
          city_id: loc.city?.id || ''
        };
      });
      
      setEditedLocations(mappedLocations);
      
      // Pre-load location data for existing locations
      const preloadLocationData = async () => {
        const countryIds = new Set<string>();
        const stateIds = new Set<string>();
        
        mappedLocations.forEach(loc => {
          if (loc.country_id) countryIds.add(loc.country_id);
          if (loc.state_id) stateIds.add(loc.state_id);
        });
        
        for (const countryId of countryIds) {
          await loadStates(countryId);
        }
        
        for (const stateId of stateIds) {
          await loadCities(stateId);
        }
      };
      
      preloadLocationData();
      
    } catch (error) {
      console.error('Error fetching order:', error);
      setError(error instanceof Error ? error.message : 'Failed to load order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderChange = (field: string, value: any) => {
    setEditedOrder(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (locationId: string, field: string, value: any) => {
    setEditedLocations(prev =>
      prev.map(loc =>
        loc.id === locationId ? { ...loc, [field]: value } : loc
      )
    );
  };

  const validateForm = () => {
    // Basic validation
    if (!editedOrder.customer_name || !editedOrder.customer_address) {
      setError('Customer name and address are required');
      return false;
    }

    // Validate locations
    const invalidLocations = editedLocations.filter(loc => 
      !loc.name || !loc.street_address || !loc.city_id || !loc.date || !loc.time
    );

    if (invalidLocations.length > 0) {
      setError('All location fields are required');
      return false;
    }

    return true;
  };

  const handleSubmitClick = () => {
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setShowConfirmation(false);

    try {
      // Log the audit record
      await supabase
        .from('audit_logs')
        .insert({
          order_id: orderId,
          action: 'update',
          previous_data: order,
          new_data: editedOrder,
          created_by: 'current_user' // Replace with actual user ID when available
        });
        
      // Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          customer_name: editedOrder.customer_name,
          customer_address: editedOrder.customer_address,
          contact_person: editedOrder.contact_person,
          phone_number: editedOrder.phone_number,
          load_tender_number: editedOrder.load_tender_number,
          rate: editedOrder.rate,
          currency: editedOrder.currency,
          commodity: editedOrder.commodity,
          weight: editedOrder.weight,
          reference_number: editedOrder.reference_number
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Update locations
      for (const location of editedLocations) {
        const { error: locationError } = await supabase
          .from('locations')
          .update({
            name: location.name,
            street_address: location.street_address,
            city_id: location.city_id,
            date: location.date,
            time: location.time,
            special_instructions: location.special_instructions
          })
          .eq('id', location.id);

        if (locationError) throw locationError;
      }

      setIsEditing(false);
      fetchOrderDetails();
      onUpdate();
    } catch (error) {
      console.error('Error saving changes:', error);
      setError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = () => {
    // Make sure to load all necessary location data before entering edit mode
    const prepareForEditing = async () => {
      try {
        setIsLoading(true);
        
        // Map locations with all necessary IDs again to ensure we have the latest data
        const mappedLocations = order.locations.map(loc => ({
          ...loc,
          country_id: loc.city?.state?.country?.id || '',
          state_id: loc.city?.state?.id || '',
          city_id: loc.city?.id || ''
        }));
        
        setEditedLocations(mappedLocations);
        
        // Preload all required location data to ensure dropdown lists are populated
        for (const location of mappedLocations) {
          if (location.country_id) {
            await loadStates(location.country_id);
            if (location.state_id) {
              await loadCities(location.state_id);
            }
          }
        }
        
        setIsEditing(true);
      } catch (error) {
        console.error('Error preparing for editing:', error);
        setError('Failed to load location data for editing');
      } finally {
        setIsLoading(false);
      }
    };
    
    prepareForEditing();
  };

  const handleAssignManifest = async () => {
    if (!selectedManifest) return;

    try {
      const { error } = await supabase
        .from('order_legs')
        .update({ manifest_id: selectedManifest })
        .eq('order_id', orderId)
        .is('parent_leg_id', null);

      if (error) throw error;

      setShowManifestModal(false);
      fetchOrderDetails();
    } catch (error) {
      console.error('Error assigning manifest:', error);
      setError(error instanceof Error ? error.message : 'Failed to assign manifest');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedOrder(order);
    // Reset location data to original state
    setEditedLocations(order.locations.map(loc => ({
      ...loc,
      country_id: loc.city?.state?.country?.id,
      state_id: loc.city?.state?.id,
      city_id: loc.city?.id
    })));
    setError(null);
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getManifestById = (manifestId: string) => {
    if (!order || !order.order_legs) return null;
    
    for (const leg of order.order_legs) {
      if (leg.manifest && leg.manifest.id === manifestId) {
        return leg.manifest;
      }
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Failed to load order details. Please try again.
        </div>
      </div>
    );
  }

  const getPickupLocations = () => {
    return order.locations.filter(loc => loc.type === 'pickup')
      .sort((a, b) => a.sequence_number - b.sequence_number);
  };

  const getDeliveryLocations = () => {
    return order.locations.filter(loc => loc.type === 'delivery')
      .sort((a, b) => a.sequence_number - b.sequence_number);
  };

  const getTotalWeight = () => {
    return commodities.reduce((total, item) => total + parseFloat(item.weight), 0);
  };

  return (
    <div className="relative">
      <div className="p-0">
        <div className="flex justify-between items-center bg-white border-b border-gray-200 px-6 py-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {order.order_number} <span className="inline-block ml-2 px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">Invoice Sent</span>
                </h2>
                <div className="text-sm text-gray-500 flex items-center mt-1">
                  <span>CSR:</span>
                  <span className="ml-2 text-gray-700 font-medium">Taranpreet Singh</span>
                  <span className="mx-2">•</span>
                  <span>On commission:</span>
                  <span className="ml-1">None</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 my-4 bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Tags */}
        <div className="px-6 py-2 bg-gray-50 border-b border-gray-200 flex items-center">
          <div className="text-sm text-gray-500 mr-3">Tags:</div>
          <div className="flex items-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
              Sample
              <button className="ml-1 text-blue-500 hover:text-blue-700">×</button>
            </span>
            <button className="text-blue-600 hover:text-blue-800 text-sm">
              + Add tag
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 flex space-x-8">
            <button
              onClick={() => setActiveTab('legs')}
              className={`py-4 font-medium text-sm border-b-2 transition-colors duration-200 ${
                activeTab === 'legs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Legs (1)
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 font-medium text-sm border-b-2 transition-colors duration-200 ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('commodities')}
              className={`py-4 font-medium text-sm border-b-2 transition-colors duration-200 ${
                activeTab === 'commodities'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Commodities (2)
            </button>
            <button
              onClick={() => setActiveTab('quotes')}
              className={`py-4 font-medium text-sm border-b-2 transition-colors duration-200 ${
                activeTab === 'quotes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Quotes & services (1)
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 font-medium text-sm border-b-2 transition-colors duration-200 ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Documents (2)
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-0">
          {/* Legs Tab */}
          {activeTab === 'legs' && (
            <div>
              {/* Map Section */}
              <div className="h-64 bg-blue-50 relative">
                <img
                  src="https://maps.googleapis.com/maps/api/staticmap?center=United+States&zoom=4&size=1200x300&maptype=roadmap&path=color:0x0000ff|weight:5|Orlando,FL|Flatbush,NY"
                  alt="Route Map"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-white rounded-md shadow-md">
                  <button className="p-2 text-gray-600 hover:text-gray-800">+</button>
                  <button className="p-2 text-gray-600 hover:text-gray-800">−</button>
                </div>
                <div className="absolute bottom-2 right-2 bg-white rounded-md px-3 py-1 text-xs text-gray-600 shadow-md">
                  Live Location ON & Sharing ON
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Legs</h3>
                
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status & type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Origin
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Destination
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Manifest
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Est. Margin
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-gray-100 text-gray-800">
                            DSP
                          </span>
                          <span className="block mt-1 text-sm text-gray-500">P/D</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-medium">
                            {getPickupLocations()[0]?.name || 'Orlando, FL'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(getPickupLocations()[0]?.date).toLocaleDateString()} at {getPickupLocations()[0]?.time}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-medium">
                            {getDeliveryLocations()[0]?.name || 'Flatbush, NY'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(getDeliveryLocations()[0]?.date).toLocaleDateString()} at {getDeliveryLocations()[0]?.time}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {order.order_legs.length > 0 && order.order_legs[0].manifest ? (
                            <div>
                              <div className="text-sm text-blue-600 font-medium">
                                {order.order_legs[0].manifest.number}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Faster Freight LLC
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">No manifest</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-green-600">
                            +{formatCurrency(1080, 'CAD')}
                          </div>
                          <div className="text-xs text-red-600 mt-1">
                            -{formatCurrency(600, 'CAD')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-blue-600 hover:text-blue-800">
                            <CornerDownRight className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="flex justify-between mb-8">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {}}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 flex items-center"
                    >
                      Mark as picked up
                    </button>
                    <button
                      onClick={() => {}}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center"
                    >
                      View manifest
                    </button>
                    <button
                      onClick={() => {}}
                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center"
                    >
                      + Add equipment
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">Total Revenue (CAD)</div>
                    <div className="text-lg font-medium text-gray-900">$1,080.00</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">Total Costs (CAD)</div>
                    <div className="text-lg font-medium text-red-600">-$600.00</div>
                  </div>
                  <div className="border-t pt-4 flex justify-between items-center">
                    <div className="text-sm font-medium text-gray-700">Margin (CAD)</div>
                    <div className="text-lg font-bold text-gray-900">
                      $480.00 (44.44%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Shipper Section */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Shipper</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-900 mb-1">{order.customer_name || 'Walmart Supercenter'}</div>
                    <div className="text-sm text-gray-500">{order.customer_address || '8990 Turkey Lake Road'}</div>
                    <div className="text-sm text-gray-500">Orlando, FL US 32819</div>
                  </div>
                </div>
                
                {/* Consignee Section */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Consignee</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    {getDeliveryLocations()[0] ? (
                      <>
                        <div className="text-sm font-medium text-gray-900 mb-1">{getDeliveryLocations()[0].name}</div>
                        <div className="text-sm text-gray-500">{getDeliveryLocations()[0].street_address}</div>
                        <div className="text-sm text-gray-500">
                          {getDeliveryLocations()[0].city?.name}, 
                          {getDeliveryLocations()[0].city?.state?.name} 
                          {getDeliveryLocations()[0].city?.state?.country?.name && 
                            ` ${getDeliveryLocations()[0].city?.state?.country?.name}`}
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                          <div className="text-xs text-gray-700 font-medium">Contact:</div>
                          <div>john@example.com</div>
                          <div>(718) 284-3593</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm font-medium text-gray-900 mb-1">Natural Frontier Market</div>
                        <div className="text-sm text-gray-500">1102 Cortelyou Road</div>
                        <div className="text-sm text-gray-500">Flatbush, NY US 11218</div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Billing Party Section */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Billing Party</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-900 mb-1">{order.customer_name || 'Walmart Supercenter'}</div>
                    <div className="text-sm text-gray-500">{order.customer_address || '8990 Turkey Lake Road'}</div>
                    <div className="text-sm text-gray-500">Orlando, FL US 32819</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Pickup Time Section */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Ready Time</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-900">
                      {getPickupLocations()[0] ? (
                        <>
                          {new Date(getPickupLocations()[0].date).toLocaleDateString()} @ {getPickupLocations()[0].time}
                          <span className="block text-xs text-gray-500 mt-1">
                            - {new Date(getDeliveryLocations()[0]?.date).toLocaleDateString()} @ {getDeliveryLocations()[0]?.time}
                          </span>
                        </>
                      ) : (
                        'Jan 13, 2025 @ 16:34 - Jan 15, 2025 @ 16:34'
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Delivery Time Section */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Requested Delivery</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="text-sm text-gray-900">
                      {getDeliveryLocations()[0] ? (
                        new Date(getDeliveryLocations()[0].date).toLocaleDateString() + ' @ ' + getDeliveryLocations()[0].time
                      ) : (
                        'No Date Added'
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Special Instructions</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-900">
                    {getPickupLocations()[0]?.special_instructions || "Please label shipment."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Commodities Tab */}
          {activeTab === 'commodities' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Commodities (2)</h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QTY</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LG</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">WD</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HT</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PCS</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LF</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total WT</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Stationery</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Bundle</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">24 inch</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">24 inch</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">24 inch</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">0</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">1 ft</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">600 lb</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">None</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Books</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">5</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Skid</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">24 inch</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">24 inch</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">24 inch</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">0</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">1 ft</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">500 lb</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">None</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Totals</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">7</td>
                      <td colSpan={6} className="px-6 py-4 whitespace-nowrap"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>1100 lbs</div>
                        <div className="text-xs text-gray-500">560 lbs (DIM)</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quotes Tab */}
          {activeTab === 'quotes' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quotes</h3>
              
              <table className="min-w-full divide-y divide-gray-200 mb-6">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Carrier/Service</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Carrier Cost</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quote</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img src="https://via.placeholder.com/40" alt="Carrier Logo" className="w-10 h-10 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">Default Service</div>
                          <div className="text-sm text-gray-500">Service N/A</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">$ 600.00 USD</div>
                      <div className="text-xs text-gray-500">$ 810.00 CAD</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">$ 800.00 USD</div>
                      <div className="text-xs text-gray-500">$ 1,080.00 CAD</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-green-100 text-green-800">
                        <ClipboardCheck className="w-4 h-4 mr-1" />
                        Selected
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Documents</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-blue-500 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Bill of lading</h4>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-500">...</button>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-blue-500 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Labels</h4>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-500">...</button>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-blue-500 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Invoice</h4>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-500">...</button>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-blue-500 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Commercial invoice</h4>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-blue-500 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Proof of pickup</h4>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-blue-500 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Proof of delivery</h4>
                      </div>
                    </div>
                    <Download className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Activity sidebar could be added here in a more complex layout */}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirm Changes
                </h3>
              </div>
            </div>
            <div className="mt-2">
              <p className="text-sm text-gray-500">
                Are you sure you want to save these changes? This action cannot be undone.
              </p>
            </div>
            <div className="mt-5 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showSplitModal && (
        <SplitOrderModal
          orderId={orderId}
          orderNumber={order.order_number}
          onClose={() => setShowSplitModal(false)}
          onSplit={() => {
            setShowSplitModal(false);
            fetchOrderDetails();
            onUpdate();
          }}
        />
      )}

      {showCreateManifestModal && (
        <CreateManifestModal
          orderId={orderId}
          orderNumber={order.order_number}
          onClose={() => setShowCreateManifestModal(false)}
          onSubmit={() => {
            setShowCreateManifestModal(false);
            fetchOrderDetails();
            onUpdate();
          }}
        />
      )}
    </div>
  );
}