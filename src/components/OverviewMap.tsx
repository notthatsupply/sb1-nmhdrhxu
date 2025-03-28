import React, { useEffect, useRef, useState } from 'react';
import { VehicleLocation } from '../lib/samsara';
import { Truck } from 'lucide-react';

interface OverviewMapProps {
  vehicles: VehicleLocation[];
}

export function OverviewMap({ vehicles }: OverviewMapProps) {
  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg bg-white p-6">
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-center">
          <Truck className="w-12 h-12 mx-auto mb-4" />
          <p>Map integration requires Google Maps API key.</p>
          <p className="text-sm mt-2">Please add VITE_GOOGLE_MAPS_API_KEY to your environment variables.</p>
        </div>
      </div>
    </div>
  );
}