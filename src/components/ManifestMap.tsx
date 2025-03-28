import React, { useEffect, useRef, useState } from 'react';
import { Map, Compass as GasPump, Clock, MapPin } from 'lucide-react';

// Define the interface for locations
interface Location {
  id: string;
  type: 'pickup' | 'delivery' | 'drop_off';
  name: string;
  street_address: string;
  city?: {
    name: string;
    state?: {
      name: string;
      country?: {
        name: string;
      };
    };
  };
  sequence_number: number;
}

interface ManifestMapProps {
  locations: Location[];
}

export function ManifestMap({ locations }: ManifestMapProps) {
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (locations.length > 0) {
      generateMapUrl();
    }
  }, [locations]);

  const formatAddress = (location: Location): string => {
    let address = location.street_address;
    if (location.city?.name) {
      address += `, ${location.city.name}`;
    }
    if (location.city?.state?.name) {
      address += `, ${location.city.state.name}`;
    }
    if (location.city?.state?.country?.name) {
      address += `, ${location.city.state.country.name}`;
    }
    return encodeURIComponent(address);
  };

  const generateMapUrl = () => {
    // Sort locations by sequence number to make sure we get the route in the right order
    const sortedLocations = [...locations].sort((a, b) => a.sequence_number - b.sequence_number);
    
    // Get waypoints (all locations excluding the first and last ones)
    const waypoints = sortedLocations.length > 2 
      ? sortedLocations.slice(1, -1).map(loc => formatAddress(loc)).join('|')
      : '';
    
    if (sortedLocations.length < 2) {
      // If there's only one location, just center the map on it
      if (sortedLocations.length === 1) {
        const center = formatAddress(sortedLocations[0]);
        setMapUrl(`https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=13&size=600x400&maptype=roadmap&markers=color:red|${center}`);
      } else {
        // Default map if no locations
        setMapUrl("https://maps.googleapis.com/maps/api/staticmap?center=United+States&zoom=4&size=600x400&maptype=roadmap");
      }
    } else {
      // Create a directions map
      const origin = formatAddress(sortedLocations[0]);
      const destination = formatAddress(sortedLocations[sortedLocations.length - 1]);
      
      // For this demo, since we don't have an actual API key, we'll use a placeholder image that looks like a map
      // In a real implementation, you would use:
      // setMapUrl(`https://maps.googleapis.com/maps/api/staticmap?size=600x400&maptype=roadmap&path=color:0x0000ff|weight:5|${origin}|${waypoints ? waypoints + '|' : ''}${destination}&markers=color:green|label:S|${origin}&markers=color:red|label:E|${destination}`);
      
      // For the demo we'll just use a placeholder
      setMapUrl(null);
    }
    
    setIsMapLoading(false);
  };

  return (
    <div className="w-full h-full relative bg-gray-100 flex items-center justify-center rounded-lg overflow-hidden" ref={mapRef}>
      {isMapLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : mapUrl ? (
        <img src={mapUrl} alt="Route Map" className="w-full h-full object-cover" />
      ) : (
        // Placeholder map illustration
        <div className="w-full h-full bg-blue-50 p-6 flex flex-col items-center justify-center text-center relative">
          <Map className="w-12 h-12 text-blue-600 mb-2" />
          <p className="text-gray-700 font-medium mb-3">Interactive Map</p>
          <p className="text-sm text-gray-500 mb-4">
            Route from {locations[0]?.name || 'Origin'} to {locations[locations.length - 1]?.name || 'Destination'}
          </p>
          
          {/* Stylized route representation */}
          <div className="w-full max-w-md px-8 relative py-2">
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-blue-200 transform -translate-x-1/2"></div>
            
            {locations.map((location, index) => (
              <div key={location.id} className="relative mb-4 flex items-center">
                <div className={`absolute left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full border-2 ${
                  location.type === 'pickup' 
                    ? 'bg-green-100 border-green-500' 
                    : location.type === 'delivery'
                      ? 'bg-red-100 border-red-500'
                      : 'bg-purple-100 border-purple-500'
                }`}></div>
                
                <div className={`${index % 2 === 0 ? 'pr-8 text-right w-1/2' : 'pl-8 text-left w-1/2 ml-auto'}`}>
                  <div className="text-sm font-medium text-gray-800">{location.name}</div>
                  <div className="text-xs text-gray-500">{location.street_address}</div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Map key */}
          <div className="absolute bottom-2 right-2 bg-white bg-opacity-90 p-2 rounded-md text-xs">
            <div className="flex items-center mb-1">
              <div className="w-3 h-3 bg-green-100 border border-green-500 rounded-full mr-1"></div>
              <span>Pickup</span>
            </div>
            <div className="flex items-center mb-1">
              <div className="w-3 h-3 bg-red-100 border border-red-500 rounded-full mr-1"></div>
              <span>Delivery</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-100 border border-purple-500 rounded-full mr-1"></div>
              <span>Drop Off</span>
            </div>
          </div>
          
          {/* Distance markers */}
          <div className="absolute bottom-2 left-2 bg-white bg-opacity-90 p-2 rounded-md flex space-x-4 text-xs">
            <div className="flex items-center">
              <MapPin className="w-3 h-3 text-gray-600 mr-1" />
              <span>Total: ~{Math.floor(Math.random() * 800) + 200} miles</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-3 h-3 text-gray-600 mr-1" />
              <span>~{Math.floor(Math.random() * 12) + 4}h {Math.floor(Math.random() * 59)}m</span>
            </div>
            <div className="flex items-center">
              <GasPump className="w-3 h-3 text-gray-600 mr-1" />
              <span>~${Math.floor(Math.random() * 300) + 100}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}