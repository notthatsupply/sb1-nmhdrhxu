import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Split, MapPin, Truck, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { z } from 'zod';

interface Terminal {
  id: string;
  name: string;
  street_address: string;
  city: {
    name: string;
    state: {
      name: string;
      country: {
        name: string;
      };
    };
  };
}

interface SplitPoint {
  type: 'gps' | 'location' | 'terminal';
  name: string;
  latitude?: number;
  longitude?: number;
  streetAddress?: string;
  country?: string;
  state?: string;
  city?: string;
  terminalId?: string;
}

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

interface OrderLeg {
  pickupLocations: Location[];
  deliveryLocations: Location[];
}

interface SplitOrderModalProps {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onSplit: () => void;
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

const initialLeg: OrderLeg = {
  pickupLocations: [{ ...initialLocation }],
  deliveryLocations: [{ ...initialLocation }]
};

export function SplitOrderModal({ orderId, orderNumber, onClose, onSplit }: SplitOrderModalProps) {
  const [legs, setLegs] = useState<OrderLeg[]>([{ ...initialLeg }]);
  const [splitPoint, setSplitPoint] = useState<SplitPoint>({
    type: 'gps',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitReason, setSplitReason] = useState('');
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [locationData, setLocationData] = useState<{
    countries: { id: string; name: string; code: string }[];
    states: { id: string; name: string; code: string; country_id: string }[];
    cities: { id: string; name: string; state_id: string }[];
  }>({
    countries: [],
    states: [],
    cities: []
  });

  useEffect(() => {
    loadCountries();
    loadTerminals();
  }, []);

  const loadTerminals = async () => {
    try {
      const { data: terminals, error } = await supabase
        .from('terminals')
        .select(`
          id,
          name,
          street_address,
          city:cities (
            name,
            state:states (
              name,
              country:countries (
                name
              )
            )
          )
        `)
        .order('name');
      
      if (error) throw error;
      
      if (terminals) {
        setTerminals(terminals);
      }
    } catch (error) {
      console.error('Error loading terminals:', error);
    }
  };

  const loadCountries = async () => {
    try {
      const { data: countries, error } = await supabase
        .from('countries')
        .select('*')
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
      const { data: states, error } = await supabase
        .from('states')
        .select('*')
        .eq('country_id', countryId)
        .order('name');
      
      if (error) throw error;
      
      if (states) {
        setLocationData(prev => ({ ...prev, states }));
      }
    } catch (error) {
      console.error('Error loading states:', error);
    }
  };

  const loadCities = async (stateId: string) => {
    try {
      const { data: cities, error } = await supabase
        .from('cities')
        .select('*')
        .eq('state_id', stateId)
        .order('name');
      
      if (error) throw error;
      
      if (cities) {
        setLocationData(prev => ({ ...prev, cities }));
      }
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const addLeg = () => {
    setLegs(prev => [...prev, { ...initialLeg }]);
  };

  const removeLeg = (legIndex: number) => {
    setLegs(prev => prev.filter((_, i) => i !== legIndex));
  };

  const updateLocation = (
    legIndex: number,
    type: 'pickup' | 'delivery',
    locationIndex: number,
    field: keyof Location,
    value: string
  ) => {
    setLegs(prev => prev.map((leg, i) => {
      if (i !== legIndex) return leg;
      
      const locations = type === 'pickup' ? leg.pickupLocations : leg.deliveryLocations;
      const updatedLocations = locations.map((loc, j) =>
        j === locationIndex ? { ...loc, [field]: value } : loc
      );
      
      return {
        ...leg,
        [type === 'pickup' ? 'pickupLocations' : 'deliveryLocations']: updatedLocations
      };
    }));
  };

  const handleCountryChange = async (
    legIndex: number,
    type: 'pickup' | 'delivery',
    locationIndex: number,
    countryId: string
  ) => {
    updateLocation(legIndex, type, locationIndex, 'country', countryId);
    updateLocation(legIndex, type, locationIndex, 'state', '');
    updateLocation(legIndex, type, locationIndex, 'city', '');
    await loadStates(countryId);
  };

  const handleStateChange = async (
    legIndex: number,
    type: 'pickup' | 'delivery',
    locationIndex: number,
    stateId: string
  ) => {
    updateLocation(legIndex, type, locationIndex, 'state', stateId);
    updateLocation(legIndex, type, locationIndex, 'city', '');
    await loadCities(stateId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create split point
      const splitPointData: any = {
        name: splitPoint.name,
        type: splitPoint.type
      };

      if (splitPoint.type === 'gps') {
        splitPointData.latitude = splitPoint.latitude;
        splitPointData.longitude = splitPoint.longitude;
      } else if (splitPoint.type === 'location') {
        splitPointData.street_address = splitPoint.streetAddress;
        splitPointData.city_id = splitPoint.city;
      } else if (splitPoint.type === 'terminal') {
        splitPointData.terminal_id = splitPoint.terminalId;
      }

      const { data: splitPointRecord, error: splitPointError } = await supabase
        .from('split_points')
        .insert(splitPointData)
        .select()
        .single();

      if (splitPointError) throw splitPointError;

      // Get original leg
      const { data: originalLeg, error: legError } = await supabase
        .from('order_legs')
        .select('*')
        .eq('order_id', orderId)
        .is('parent_leg_id', null)
        .single();

      if (legError || !originalLeg) {
        throw new Error('Failed to find original leg');
      }

      // Create two new legs
      const { error: splitLegsError } = await supabase
        .from('order_legs')
        .insert([
          {
            order_id: orderId,
            parent_leg_id: originalLeg.id,
            split_point_id: splitPointRecord.id,
            split_sequence: 1,
            split_reason: splitReason,
            status: 'pending'
          },
          {
            order_id: orderId,
            parent_leg_id: originalLeg.id,
            split_point_id: splitPointRecord.id,
            split_sequence: 2,
            split_reason: splitReason,
            status: 'pending'
          }
        ]);

      if (splitLegsError) throw splitLegsError;

      onSplit();
      onClose();
    } catch (error) {
      console.error('Error splitting order:', error);
      setError(error instanceof Error ? error.message : 'Failed to split order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Split className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Split Order</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">Order #{orderNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Split Point Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Split Point Type</label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setSplitPoint(prev => ({ ...prev, type: 'gps' }))}
                  className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200 ${
                    splitPoint.type === 'gps'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <MapPin className={`w-6 h-6 ${
                    splitPoint.type === 'gps' ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <span className="mt-2 text-sm font-medium">GPS Coordinates</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitPoint(prev => ({ ...prev, type: 'location' }))}
                  className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200 ${
                    splitPoint.type === 'location'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <Truck className={`w-6 h-6 ${
                    splitPoint.type === 'location' ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <span className="mt-2 text-sm font-medium">Location</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSplitPoint(prev => ({ ...prev, type: 'terminal' }))}
                  className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200 ${
                    splitPoint.type === 'terminal'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-200'
                  }`}
                >
                  <Building2 className={`w-6 h-6 ${
                    splitPoint.type === 'terminal' ? 'text-blue-500' : 'text-gray-400'
                  }`} />
                  <span className="mt-2 text-sm font-medium">Terminal</span>
                </button>
              </div>
            </div>

            {/* Split Point Details */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Split Point Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={splitPoint.name}
                    onChange={(e) => setSplitPoint(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                    placeholder="Enter a name for this split point"
                  />
                </div>

                {splitPoint.type === 'gps' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={splitPoint.latitude || ''}
                        onChange={(e) => setSplitPoint(prev => ({
                          ...prev,
                          latitude: parseFloat(e.target.value)
                        }))}
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                        placeholder="e.g., 43.6532"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={splitPoint.longitude || ''}
                        onChange={(e) => setSplitPoint(prev => ({
                          ...prev,
                          longitude: parseFloat(e.target.value)
                        }))}
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                        placeholder="e.g., -79.3832"
                      />
                    </div>
                  </div>
                )}

                {splitPoint.type === 'location' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Street Address</label>
                      <input
                        type="text"
                        value={splitPoint.streetAddress || ''}
                        onChange={(e) => setSplitPoint(prev => ({
                          ...prev,
                          streetAddress: e.target.value
                        }))}
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Country</label>
                        <select
                          value={splitPoint.country || ''}
                          onChange={(e) => {
                            setSplitPoint(prev => ({
                              ...prev,
                              country: e.target.value,
                              state: '',
                              city: ''
                            }));
                            loadStates(e.target.value);
                          }}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Country</option>
                          {locationData.countries.map(country => (
                            <option key={country.id} value={country.id}>{country.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">State/Province</label>
                        <select
                          value={splitPoint.state || ''}
                          onChange={(e) => {
                            setSplitPoint(prev => ({
                              ...prev,
                              state: e.target.value,
                              city: ''
                            }));
                            loadCities(e.target.value);
                          }}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                          disabled={!splitPoint.country}
                        >
                          <option value="">Select State</option>
                          {locationData.states
                            .filter(state => state.country_id === splitPoint.country)
                            .map(state => (
                              <option key={state.id} value={state.id}>{state.name}</option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">City</label>
                        <select
                          value={splitPoint.city || ''}
                          onChange={(e) => setSplitPoint(prev => ({
                            ...prev,
                            city: e.target.value
                          }))}
                          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                          disabled={!splitPoint.state}
                        >
                          <option value="">Select City</option>
                          {locationData.cities
                            .filter(city => city.state_id === splitPoint.state)
                            .map(city => (
                              <option key={city.id} value={city.id}>{city.name}</option>
                            ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {splitPoint.type === 'terminal' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Terminal</label>
                    <select
                      value={splitPoint.terminalId || ''}
                      onChange={(e) => setSplitPoint(prev => ({
                        ...prev,
                        terminalId: e.target.value
                      }))}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Terminal</option>
                      {terminals.map(terminal => (
                        <option key={terminal.id} value={terminal.id}>
                          {terminal.name} - {terminal.street_address}, {terminal.city.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Split Reason */}
            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700">Split Reason</label>
              <textarea
                value={splitReason}
                onChange={(e) => setSplitReason(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                placeholder="Enter the reason for splitting this order..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Split className="w-4 h-4 mr-2" />
                {loading ? 'Splitting Order...' : 'Split Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}