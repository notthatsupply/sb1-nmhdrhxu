// Mock Samsara API client for development
export interface VehicleLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  lastLocation: Date;
  status: 'active' | 'inactive';
}

// Mock data for development
const mockVehicles: VehicleLocation[] = [
  {
    id: '1',
    name: 'Truck 001',
    latitude: 43.6532,
    longitude: -79.3832,
    heading: 90,
    speed: 65,
    lastLocation: new Date(),
    status: 'active'
  },
  {
    id: '2',
    name: 'Truck 002',
    latitude: 45.5017,
    longitude: -73.5673,
    heading: 180,
    speed: 0,
    lastLocation: new Date(),
    status: 'inactive'
  },
  {
    id: '3',
    name: 'Truck 003',
    latitude: 49.2827,
    longitude: -123.1207,
    heading: 270,
    speed: 55,
    lastLocation: new Date(),
    status: 'active'
  }
];

export async function getVehicleLocations(): Promise<VehicleLocation[]> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return mock data
  return mockVehicles.map(vehicle => ({
    ...vehicle,
    lastLocation: new Date(),
    speed: vehicle.status === 'active' ? Math.random() * 65 + 25 : 0
  }));
}