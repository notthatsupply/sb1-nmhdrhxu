import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Truck, AlertCircle, CheckCircle2, Clock, XCircle, Plus, Filter, Search, Route, User, FileText, Download, Map, Calendar } from 'lucide-react';
import { ManifestForm } from './ManifestForm';
import { ManifestDetails } from './ManifestDetails';

interface Manifest {
  id: string;
  number: string;
  carrier_id: string | null;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  order_legs: OrderLeg[];
  driver: {
    name: string;
    id: string;
  } | null;
  vehicle: {
    number: string;
    id: string;
  } | null;
}

interface OrderLeg {
  id: string;
  order_id: string;
  sequence_number: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  estimated_margin: number | null;
  actual_margin: number | null;
  carrier_rate: number | null;
  carrier_currency: 'CAD' | 'USD' | null;
  order: {
    order_number: string;
    customer_name: string;
  };
  pickup_locations: Location[];
  delivery_locations: Location[];
}

interface Location {
  id: string;
  name: string;
  street_address: string;
  date: string;
  time: string;
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

export function ManifestTab() {
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [filteredManifests, setFilteredManifests] = useState<Manifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManifestForm, setShowManifestForm] = useState(false);
  const [selectedManifest, setSelectedManifest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [dateSort, setDateSort] = useState<'asc' | 'desc'>('desc');
  const [availableDrivers, setAvailableDrivers] = useState<{id: string, name: string}[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<{id: string, number: string}[]>([]);
  const [showManifestDetails, setShowManifestDetails] = useState(false);
  const [selectedManifestId, setSelectedManifestId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    fetchManifests();
    fetchFilters();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [manifests, searchTerm, statusFilter, driverFilter, vehicleFilter, dateSort]);

  const fetchFilters = async () => {
    try {
      // Fetch drivers
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('id, name')
        .order('name');
      
      if (driversError) throw driversError;
      setAvailableDrivers(driversData || []);
      
      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, number')
        .order('number');
      
      if (vehiclesError) throw vehiclesError;
      setAvailableVehicles(vehiclesData || []);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...manifests];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(manifest => 
        manifest.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (manifest.driver?.name && manifest.driver.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (manifest.vehicle?.number && manifest.vehicle.number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        manifest.order_legs.some(leg => 
          leg.order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          leg.order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(manifest => manifest.status === statusFilter);
    }
    
    // Apply driver filter
    if (driverFilter !== 'all') {
      filtered = filtered.filter(manifest => manifest.driver?.id === driverFilter);
    }
    
    // Apply vehicle filter
    if (vehicleFilter !== 'all') {
      filtered = filtered.filter(manifest => manifest.vehicle?.id === vehicleFilter);
    }
    
    // Apply date sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateSort === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    setFilteredManifests(filtered);
  };

  const fetchManifests = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('manifests')
        .select(`
          *,
          driver:drivers (
            id,
            name
          ),
          vehicle:vehicles (
            id,
            number
          ),
          order_legs (
            *,
            order:orders (
              order_number,
              customer_name
            ),
            pickup_locations:leg_locations (
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
            ),
            delivery_locations:leg_locations (
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
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process the data to separate pickup and delivery locations
      const processedData = data?.map(manifest => ({
        ...manifest,
        order_legs: manifest.order_legs.map(leg => ({
          ...leg,
          pickup_locations: leg.pickup_locations.filter((loc: any) => loc.type === 'pickup'),
          delivery_locations: leg.delivery_locations.filter((loc: any) => loc.type === 'delivery')
        }))
      })) || [];

      setManifests(processedData);
      setFilteredManifests(processedData);
    } catch (error) {
      console.error('Error fetching manifests:', error);
      setError('Failed to load manifests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLocation = (location: Location) => {
    if (!location) return '';
    return `${location.name}, ${location.city?.name || ''}, ${location.city?.state?.name || ''}`;
  };

  const handleViewManifest = (manifestId: string) => {
    setSelectedManifestId(manifestId);
    setShowManifestDetails(true);
  };

  if (loading && manifests.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && manifests.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-red-600">
        <AlertCircle className="w-6 h-6 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 bg-gray-50 rounded-lg">
              <Truck className="w-8 h-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Manifests</p>
              <p className="text-3xl font-bold text-gray-900">{manifests.length}</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-3xl font-bold text-gray-900">
                {manifests.filter(m => m.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-3xl font-bold text-gray-900">
                {manifests.filter(m => m.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 bg-red-50 rounded-lg">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Cancelled</p>
              <p className="text-3xl font-bold text-gray-900">
                {manifests.filter(m => m.status === 'cancelled').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="stat-card flex items-center justify-center">
          <button
            onClick={() => setShowManifestForm(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-1" />
            New Manifest
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search manifests, drivers, vehicles..."
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-gray-400" />
            <select
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Drivers</option>
              {availableDrivers.map(driver => (
                <option key={driver.id} value={driver.id}>{driver.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Truck className="h-5 w-5 text-gray-400" />
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Vehicles</option>
              {availableVehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>{vehicle.number}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              value={dateSort}
              onChange={(e) => setDateSort(e.target.value as 'asc' | 'desc')}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
          
          <div className="ml-auto flex space-x-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-gray-200' : 'bg-white'}`}
              title="List View"
            >
              <FileText className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-gray-200' : 'bg-white'}`}
              title="Grid View"
            >
              <Route className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Manifests List/Grid */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Manifests</h2>
        </div>

        {viewMode === 'list' ? (
          <div className="divide-y divide-gray-100">
            {filteredManifests.length > 0 ? (
              filteredManifests.map(manifest => (
                <div key={manifest.id} className="p-6 hover:bg-gray-50 transition-colors duration-150 cursor-pointer" onClick={() => handleViewManifest(manifest.id)}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {manifest.number}
                      </h3>
                      <span className="inline-flex items-center">
                        {getStatusIcon(manifest.status)}
                        <span className="ml-2 text-sm capitalize">{manifest.status}</span>
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Created: {new Date(manifest.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {manifest.order_legs.map(leg => (
                      <div key={leg.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-4">
                            <span className="text-sm font-medium text-gray-700">
                              Order #{leg.order.order_number}
                            </span>
                            <span className="text-sm text-gray-500">
                              {leg.order.customer_name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {leg.carrier_rate && (
                              <span className="text-sm text-gray-700">
                                Rate: {leg.carrier_currency} {leg.carrier_rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            )}
                            {leg.estimated_margin && (
                              <span className="text-sm text-green-600">
                                Est. Margin: {leg.estimated_margin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                          <div>
                            <div className="flex items-center">
                              <User className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-600">Driver:</span>
                            </div>
                            <span className="text-sm text-gray-900 ml-6">
                              {manifest.driver?.name || 'Not assigned'}
                            </span>
                          </div>
                          
                          <div>
                            <div className="flex items-center">
                              <Truck className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-600">Vehicle:</span>
                            </div>
                            <span className="text-sm text-gray-900 ml-6">
                              {manifest.vehicle?.number || 'Not assigned'}
                            </span>
                          </div>
                          
                          <div>
                            <div className="flex items-center">
                              <Map className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-600">Route:</span>
                            </div>
                            <span className="text-sm text-gray-900 ml-6">
                              {leg.pickup_locations?.[0] && formatLocation(leg.pickup_locations[0])} →{' '}
                              {leg.delivery_locations?.[0] && formatLocation(leg.delivery_locations[0])}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                {searchTerm || statusFilter !== 'all' || driverFilter !== 'all' || vehicleFilter !== 'all' ? (
                  <>
                    <Route className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No manifests found</h3>
                    <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or search term.</p>
                  </>
                ) : (
                  <>
                    <Truck className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No manifests</h3>
                    <p className="mt-1 text-sm text-gray-500">Create your first manifest to get started.</p>
                    <button
                      onClick={() => setShowManifestForm(true)}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      New Manifest
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredManifests.length > 0 ? (
              filteredManifests.map(manifest => (
                <div 
                  key={manifest.id} 
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer"
                  onClick={() => handleViewManifest(manifest.id)}
                >
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Truck className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-900">{manifest.number}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(manifest.status)}`}>
                      {manifest.status}
                    </span>
                  </div>
                  
                  <div className="p-4">
                    <div className="mb-3">
                      <span className="text-xs text-gray-500">Created: {new Date(manifest.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {manifest.order_legs.map(leg => (
                      <div key={leg.id} className="mb-3">
                        <div className="text-xs font-medium text-gray-700">Order #{leg.order.order_number}</div>
                        <div className="text-xs text-gray-500">{leg.order.customer_name}</div>
                      </div>
                    ))}
                    
                    <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Driver:</span>
                        <div className="font-medium text-gray-900">{manifest.driver?.name || 'Not assigned'}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Vehicle:</span>
                        <div className="font-medium text-gray-900">{manifest.vehicle?.number || 'Not assigned'}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-4 py-2 bg-blue-50 flex justify-between items-center">
                    <span className="text-xs text-blue-600 font-medium">View Details</span>
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-500">
                {searchTerm || statusFilter !== 'all' || driverFilter !== 'all' || vehicleFilter !== 'all' ? (
                  <>
                    <Route className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No manifests found</h3>
                    <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or search term.</p>
                  </>
                ) : (
                  <>
                    <Truck className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No manifests</h3>
                    <p className="mt-1 text-sm text-gray-500">Create your first manifest to get started.</p>
                    <button
                      onClick={() => setShowManifestForm(true)}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="-ml-1 mr-2 h-5 w-5" />
                      New Manifest
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Manifest Form Modal */}
      {showManifestForm && (
        <ManifestForm
          onClose={() => {
            setShowManifestForm(false);
            setSelectedManifest(null);
          }}
          onSubmit={() => {
            fetchManifests();
          }}
          manifestId={selectedManifest || undefined}
        />
      )}
      
      {/* Manifest Details Modal */}
      {showManifestDetails && selectedManifestId && (
        <ManifestDetails
          manifestId={selectedManifestId}
          onClose={() => {
            setShowManifestDetails(false);
            setSelectedManifestId(null);
          }}
        />
      )}
    </div>
  );
}