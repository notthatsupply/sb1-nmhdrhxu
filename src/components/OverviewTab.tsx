import React, { useEffect, useState } from 'react';
import { getVehicleLocations, VehicleLocation } from '../lib/samsara';
import { OverviewMap } from './OverviewMap';
import { Truck, AlertCircle, CheckCircle2 } from 'lucide-react';

export function OverviewTab() {
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const locations = await getVehicleLocations();
        setVehicles(locations);
        setError(null);
      } catch (err) {
        setError('Failed to fetch vehicle locations');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
    const interval = setInterval(fetchVehicles, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-red-600">
        <AlertCircle className="w-6 h-6 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  const activeVehicles = vehicles.filter(v => v.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Truck className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Vehicles</p>
              <p className="text-3xl font-bold text-gray-900">{vehicles.length}</p>
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Active Vehicles</p>
              <p className="text-3xl font-bold text-gray-900">{activeVehicles}</p>
            </div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="flex items-center">
            <div className="p-3 bg-gray-50 rounded-lg">
              <AlertCircle className="w-8 h-8 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Inactive Vehicles</p>
              <p className="text-3xl font-bold text-gray-900">{vehicles.length - activeVehicles}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <OverviewMap vehicles={vehicles} />

      {/* Vehicle List */}
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Vehicle Status</h3>
        </div>
        <div className="divide-y">
          {vehicles.map(vehicle => (
            <div key={vehicle.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200">
              <div className="flex items-center">
                <Truck className={`w-5 h-5 ${vehicle.status === 'active' ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="ml-3 font-medium">{vehicle.name}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {Math.round(vehicle.speed)} mph
                </span>
                <span className={`vehicle-status-badge ${vehicle.status}`}>
                  {vehicle.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}