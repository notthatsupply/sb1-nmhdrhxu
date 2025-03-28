import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Save, AlertTriangle, Info, Clock } from 'lucide-react';
import { z } from 'zod';
import { orderFormSchema } from '../lib/validation';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

interface Location {
  name: string;
  streetAddress: string;
  country: string;
  city: string;
  state: string;
  date: string;
  time: string;
  specialInstructions: string;
}

interface OrderFormData {
  customerName: string;
  customerAddress: string;
  contactPerson: string;
  phoneNumber: string;
  loadTenderNumber: string;
  rate: string;
  currency: 'CAD' | 'USD';
  commodity: string;
  weight: string;
  referenceNumber: string;
  pickupLocations: Location[];
  deliveryLocations: Location[];
}

interface NewOrderFormProps {
  onClose: () => void;
  onSubmit: (data: OrderFormData) => void;
}

interface LocationData {
  pickup: {
    countries: { id: string; name: string; code: string }[];
    states: { id: string; name: string; code: string; country_id: string }[];
    cities: { id: string; name: string; state_id: string }[];
  };
  delivery: {
    countries: { id: string; name: string; code: string }[];
    states: { id: string; name: string; code: string; country_id: string }[];
    cities: { id: string; name: string; state_id: string }[];
  };
}

const initialLocation: Location = {
  name: '',
  streetAddress: '',
  country: '',
  city: '',
  state: '',
  date: '',
  time: '',
  specialInstructions: ''
};

export function NewOrderForm({ onClose, onSubmit }: NewOrderFormProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const { session } = useAuth();
  const [locationData, setLocationData] = useState<LocationData>({
    pickup: {
      countries: [],
      states: [],
      cities: []
    },
    delivery: {
      countries: [],
      states: [],
      cities: []
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<OrderFormData>({
    customerName: '',
    customerAddress: '',
    contactPerson: '',
    phoneNumber: '',
    loadTenderNumber: '',
    rate: '',
    currency: 'CAD',
    commodity: '',
    weight: '',
    referenceNumber: '',
    pickupLocations: [{ ...initialLocation }],
    deliveryLocations: [{ ...initialLocation }]
  });

  useEffect(() => {
    loadCountries();
    
    // Set today's date as the default for all date inputs
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev,
      pickupLocations: prev.pickupLocations.map(loc => ({
        ...loc,
        date: loc.date || today
      })),
      deliveryLocations: prev.deliveryLocations.map(loc => ({
        ...loc,
        date: loc.date || today
      }))
    }));
  }, []);

  useEffect(() => {
    // Clear errors when changing steps
    setErrors({});
    setFormErrors([]);
  }, [currentStep]);

  const updateLocationData = (
    type: 'pickup' | 'delivery',
    field: 'countries' | 'states' | 'cities',
    data: any[]
  ) => {
    setLocationData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: data
      }
    }));
  };

  const loadCountries = async () => {
    try {
      const { data: countries, error } = await supabase
        .from('countries')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      if (countries) {
        updateLocationData('pickup', 'countries', countries);
        updateLocationData('delivery', 'countries', countries);
      }
    } catch (error) {
      console.error('Error loading countries:', error);
      setFormErrors(prev => [...prev, 'Failed to load countries. Please try again.']);
    }
  };

  const loadStates = async (type: 'pickup' | 'delivery', countryId: string) => {
    try {
      const { data: states, error } = await supabase
        .from('states')
        .select('*')
        .eq('country_id', countryId)
        .order('name');
      
      if (error) throw error;
      
      if (states) {
        updateLocationData(type, 'states', states);
      }
    } catch (error) {
      console.error('Error loading states:', error);
      setFormErrors(prev => [...prev, 'Failed to load states/provinces. Please try again.']);
    }
  };

  const loadCities = async (type: 'pickup' | 'delivery', stateId: string) => {
    try {
      const { data: cities, error } = await supabase
        .from('cities')
        .select('*')
        .eq('state_id', stateId)
        .order('name');
      
      if (error) throw error;
      
      if (cities) {
        updateLocationData(type, 'cities', cities);
      }
    } catch (error) {
      console.error('Error loading cities:', error);
      setFormErrors(prev => [...prev, 'Failed to load cities. Please try again.']);
    }
  };

  const handleCountryChange = async (
    type: 'pickup' | 'delivery',
    index: number,
    countryId: string
  ) => {
    const locations = type === 'pickup' ? 'pickupLocations' : 'deliveryLocations';
    setFormData(prev => ({
      ...prev,
      [locations]: prev[locations].map((loc, i) =>
        i === index ? { ...loc, country: countryId, state: '', city: '' } : loc
      ),
    }));
    await loadStates(type, countryId);
  };

  const handleStateChange = async (
    type: 'pickup' | 'delivery',
    index: number,
    stateId: string
  ) => {
    const locations = type === 'pickup' ? 'pickupLocations' : 'deliveryLocations';
    setFormData(prev => ({
      ...prev,
      [locations]: prev[locations].map((loc, i) =>
        i === index ? { ...loc, state: stateId, city: '' } : loc
      ),
    }));
    await loadCities(type, stateId);
  };

  const validateCurrentStep = (): boolean => {
    const currentErrors: Record<string, string> = {};
    
    if (currentStep === 1) {
      if (!formData.customerName) currentErrors.customerName = 'Customer name is required';
      if (!formData.customerAddress) currentErrors.customerAddress = 'Customer address is required';
      if (!formData.contactPerson) currentErrors.contactPerson = 'Contact person is required';
      if (!formData.phoneNumber) currentErrors.phoneNumber = 'Phone number is required';
    } else if (currentStep === 2) {
      if (!formData.loadTenderNumber) currentErrors.loadTenderNumber = 'Load tender number is required';
      if (!formData.rate) currentErrors.rate = 'Rate is required';
      else if (isNaN(parseFloat(formData.rate)) || parseFloat(formData.rate) <= 0) {
        currentErrors.rate = 'Rate must be a positive number';
      }
      if (!formData.commodity) currentErrors.commodity = 'Commodity is required';
      if (!formData.weight) currentErrors.weight = 'Weight is required';
      else if (isNaN(parseFloat(formData.weight)) || parseFloat(formData.weight) <= 0) {
        currentErrors.weight = 'Weight must be a positive number';
      }
    } else if (currentStep === 3) {
      // Validate pickup locations
      formData.pickupLocations.forEach((loc, index) => {
        if (!loc.name) currentErrors[`pickupLocations.${index}.name`] = 'Location name is required';
        if (!loc.country) currentErrors[`pickupLocations.${index}.country`] = 'Country is required';
        if (!loc.state) currentErrors[`pickupLocations.${index}.state`] = 'State/Province is required';
        if (!loc.city) currentErrors[`pickupLocations.${index}.city`] = 'City is required';
        if (!loc.streetAddress) currentErrors[`pickupLocations.${index}.streetAddress`] = 'Street address is required';
        if (!loc.date) currentErrors[`pickupLocations.${index}.date`] = 'Date is required';
        if (!loc.time) currentErrors[`pickupLocations.${index}.time`] = 'Time is required';
      });
      
      // Validate delivery locations
      formData.deliveryLocations.forEach((loc, index) => {
        if (!loc.name) currentErrors[`deliveryLocations.${index}.name`] = 'Location name is required';
        if (!loc.country) currentErrors[`deliveryLocations.${index}.country`] = 'Country is required';
        if (!loc.state) currentErrors[`deliveryLocations.${index}.state`] = 'State/Province is required';
        if (!loc.city) currentErrors[`deliveryLocations.${index}.city`] = 'City is required';
        if (!loc.streetAddress) currentErrors[`deliveryLocations.${index}.streetAddress`] = 'Street address is required';
        if (!loc.date) currentErrors[`deliveryLocations.${index}.date`] = 'Date is required';
        if (!loc.time) currentErrors[`deliveryLocations.${index}.time`] = 'Time is required';
      });
      
      // Check if pickup dates are before delivery dates
      if (formData.pickupLocations.length > 0 && formData.deliveryLocations.length > 0) {
        const latestPickupDate = Math.max(
          ...formData.pickupLocations
            .map(loc => loc.date && loc.time ? new Date(`${loc.date}T${loc.time}`).getTime() : 0)
            .filter(time => time > 0)
        );
        
        const earliestDeliveryDate = Math.min(
          ...formData.deliveryLocations
            .map(loc => loc.date && loc.time ? new Date(`${loc.date}T${loc.time}`).getTime() : Infinity)
            .filter(time => time < Infinity)
        );
        
        if (latestPickupDate && earliestDeliveryDate && latestPickupDate >= earliestDeliveryDate) {
          setFormErrors(['Pickup dates must be earlier than delivery dates']);
        }
      }
    }
    
    setErrors(currentErrors);
    return Object.keys(currentErrors).length === 0 && formErrors.length === 0;
  };

  const handleNextStep = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (validateCurrentStep()) {
      setCurrentStep((currentStep + 1) as 2 | 3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep < 3) {
      if (validateCurrentStep()) {
        setCurrentStep((currentStep + 1) as 2 | 3);
      }
      return;
    }

    if (!validateCurrentStep()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setFormErrors([]);

    try {
      if (!session?.user) {
        throw new Error('You must be logged in to create orders');
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: formData.customerName,
          customer_address: formData.customerAddress,
          contact_person: formData.contactPerson,
          phone_number: formData.phoneNumber,
          load_tender_number: formData.loadTenderNumber,
          rate: parseFloat(formData.rate),
          currency: formData.currency,
          commodity: formData.commodity,
          weight: parseFloat(formData.weight),
          reference_number: formData.referenceNumber || null
        })
        .select()
        .single();

      if (orderError) {
        console.error('Order creation error:', orderError);
        if (orderError.message.includes('duplicate key')) {
          if (orderError.message.includes('load_tender_number')) {
            throw new Error('This load tender number already exists');
          } else {
            throw new Error('A duplicate entry was found. Please check your data and try again.');
          }
        }
        throw orderError;
      }

      if (!order) {
        throw new Error('Failed to create order - no order data returned');
      }

      // Create locations
      const locationsToInsert = [
        ...formData.pickupLocations.map((loc, index) => ({
          order_id: order.id,
          type: 'pickup' as const,
          name: loc.name,
          street_address: loc.streetAddress,
          city_id: loc.city,
          date: new Date(`${loc.date}T${loc.time}`).toISOString(),
          time: loc.time,
          special_instructions: loc.specialInstructions || null,
          sequence_number: index
        })),
        ...formData.deliveryLocations.map((loc, index) => ({
          order_id: order.id,
          type: 'delivery' as const,
          name: loc.name,
          street_address: loc.streetAddress,
          city_id: loc.city,
          date: new Date(`${loc.date}T${loc.time}`).toISOString(),
          time: loc.time,
          special_instructions: loc.specialInstructions || null,
          sequence_number: index
        }))
      ];

      const { error: locationsError } = await supabase
        .from('locations')
        .insert(locationsToInsert);

      if (locationsError) {
        console.error('Location creation error:', locationsError);
        // Try to delete the created order to avoid orphaned records
        await supabase.from('orders').delete().eq('id', order.id);
        throw locationsError;
      }

      // Create initial order leg
      const { error: legError } = await supabase
        .from('order_legs')
        .insert({
          order_id: order.id,
          sequence_number: 1,
          status: 'pending'
        });

      if (legError) {
        console.error('Order leg creation error:', legError);
        // Log the error but don't fail the whole operation
      }

      // Create audit log entry
      await supabase
        .from('audit_logs')
        .insert({
          order_id: order.id,
          action: 'create',
          table_name: 'orders',
          record_id: order.id,
          new_data: order
        });

      // Close form and refresh orders list
      onSubmit(formData);
    } catch (error) {
      console.error('Error creating order:', error);
      
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          newErrors[err.path.join('.')] = err.message;
        });
        setErrors(newErrors);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create order. Please try again.';
        setFormErrors([errorMessage]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateLocation = (
    type: 'pickup' | 'delivery',
    index: number,
    field: keyof Location,
    value: string
  ) => {
    const locations = type === 'pickup' ? 'pickupLocations' : 'deliveryLocations';
    setFormData(prev => ({
      ...prev,
      [locations]: prev[locations].map((loc, i) =>
        i === index ? { ...loc, [field]: value } : loc
      ),
    }));
  };

  const addLocation = (type: 'pickup' | 'delivery') => {
    const locations = type === 'pickup' ? 'pickupLocations' : 'deliveryLocations';
    setFormData(prev => ({
      ...prev,
      [locations]: [...prev[locations], { ...initialLocation }],
    }));
  };

  const removeLocation = (type: 'pickup' | 'delivery', index: number) => {
    const locations = type === 'pickup' ? 'pickupLocations' : 'deliveryLocations';
    setFormData(prev => ({
      ...prev,
      [locations]: prev[locations].filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">New Order</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {formErrors.length > 0 && (
            <div className="mb-6 bg-red-50 p-4 rounded-md">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    There {formErrors.length === 1 ? 'was an error' : 'were errors'} with your submission
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {formErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <nav className="flex items-center justify-between" aria-label="Progress">
              <ol className="flex items-center w-full">
                <li className="relative pr-8 sm:pr-20 flex-1">
                  <div className="flex items-center">
                    <div className={`h-10 w-10 flex items-center justify-center rounded-full
                      ${currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <span className="text-white font-medium">1</span>
                    </div>
                    <div className="ml-4">
                      <p className={`text-sm font-medium ${currentStep === 1 ? 'text-blue-600' : 'text-gray-900'}`}>
                        Customer Info
                      </p>
                      <p className="text-xs text-gray-500">Basic information</p>
                    </div>
                  </div>
                  <div className={`absolute top-5 left-10 w-full h-0.5 ${currentStep > 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                </li>

                <li className="relative pr-8 sm:pr-20 flex-1">
                  <div className="flex items-center">
                    <div className={`h-10 w-10 flex items-center justify-center rounded-full
                      ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <span className="text-white font-medium">2</span>
                    </div>
                    <div className="ml-4">
                      <p className={`text-sm font-medium ${currentStep === 2 ? 'text-blue-600' : 'text-gray-900'}`}>
                        Load Details
                      </p>
                      <p className="text-xs text-gray-500">Shipment details</p>
                    </div>
                  </div>
                  <div className={`absolute top-5 left-10 w-full h-0.5 ${currentStep > 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                </li>

                <li className="relative flex-1">
                  <div className="flex items-center">
                    <div className={`h-10 w-10 flex items-center justify-center rounded-full
                      ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <span className="text-white font-medium">3</span>
                    </div>
                    <div className="ml-4">
                      <p className={`text-sm font-medium ${currentStep === 3 ? 'text-blue-600' : 'text-gray-900'}`}>
                        Locations
                      </p>
                      <p className="text-xs text-gray-500">Pickup and delivery</p>
                    </div>
                  </div>
                </li>
              </ol>
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      errors.customerName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.customerName && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Address</label>
                  <input
                    type="text"
                    value={formData.customerAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerAddress: e.target.value }))}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      errors.customerAddress ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.customerAddress && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerAddress}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      errors.contactPerson ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.contactPerson && (
                    <p className="mt-1 text-sm text-red-600">{errors.contactPerson}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                    placeholder="+1 (123) 456-7890"
                  />
                  {errors.phoneNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Load Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Load Tender Number</label>
                  <input
                    type="text"
                    value={formData.loadTenderNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, loadTenderNumber: e.target.value }))}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      errors.loadTenderNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.loadTenderNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.loadTenderNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Rate</label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="number"
                      value={formData.rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                      className={`flex-1 rounded-l-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        errors.rate ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                      min="0"
                      step="0.01"
                    />
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value as 'CAD' | 'USD' }))}
                      className="rounded-r-md border-l-0 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="CAD">CAD</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  {errors.rate && (
                    <p className="mt-1 text-sm text-red-600">{errors.rate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Commodity</label>
                  <input
                    type="text"
                    value={formData.commodity}
                    onChange={(e) => setFormData(prev => ({ ...prev, commodity: e.target.value }))}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      errors.commodity ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {errors.commodity && (
                    <p className="mt-1 text-sm text-red-600">{errors.commodity}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Weight (lbs)</label>
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                      errors.weight ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                    min="0"
                  />
                  {errors.weight && (
                    <p className="mt-1 text-sm text-red-600">{errors.weight}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Reference Number</label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Locations */}
            {currentStep === 3 && (
              <div className="space-y-8">
                {/* Pickup Locations */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Pickup Locations</h3>
                    <button
                      type="button"
                      onClick={() => addLocation('pickup')}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Location
                    </button>
                  </div>

                  {formData.pickupLocations.map((location, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-medium text-gray-700">Pickup Location {index + 1}</h4>
                        {formData.pickupLocations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLocation('pickup', index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Location Name</label>
                          <input
                            type="text"
                            value={location.name}
                            onChange={(e) => updateLocation('pickup', index, 'name', e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors[`pickupLocations.${index}.name`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                          />
                          {errors[`pickupLocations.${index}.name`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`pickupLocations.${index}.name`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Country</label>
                          <select
                            value={location.country}
                            onChange={(e) => handleCountryChange('pickup', index, e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors[`pickupLocations.${index}.country`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                          >
                            <option value="">Select Country</option>
                            {locationData.pickup.countries.map(country => (
                              <option key={country.id} value={country.id}>{country.name}</option>
                            ))}
                          </select>
                          {errors[`pickupLocations.${index}.country`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`pickupLocations.${index}.country`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">State/Province</label>
                          <select
                            value={location.state}
                            onChange={(e) => handleStateChange('pickup', index, e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors[`pickupLocations.${index}.state`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                            disabled={!location.country}
                          >
                            <option value="">Select State/Province</option>
                            {locationData.pickup.states
                              .filter(state => state.country_id === location.country)
                              .map(state => (
                                <option key={state.id} value={state.id}>{state.name}</option>
                              ))}
                          </select>
                          {errors[`pickupLocations.${index}.state`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`pickupLocations.${index}.state`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">City</label>
                          <select
                            value={location.city}
                            onChange={(e) => updateLocation('pickup', index, 'city', e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors[`pickupLocations.${index}.city`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                            disabled={!location.state}
                          >
                            <option value="">Select City</option>
                            {locationData.pickup.cities
                              .filter(city => city.state_id === location.state)
                              .map(city => (
                                <option key={city.id} value={city.id}>{city.name}</option>
                              ))}
                          </select>
                          {errors[`pickupLocations.${index}.city`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`pickupLocations.${index}.city`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Street Address</label>
                          <input
                            type="text"
                            value={location.streetAddress}
                            onChange={(e) => updateLocation('pickup', index, 'streetAddress', e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors[`pickupLocations.${index}.streetAddress`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                          />
                          {errors[`pickupLocations.${index}.streetAddress`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`pickupLocations.${index}.streetAddress`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Date</label>
                          <input
                            type="date"
                            value={location.date}
                            onChange={(e) => updateLocation('pickup', index, 'date', e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors[`pickupLocations.${index}.date`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                          />
                          {errors[`pickupLocations.${index}.date`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`pickupLocations.${index}.date`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Time</label>
                          <input
                            type="time"
                            value={location.time}
                            onChange={(e) => updateLocation('pickup', index, 'time', e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors[`pickupLocations.${index}.time`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                          />
                          {errors[`pickupLocations.${index}.time`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`pickupLocations.${index}.time`]}</p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Special Instructions</label>
                          <textarea
                            value={location.specialInstructions}
                            onChange={(e) => updateLocation('pickup', index, 'specialInstructions', e.target.value)}
                            rows={2}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Delivery Locations */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Delivery Locations</h3>
                    <button
                      type="button"
                      onClick={() => addLocation('delivery')}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Location
                    </button>
                  </div>

                  {formData.deliveryLocations.map((location, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg mb-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-sm font-medium text-gray-700">Delivery Location {index + 1}</h4>
                        {formData.deliveryLocations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLocation('delivery', index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Location Name</label>
                          <input
                            type="text"
                            value={location.name}
                            onChange={(e) => updateLocation('delivery', index, 'name', e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors[`deliveryLocations.${index}.name`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                          />
                          {errors[`deliveryLocations.${index}.name`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`deliveryLocations.${index}.name`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Country</label>
                          <select
                            value={location.country}
                            onChange={(e) => handleCountryChange('delivery', index, e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors[`deliveryLocations.${index}.country`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                          >
                            <option value="">Select Country</option>
                            {locationData.delivery.countries.map(country => (
                              <option key={country.id} value={country.id}>{country.name}</option>
                            ))}
                          </select>
                          {errors[`deliveryLocations.${index}.country`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`deliveryLocations.${index}.country`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">State/Province</label>
                          <select
                            value={location.state}
                            onChange={(e) => handleStateChange('delivery', index, e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors[`deliveryLocations.${index}.state`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                            disabled={!location.country}
                          >
                            <option value="">Select State/Province</option>
                            {locationData.delivery.states
                              .filter(state => state.country_id === location.country)
                              .map(state => (
                                <option key={state.id} value={state.id}>{state.name}</option>
                              ))}
                          </select>
                          {errors[`deliveryLocations.${index}.state`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`deliveryLocations.${index}.state`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">City</label>
                          <select
                            value={location.city}
                            onChange={(e) => updateLocation('delivery', index, 'city', e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors[`deliveryLocations.${index}.city`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                            disabled={!location.state}
                          >
                            <option value="">Select City</option>
                            {locationData.delivery.cities
                              .filter(city => city.state_id === location.state)
                              .map(city => (
                                <option key={city.id} value={city.id}>{city.name}</option>
                              ))}
                          </select>
                          {errors[`deliveryLocations.${index}.city`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`deliveryLocations.${index}.city`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Street Address</label>
                          <input
                            type="text"
                            value={location.streetAddress}
                            onChange={(e) => updateLocation('delivery', index, 'streetAddress', e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors[`deliveryLocations.${index}.streetAddress`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                          />
                          {errors[`deliveryLocations.${index}.streetAddress`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`deliveryLocations.${index}.streetAddress`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Date</label>
                          <input
                            type="date"
                            value={location.date}
                            onChange={(e) => updateLocation('delivery', index, 'date', e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors[`deliveryLocations.${index}.date`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                          />
                          {errors[`deliveryLocations.${index}.date`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`deliveryLocations.${index}.date`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Time</label>
                          <input
                            type="time"
                            value={location.time}
                            onChange={(e) => updateLocation('delivery', index, 'time', e.target.value)}
                            className={`mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors[`deliveryLocations.${index}.time`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            required
                          />
                          {errors[`deliveryLocations.${index}.time`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`deliveryLocations.${index}.time`]}</p>
                          )}
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700">Special Instructions</label>
                          <textarea
                            value={location.specialInstructions}
                            onChange={(e) => updateLocation('delivery', index, 'specialInstructions', e.target.value)}
                            rows={2}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Timing Requirements Information */}
                <div className="bg-blue-50 p-4 rounded-md flex items-start">
                  <Info className="h-5 w-5 text-blue-500 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Important Information</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Ensure all pickup dates/times are before delivery dates/times.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8 border-t pt-6">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((currentStep - 1) as 1 | 2)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Previous
                </button>
              ) : (
                <div></div> // Empty div to maintain flex layout
              )}
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="-ml-1 mr-2 h-4 w-4" />
                      Create Order
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}