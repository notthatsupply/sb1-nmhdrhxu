import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Truck, AlertTriangle } from 'lucide-react';

interface CreateManifestModalProps {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  onSubmit: () => void;
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

export function CreateManifestModal({ orderId, orderNumber, onClose, onSubmit }: CreateManifestModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    manifestType: 'pickup',
    orderType: 'ftl',
    driverId: '',
    vehicleId: '',
    trailerId: '',
    driverPaymentType: 'hourly',
    driverRate: '',
    status: 'pending'
  });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      // Fetch drivers
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('id, name, status')
        .eq('status', 'active');

      if (driversError) throw driversError;
      setDrivers(driversData || []);

      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, number, type, status')
        .eq('status', 'active');

      if (vehiclesError) throw vehiclesError;
      setVehicles(vehiclesData || []);

      // Fetch trailers
      const { data: trailersData, error: trailersError } = await supabase
        .from('trailers')
        .select('id, number, type, status')
        .eq('status', 'active');

      if (trailersError) throw trailersError;
      setTrailers(trailersData || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
      setError('Failed to load resources');
    }
  };

  const validateForm = () => {
    // Basic validation
    if (!formData.driverId) {
      setValidationError('Driver is required');
      return false;
    }
    
    if (!formData.vehicleId) {
      setValidationError('Vehicle is required');
      return false;
    }
    
    if (!formData.driverRate || parseFloat(formData.driverRate) <= 0) {
      setValidationError('Valid driver rate is required');
      return false;
    }
    
    // Check for duplicate assignments
    return true;
  };

  const checkForDuplicates = async () => {
    try {
      // Check if driver is already assigned to an active manifest
      const { data: driverAssignments, error: driverError } = await supabase
        .from('manifests')
        .select('id, number')
        .eq('driver_id', formData.driverId)
        .in('status', ['pending', 'in_progress']);
        
      if (driverError) throw driverError;
      
      if (driverAssignments && driverAssignments.length > 0) {
        setValidationError(`Driver is already assigned to manifest #${driverAssignments[0].number}`);
        setShowConfirmation(true);
        return false;
      }
      
      // Check if vehicle is already assigned to an active manifest
      const { data: vehicleAssignments, error: vehicleError } = await supabase
        .from('manifests')
        .select('id, number')
        .eq('vehicle_id', formData.vehicleId)
        .in('status', ['pending', 'in_progress']);
        
      if (vehicleError) throw vehicleError;
      
      if (vehicleAssignments && vehicleAssignments.length > 0) {
        setValidationError(`Vehicle is already assigned to manifest #${vehicleAssignments[0].number}`);
        setShowConfirmation(true);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      setError('Failed to validate assignment');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const duplicatesExist = await checkForDuplicates();
    if (!duplicatesExist && !showConfirmation) {
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Create manifest
      const { data: manifest, error: manifestError } = await supabase
        .from('manifests')
        .insert({
          manifest_type: formData.manifestType,
          order_type: formData.orderType,
          driver_id: formData.driverId,
          vehicle_id: formData.vehicleId,
          trailer_id: formData.trailerId || null,
          driver_payment_type: formData.driverPaymentType,
          driver_rate: parseFloat(formData.driverRate),
          status: formData.status
        })
        .select()
        .single();

      if (manifestError) throw manifestError;

      // Create order leg
      const { error: legError } = await supabase
        .from('order_legs')
        .insert({
          order_id: orderId,
          manifest_id: manifest.id,
          sequence_number: 1,
          status: formData.status
        });

      if (legError) throw legError;
      
      // Log assignment creation to history
      await supabase
        .from('manifest_history')
        .insert({
          manifest_id: manifest.id,
          manifest_number: manifest.number,
          status: formData.status,
          driver_id: formData.driverId,
          driver_name: drivers.find(d => d.id === formData.driverId)?.name,
          vehicle_id: formData.vehicleId,
          vehicle_number: vehicles.find(v => v.id === formData.vehicleId)?.number,
          changed_at: new Date().toISOString(),
          changed_by: 'Current User' // Replace with actual user info
        });

      onSubmit();
    } catch (error) {
      console.error('Error creating manifest:', error);
      setError('Failed to create manifest');
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Create Assignment</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">Order #{orderNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors duration-200"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Assignment Type</label>
                <select
                  value={formData.manifestType}
                  onChange={(e) => setFormData(prev => ({ ...prev, manifestType: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="pickup">Pickup</option>
                  <option value="delivery">Delivery</option>
                  <option value="dropoff">Drop Off</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Order Type</label>
                <select
                  value={formData.orderType}
                  onChange={(e) => setFormData(prev => ({ ...prev, orderType: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="ftl">FTL</option>
                  <option value="ltl">LTL</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="border-t border-gray-200 my-6 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resource Assignment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Driver</label>
                  <select
                    value={formData.driverId}
                    onChange={(e) => setFormData(prev => ({ ...prev, driverId: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Driver</option>
                    {drivers.map(driver => (
                      <option key={driver.id} value={driver.id}>{driver.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Vehicle</label>
                  <select
                    value={formData.vehicleId}
                    onChange={(e) => setFormData(prev => ({ ...prev, vehicleId: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.number} - {vehicle.type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Trailer</label>
                  <select
                    value={formData.trailerId}
                    onChange={(e) => setFormData(prev => ({ ...prev, trailerId: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select Trailer</option>
                    {trailers.map(trailer => (
                      <option key={trailer.id} value={trailer.id}>
                        {trailer.number} - {trailer.type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Driver Payment Type</label>
                  <select
                    value={formData.driverPaymentType}
                    onChange={(e) => setFormData(prev => ({ ...prev, driverPaymentType: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="hourly">Hourly</option>
                    <option value="mileage">Mileage</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Driver Rate ({formData.driverPaymentType === 'hourly' ? '$/hr' : '$/mile'})
              </label>
              <input
                type="number"
                value={formData.driverRate}
                onChange={(e) => setFormData(prev => ({ ...prev, driverRate: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary px-6 py-2.5 text-sm font-medium"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center px-6 py-2.5 text-sm font-medium"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Creating...' : 'Create Assignment'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-amber-500 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Potential Conflict</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {validationError || 'This assignment may conflict with existing assignments.'}
              <br /><br />
              Do you want to proceed anyway?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Create Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}