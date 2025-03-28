import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Plus, Minus, GripVertical, Save, Truck } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface Location {
  id: string;
  type: 'pickup' | 'delivery' | 'drop_off';
  name: string;
  streetAddress: string;
  country: string;
  city: string;
  state: string;
  date: string;
  time: string;
  contactName: string;
  contactPhone: string;
  specialInstructions: string;
  sequence: number;
  terminalId?: string;
}

interface ManifestFormProps {
  onClose: () => void;
  onSubmit: () => void;
  manifestId?: string;
}

const initialLocation: Location = {
  id: crypto.randomUUID(),
  type: 'pickup',
  name: '',
  streetAddress: '',
  country: '',
  city: '',
  state: '',
  date: '',
  time: '',
  contactName: '',
  contactPhone: '',
  specialInstructions: '',
  sequence: 0
};

export function ManifestForm({ onClose, onSubmit, manifestId }: ManifestFormProps) {
  const [locations, setLocations] = useState<Location[]>([{ ...initialLocation }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminals, setTerminals] = useState<{ id: string; name: string }[]>([]);
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
    if (manifestId) {
      loadManifest();
    }
  }, [manifestId]);

  const loadTerminals = async () => {
    try {
      const { data: terminals, error } = await supabase
        .from('terminals')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      
      if (terminals) {
        setTerminals(terminals);
      }
    } catch (error) {
      console.error('Error loading terminals:', error);
    }
  };

  const loadManifest = async () => {
    try {
      const { data, error } = await supabase
        .from('manifests')
        .select(`
          *,
          leg_locations (
            *,
            city:cities (
              name,
              state:states (
                name,
                country:countries (
                  name
                )
              )
            )
          )
        `)
        .eq('id', manifestId)
        .single();

      if (error) throw error;

      if (data) {
        // Transform locations data
        const transformedLocations = data.leg_locations.map((loc: any) => ({
          id: loc.id,
          type: loc.type,
          name: loc.name,
          streetAddress: loc.street_address,
          country: loc.city.state.country.id,
          state: loc.city.state.id,
          city: loc.city.id,
          date: new Date(loc.date).toISOString().split('T')[0],
          time: loc.time,
          contactName: loc.contact_name,
          contactPhone: loc.contact_phone,
          terminalId: loc.terminal_id,
          specialInstructions: loc.special_instructions || '',
          sequence: loc.sequence_number
        }));

        setLocations(transformedLocations);
      }
    } catch (error) {
      console.error('Error loading manifest:', error);
      setError('Failed to load manifest');
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

  const handleCountryChange = async (index: number, countryId: string) => {
    setLocations(prev => prev.map((loc, i) =>
      i === index ? { ...loc, country: countryId, state: '', city: '' } : loc
    ));
    await loadStates(countryId);
  };

  const handleStateChange = async (index: number, stateId: string) => {
    setLocations(prev => prev.map((loc, i) =>
      i === index ? { ...loc, state: stateId, city: '' } : loc
    ));
    await loadCities(stateId);
  };

  const addLocation = () => {
    setLocations(prev => [
      ...prev,
      {
        ...initialLocation,
        id: crypto.randomUUID(),
        sequence: prev.length
      }
    ]);
  };

  const removeLocation = (index: number) => {
    setLocations(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(locations);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update sequence numbers
    const updatedItems = items.map((item, index) => ({
      ...item,
      sequence: index
    }));

    setLocations(updatedItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create or update manifest
      const { data: manifest, error: manifestError } = await supabase
        .from('manifests')
        .upsert({
          id: manifestId || undefined,
          status: 'pending'
        })
        .select()
        .single();

      if (manifestError) throw manifestError;

      // Create locations
      const locationsToInsert = locations.map(loc => ({
        manifest_id: manifest.id,
        type: loc.type,
        name: loc.name,
        street_address: loc.streetAddress,
        city_id: loc.city,
        date: new Date(`${loc.date} ${loc.time}`).toISOString(),
        time: loc.time,
        contact_name: loc.contactName,
        contact_phone: loc.contactPhone,
        terminal_id: loc.type === 'drop_off' ? loc.terminalId : null,
        special_instructions: loc.specialInstructions || null,
        sequence_number: loc.sequence
      }));

      const { error: locationsError } = await supabase
        .from('leg_locations')
        .upsert(locationsToInsert);

      if (locationsError) throw locationsError;

      onSubmit();
      onClose();
    } catch (error) {
      console.error('Error saving manifest:', error);
      setError('Failed to save manifest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {manifestId ? 'Edit Manifest' : 'Create New Manifest'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Add and arrange stops in the desired sequence
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="locations">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-4"
                  >
                    {locations.map((location, index) => (
                      <Draggable
                        key={location.id}
                        draggableId={location.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="bg-gray-50 p-4 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center">
                                <div {...provided.dragHandleProps} className="mr-3">
                                  <GripVertical className="w-5 h-5 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">
                                  Stop {index + 1}
                                </h3>
                              </div>
                              {locations.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLocation(index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Minus className="w-5 h-5" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Type
                                </label>
                                <select
                                  value={location.type}
                                  onChange={(e) => setLocations(prev => prev.map((loc, i) =>
                                    i === index ? { ...loc, type: e.target.value as 'pickup' | 'delivery' } : loc
                                  ))}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                  required
                                >
                                  <option value="pickup">Pickup</option>
                                  <option value="delivery">Delivery</option>
                                  <option value="drop_off">Drop Off</option>
                                </select>
                              </div>

                              {location.type === 'drop_off' ? (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">
                                    Terminal
                                  </label>
                                  <select
                                    value={location.terminalId || ''}
                                    onChange={(e) => setLocations(prev => prev.map((loc, i) =>
                                      i === index ? { ...loc, terminalId: e.target.value } : loc
                                    ))}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    required
                                  >
                                    <option value="">Select Terminal</option>
                                    {terminals.map(terminal => (
                                      <option key={terminal.id} value={terminal.id}>
                                        {terminal.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                      Location Name
                                    </label>
                                    <input
                                      type="text"
                                      value={location.name}
                                      onChange={(e) => setLocations(prev => prev.map((loc, i) =>
                                        i === index ? { ...loc, name: e.target.value } : loc
                                      ))}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                      Street Address
                                    </label>
                                    <input
                                      type="text"
                                      value={location.streetAddress}
                                      onChange={(e) => setLocations(prev => prev.map((loc, i) =>
                                        i === index ? { ...loc, streetAddress: e.target.value } : loc
                                      ))}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                      Country
                                    </label>
                                    <select
                                      value={location.country}
                                      onChange={(e) => handleCountryChange(index, e.target.value)}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      required
                                    >
                                      <option value="">Select Country</option>
                                      {locationData.countries.map(country => (
                                        <option key={country.id} value={country.id}>
                                          {country.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                      State/Province
                                    </label>
                                    <select
                                      value={location.state}
                                      onChange={(e) => handleStateChange(index, e.target.value)}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      required
                                      disabled={!location.country}
                                    >
                                      <option value="">Select State/Province</option>
                                      {locationData.states
                                        .filter(state => state.country_id === location.country)
                                        .map(state => (
                                          <option key={state.id} value={state.id}>
                                            {state.name}
                                          </option>
                                        ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                      City
                                    </label>
                                    <select
                                      value={location.city}
                                      onChange={(e) => setLocations(prev => prev.map((loc, i) =>
                                        i === index ? { ...loc, city: e.target.value } : loc
                                      ))}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      required
                                      disabled={!location.state}
                                    >
                                      <option value="">Select City</option>
                                      {locationData.cities
                                        .filter(city => city.state_id === location.state)
                                        .map(city => (
                                          <option key={city.id} value={city.id}>
                                            {city.name}
                                          </option>
                                        ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                      Date
                                    </label>
                                    <input
                                      type="date"
                                      value={location.date}
                                      onChange={(e) => setLocations(prev => prev.map((loc, i) =>
                                        i === index ? { ...loc, date: e.target.value } : loc
                                      ))}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      required
                                      min={new Date().toISOString().split('T')[0]}
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                      Time
                                    </label>
                                    <input
                                      type="time"
                                      value={location.time}
                                      onChange={(e) => setLocations(prev => prev.map((loc, i) =>
                                        i === index ? { ...loc, time: e.target.value } : loc
                                      ))}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                      Contact Name
                                    </label>
                                    <input
                                      type="text"
                                      value={location.contactName}
                                      onChange={(e) => setLocations(prev => prev.map((loc, i) =>
                                        i === index ? { ...loc, contactName: e.target.value } : loc
                                      ))}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      required
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                      Contact Phone
                                    </label>
                                    <input
                                      type="tel"
                                      value={location.contactPhone}
                                      onChange={(e) => setLocations(prev => prev.map((loc, i) =>
                                        i === index ? { ...loc, contactPhone: e.target.value } : loc
                                      ))}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                      required
                                    />
                                  </div>

                                  <div className="md:col-span-3">
                                    <label className="block text-sm font-medium text-gray-700">
                                      Special Instructions
                                    </label>
                                    <textarea
                                      value={location.specialInstructions}
                                      onChange={(e) => setLocations(prev => prev.map((loc, i) =>
                                        i === index ? { ...loc, specialInstructions: e.target.value } : loc
                                      ))}
                                      rows={2}
                                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={addLocation}
                className="flex items-center text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-5 h-5 mr-1" />
                Add Stop
              </button>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Manifest'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}