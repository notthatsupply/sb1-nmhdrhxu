import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Truck, Users, Box, Calendar, Clock, Search, Filter, X, PlusCircle, CheckCircle, AlertTriangle, History, FileText, Eye } from 'lucide-react';
import { CreateManifestModal } from './CreateManifestModal';
import { ManifestDetails } from './ManifestDetails';

interface AssignmentTabProps {
  orderId: string;
  orderNumber: string;
  onUpdate: () => void;
}

interface Driver {
  id: string;
  name: string;
  status: string;
}

interface Vehicle {
  id: string;
  number: string;
  type: string;
  status: string;
}

interface Trailer {
  id: string;
  number: string;
  type: string;
  status: string;
}

interface Manifest {
  id: string;
  number: string;
  status: string;
  driver_id: string | null;
  vehicle_id: string | null;
  trailer_id: string | null;
  driver_payment_type: string | null;
  driver_rate: number | null;
  created_at: string;
  updated_at: string | null;
}

interface AssignmentHistory {
  id: string;
  manifest_id: string;
  manifest_number: string;
  status: string;
  driver_id: string | null;
  driver_name: string | null;
  vehicle_id: string | null;
  vehicle_number: string | null;
  changed_at: string;
  changed_by: string;
}

export function AssignmentTab({ orderId, orderNumber, onUpdate }: AssignmentTabProps) {
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateManifest, setShowCreateManifest] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedManifestId, setSelectedManifestId] = useState<string | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<AssignmentHistory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingManifestId, setEditingManifestId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<{
    driver_id: string;
    vehicle_id: string;
    trailer_id: string;
    driver_payment_type: string;
    driver_rate: string;
    status: string;
  }>({
    driver_id: '',
    vehicle_id: '',
    trailer_id: '',
    driver_payment_type: 'hourly',
    driver_rate: '',
    status: 'pending'
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<(() => Promise<void>) | null>(null);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [showManifestDetails, setShowManifestDetails] = useState(false);
  const [selectedManifestForView, setSelectedManifestForView] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [orderId]);

  // Apply filters to manifests
  const filteredManifests = manifests.filter(manifest => {
    const matchesSearch = 
      manifest.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      drivers.find(d => d.id === manifest.driver_id)?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicles.find(v => v.id === manifest.vehicle_id)?.number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || manifest.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch manifests for this order
      const { data: manifestData, error: manifestError } = await supabase
        .from('order_legs')
        .select(`
          manifest:manifests (
            id,
            number,
            status,
            driver_id,
            vehicle_id,
            trailer_id,
            driver_payment_type,
            driver_rate,
            created_at,
            updated_at
          )
        `)
        .eq('order_id', orderId)
        .not('manifest', 'is', null);

      if (manifestError) throw manifestError;

      const manifests = manifestData
        ?.map(leg => leg.manifest)
        .filter(Boolean) as Manifest[];
      
      setManifests(manifests || []);

      // Fetch available resources
      const [
        { data: driversData, error: driversError },
        { data: vehiclesData, error: vehiclesError },
        { data: trailersData, error: trailersError }
      ] = await Promise.all([
        supabase.from('drivers').select('*'),
        supabase.from('vehicles').select('*'),
        supabase.from('trailers').select('*')
      ]);

      if (driversError) throw driversError;
      if (vehiclesError) throw vehiclesError;
      if (trailersError) throw trailersError;

      setDrivers(driversData || []);
      setVehicles(vehiclesData || []);
      setTrailers(trailersData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentHistory = async (manifestId: string) => {
    try {
      setHistoryLoading(true);
      
      // This would be replaced with an actual fetch from your history/audit log table
      const { data: historyData, error: historyError } = await supabase
        .from('manifest_history')
        .select(`
          id,
          manifest_id,
          manifest_number,
          status,
          driver_id,
          driver_name,
          vehicle_id,
          vehicle_number,
          changed_at,
          changed_by
        `)
        .eq('manifest_id', manifestId)
        .order('changed_at', { ascending: false });

      if (historyError) throw historyError;
      
      // If there's no history data yet, create a mock entry based on current manifest
      if (!historyData || historyData.length === 0) {
        const manifest = manifests.find(m => m.id === manifestId);
        if (manifest) {
          const mockHistory: AssignmentHistory[] = [{
            id: 'initial',
            manifest_id: manifest.id,
            manifest_number: manifest.number,
            status: manifest.status,
            driver_id: manifest.driver_id,
            driver_name: drivers.find(d => d.id === manifest.driver_id)?.name || null,
            vehicle_id: manifest.vehicle_id,
            vehicle_number: vehicles.find(v => v.id === manifest.vehicle_id)?.number || null,
            changed_at: manifest.created_at,
            changed_by: 'System'
          }];
          setAssignmentHistory(mockHistory);
        }
      } else {
        setAssignmentHistory(historyData);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setError('Failed to load assignment history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleViewManifest = (manifestId: string) => {
    setSelectedManifestForView(manifestId);
    setShowManifestDetails(true);
  };

  const handleEditClick = (manifest: Manifest) => {
    setEditingManifestId(manifest.id);
    setEditFormData({
      driver_id: manifest.driver_id || '',
      vehicle_id: manifest.vehicle_id || '',
      trailer_id: manifest.trailer_id || '',
      driver_payment_type: manifest.driver_payment_type || 'hourly',
      driver_rate: manifest.driver_rate?.toString() || '',
      status: manifest.status
    });
  };

  const handleEditCancel = () => {
    setEditingManifestId(null);
  };

  const validateManifestEdit = () => {
    // Check for required fields
    if (!editFormData.driver_id) {
      setError('Driver is required');
      return false;
    }
    
    if (!editFormData.vehicle_id) {
      setError('Vehicle is required');
      return false;
    }
    
    if (!editFormData.driver_rate || parseFloat(editFormData.driver_rate) <= 0) {
      setError('Valid driver rate is required');
      return false;
    }
    
    // Check for duplicate assignments
    const isDriverAssigned = manifests.some(m => 
      m.id !== editingManifestId && 
      m.driver_id === editFormData.driver_id && 
      (m.status === 'pending' || m.status === 'in_progress')
    );
    
    if (isDriverAssigned) {
      setConfirmationMessage('This driver is already assigned to another active manifest. Do you want to continue?');
      setConfirmationAction(() => confirmManifestUpdate);
      setShowConfirmation(true);
      return false;
    }
    
    const isVehicleAssigned = manifests.some(m => 
      m.id !== editingManifestId && 
      m.vehicle_id === editFormData.vehicle_id && 
      (m.status === 'pending' || m.status === 'in_progress')
    );
    
    if (isVehicleAssigned) {
      setConfirmationMessage('This vehicle is already assigned to another active manifest. Do you want to continue?');
      setConfirmationAction(() => confirmManifestUpdate);
      setShowConfirmation(true);
      return false;
    }
    
    return true;
  };

  const handleEditSave = () => {
    if (validateManifestEdit()) {
      confirmManifestUpdate();
    }
  };

  const confirmManifestUpdate = async () => {
    if (!editingManifestId) return;
    setShowConfirmation(false);
    
    try {
      setLoading(true);
      setError(null);
      
      // Get previous manifest data for history
      const manifest = manifests.find(m => m.id === editingManifestId);
      
      // Update manifest
      const { error: updateError } = await supabase
        .from('manifests')
        .update({
          driver_id: editFormData.driver_id,
          vehicle_id: editFormData.vehicle_id,
          trailer_id: editFormData.trailer_id,
          driver_payment_type: editFormData.driver_payment_type,
          driver_rate: parseFloat(editFormData.driver_rate),
          status: editFormData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingManifestId);
        
      if (updateError) throw updateError;
      
      // Log change to history
      if (manifest) {
        await supabase
          .from('manifest_history')
          .insert({
            manifest_id: manifest.id,
            manifest_number: manifest.number,
            previous_status: manifest.status,
            new_status: editFormData.status,
            driver_id: editFormData.driver_id,
            driver_name: drivers.find(d => d.id === editFormData.driver_id)?.name,
            vehicle_id: editFormData.vehicle_id,
            vehicle_number: vehicles.find(v => v.id === editFormData.vehicle_id)?.number,
            changed_at: new Date().toISOString(),
            changed_by: 'Current User' // Replace with actual user info
          });
      }
      
      setEditingManifestId(null);
      fetchData();
      onUpdate();
    } catch (error) {
      console.error('Error updating manifest:', error);
      setError(error instanceof Error ? error.message : 'Failed to update manifest');
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = (manifestId: string) => {
    setSelectedManifestId(manifestId);
    fetchAssignmentHistory(manifestId);
    setShowHistory(true);
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

  if (loading && manifests.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && manifests.length === 0) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-grow max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search manifests by number, driver, vehicle..."
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
          
          <button
            onClick={() => setShowCreateManifest(true)}
            className="ml-auto flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            New Assignment
          </button>
        </div>
      </div>

      {/* Manifests */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Assignments</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredManifests.length > 0 ? (
            filteredManifests.map(manifest => (
              <div key={manifest.id} className="p-6">
                {editingManifestId === manifest.id ? (
                  // Edit form
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {error && (
                      <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-md text-sm">
                        {error}
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-medium text-gray-900">
                        Edit Manifest #{manifest.number}
                      </h4>
                      <button
                        onClick={handleEditCancel}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Driver
                        </label>
                        <select
                          value={editFormData.driver_id}
                          onChange={(e) => setEditFormData({...editFormData, driver_id: e.target.value})}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          required
                        >
                          <option value="">Select Driver</option>
                          {drivers.map(driver => (
                            <option key={driver.id} value={driver.id}>{driver.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Vehicle
                        </label>
                        <select
                          value={editFormData.vehicle_id}
                          onChange={(e) => setEditFormData({...editFormData, vehicle_id: e.target.value})}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          required
                        >
                          <option value="">Select Vehicle</option>
                          {vehicles.map(vehicle => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.number} ({vehicle.type})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Trailer
                        </label>
                        <select
                          value={editFormData.trailer_id}
                          onChange={(e) => setEditFormData({...editFormData, trailer_id: e.target.value})}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        >
                          <option value="">Select Trailer</option>
                          {trailers.map(trailer => (
                            <option key={trailer.id} value={trailer.id}>
                              {trailer.number} ({trailer.type})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Type
                        </label>
                        <select
                          value={editFormData.driver_payment_type}
                          onChange={(e) => setEditFormData({...editFormData, driver_payment_type: e.target.value})}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          required
                        >
                          <option value="hourly">Hourly</option>
                          <option value="mileage">Mileage</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rate ({editFormData.driver_payment_type === 'hourly' ? '$/hr' : '$/mile'})
                        </label>
                        <input
                          type="number"
                          value={editFormData.driver_rate}
                          onChange={(e) => setEditFormData({...editFormData, driver_rate: e.target.value})}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          required
                          min="0"
                          step="0.01"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <select
                          value={editFormData.status}
                          onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          required
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end space-x-3">
                      <button
                        onClick={handleEditCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleEditSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Truck className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            Manifest #{manifest.number}
                          </h4>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>Created {new Date(manifest.created_at).toLocaleDateString()}</span>
                            {manifest.updated_at && (
                              <>
                                <span className="mx-2">•</span>
                                <Clock className="w-3 h-3 mr-1" />
                                <span>Updated {new Date(manifest.updated_at).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(manifest.status)}`}>
                        {manifest.status.charAt(0).toUpperCase() + manifest.status.slice(1)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Driver</h5>
                        {manifest.driver_id ? (
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {drivers.find(d => d.id === manifest.driver_id)?.name || 'Unknown Driver'}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No driver assigned</p>
                        )}
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Vehicle</h5>
                        {manifest.vehicle_id ? (
                          <div className="flex items-center space-x-2">
                            <Truck className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {vehicles.find(v => v.id === manifest.vehicle_id)?.number || 'Unknown Vehicle'}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No vehicle assigned</p>
                        )}
                      </div>

                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Trailer</h5>
                        {manifest.trailer_id ? (
                          <div className="flex items-center space-x-2">
                            <Box className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {trailers.find(t => t.id === manifest.trailer_id)?.number || 'Unknown Trailer'}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No trailer assigned</p>
                        )}
                      </div>

                      {manifest.driver_payment_type && (
                        <div className="md:col-span-3">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Payment Details</h5>
                          <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-900">
                              {manifest.driver_payment_type === 'hourly' ? 'Hourly Rate' : 'Mileage Rate'}:
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              ${manifest.driver_rate?.toFixed(2)} {manifest.driver_payment_type === 'hourly' ? '/hr' : '/mile'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex justify-end space-x-3">
                      <button
                        onClick={() => handleViewManifest(manifest.id)}
                        className="flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View Details
                      </button>
                      <button
                        onClick={() => handleViewHistory(manifest.id)}
                        className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        <History className="w-3 h-3 mr-1" />
                        View History
                      </button>
                      <button
                        onClick={() => handleEditClick(manifest)}
                        className="flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                      >
                        Edit Assignment
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                <Truck className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating a new assignment'}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateManifest(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
                >
                  <PlusCircle className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                  New Assignment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && confirmationAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-500 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Confirmation</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">{confirmationMessage}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmationAction()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Assignment History
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : assignmentHistory.length > 0 ? (
              <div className="space-y-4">
                {assignmentHistory.map((entry, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-900 font-medium">
                          {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </p>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(entry.changed_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        Changed by: {entry.changed_by}
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-xs font-medium text-gray-700">Driver</h5>
                        <p className="text-sm text-gray-900">{entry.driver_name || 'None'}</p>
                      </div>
                      <div>
                        <h5 className="text-xs font-medium text-gray-700">Vehicle</h5>
                        <p className="text-sm text-gray-900">{entry.vehicle_number || 'None'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                No history available for this assignment
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Manifest Details Modal */}
      {showManifestDetails && selectedManifestForView && (
        <ManifestDetails
          manifestId={selectedManifestForView}
          onClose={() => {
            setShowManifestDetails(false);
            setSelectedManifestForView(null);
          }}
        />
      )}

      {/* Create Manifest Modal */}
      {showCreateManifest && (
        <CreateManifestModal
          orderId={orderId}
          orderNumber={orderNumber}
          onClose={() => setShowCreateManifest(false)}
          onSubmit={() => {
            setShowCreateManifest(false);
            fetchData();
            onUpdate();
          }}
        />
      )}
    </div>
  );
}