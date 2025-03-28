import React, { useState } from 'react';
import { Clock, DollarSign, AlertTriangle, ScrollIcon as TollIcon, Fuel, BarChart4, Truck, Pin } from 'lucide-react';

interface ManifestPaymentDetailsProps {
  manifest: any;
  locations: any[];
  estimatedTrip: {
    duration: string;
    distance: string;
    fuelCost: string;
  };
}

export function ManifestPaymentDetails({ manifest, locations, estimatedTrip }: ManifestPaymentDetailsProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [additionalCharges, setAdditionalCharges] = useState([
    { id: 1, type: 'Detention Time', hours: 2.5, rate: 25, total: 62.5, notes: 'Waiting at loading dock' },
    { id: 2, type: 'Extra Stop', amount: 1, rate: 50, total: 50, notes: 'Unscheduled delivery location' },
    { id: 3, type: 'Tolls', amount: 1, rate: 35.75, total: 35.75, notes: 'Highway tolls' },
    { id: 4, type: 'Fuel Surcharge', percentage: 5, baseAmount: 450, total: 22.5, notes: '5% surcharge due to fuel price increase' },
    { id: 5, type: 'Special Handling', amount: 1, rate: 75, total: 75, notes: 'Oversized item handling' }
  ]);

  // Extract distance as a number for calculations
  const distanceStr = estimatedTrip.distance.split(' ')[0];
  const distance = parseInt(distanceStr, 10) || 0;
  
  // Extract hours as a number for calculations
  const durationStr = estimatedTrip.duration.split(' ');
  const hours = parseInt(durationStr[0], 10) || 0;
  const minutes = parseInt(durationStr[2], 10) || 0;
  const totalHours = hours + (minutes / 60);
  
  // Calculate base pay
  const baseRate = manifest.driver_rate || 0;
  let basePay = 0;
  
  if (manifest.driver_payment_type === 'hourly') {
    basePay = baseRate * totalHours;
  } else {
    basePay = baseRate * distance;
  }
  
  // Calculate totals
  const additionalTotal = additionalCharges.reduce((sum, charge) => sum + charge.total, 0);
  const grandTotal = basePay + additionalTotal;
  
  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Payment Summary</h3>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full mr-4">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Total Payment</div>
                <div className="text-2xl font-bold text-gray-900">${grandTotal.toFixed(2)}</div>
              </div>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-4 py-2 bg-white text-blue-600 rounded-md border border-blue-200 hover:bg-blue-50 text-sm font-medium"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Clock className="h-5 w-5 text-gray-500 mr-2" />
                <h4 className="text-sm font-medium text-gray-700">Payment Type</h4>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {manifest.driver_payment_type === 'hourly' ? 'Hourly Rate' : 'Mileage-based Rate'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ${manifest.driver_rate} {manifest.driver_payment_type === 'hourly' ? 'per hour' : 'per mile'}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Truck className="h-5 w-5 text-gray-500 mr-2" />
                <h4 className="text-sm font-medium text-gray-700">Trip Details</h4>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {estimatedTrip.distance}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Estimated Duration: {estimatedTrip.duration}
              </p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <BarChart4 className="h-5 w-5 text-gray-500 mr-2" />
                <h4 className="text-sm font-medium text-gray-700">Base Pay</h4>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                ${basePay.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {manifest.driver_payment_type === 'hourly' 
                  ? `${totalHours.toFixed(1)} hours × $${manifest.driver_rate}/hr`
                  : `${distance} miles × $${manifest.driver_rate}/mile`}
              </p>
            </div>
          </div>
          
          {showDetails && (
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Payment Breakdown</h4>
              
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg mb-6">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-medium text-gray-900">Item</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-medium text-gray-900">Details</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-medium text-gray-900">Rate</th>
                      <th scope="col" className="px-3 py-3.5 text-right text-sm font-medium text-gray-900">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {/* Base Pay */}
                    <tr>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                        Base Pay
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {manifest.driver_payment_type === 'hourly' 
                          ? `${totalHours.toFixed(1)} hours`
                          : `${distance} miles`}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        ${manifest.driver_rate} {manifest.driver_payment_type === 'hourly' ? '/hr' : '/mile'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium text-gray-900">
                        ${basePay.toFixed(2)}
                      </td>
                    </tr>
                    
                    {/* Additional Charges */}
                    {additionalCharges.map((charge) => (
                      <tr key={charge.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900">
                          {charge.type}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {charge.hours ? `${charge.hours} hours` : 
                           charge.amount ? `${charge.amount} ${charge.amount === 1 ? 'item' : 'items'}` :
                           charge.percentage ? `${charge.percentage}% of $${charge.baseAmount}` : '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {charge.rate ? `$${charge.rate}${charge.hours ? '/hr' : ''}` : '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium text-gray-900">
                          ${charge.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Total */}
                    <tr className="bg-gray-50">
                      <td colSpan={3} className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                        Total Payment
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-medium text-gray-900">
                        ${grandTotal.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5 mr-3" />
                <div>
                  <h5 className="text-sm font-medium text-amber-800">Payment Notes</h5>
                  <ul className="mt-2 text-sm text-amber-700 space-y-1 list-disc pl-5">
                    <li>Payments are processed within 7-10 business days after delivery confirmation</li>
                    <li>All additional charges require supervisor approval before processing</li>
                    <li>Detention time is calculated after the first hour of waiting</li>
                    <li>Fuel surcharges are calculated based on the DOE National Average</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Payment Approvals and History */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Payment Approvals & History</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Approval Status</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <Pin className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Trip Miles Approved</div>
                    <div className="text-xs text-gray-500">System • {new Date().toLocaleDateString()}</div>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Approved
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <Clock className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Detention Time Approved</div>
                    <div className="text-xs text-gray-500">John Smith • {new Date().toLocaleDateString()}</div>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Approved
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                    <TollIcon className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Toll Charges</div>
                    <div className="text-xs text-gray-500">Pending receipt verification</div>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Pending
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <Fuel className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Fuel Surcharge</div>
                    <div className="text-xs text-gray-500">System • {new Date().toLocaleDateString()}</div>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Approved
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Payment Timeline</h4>
            <div className="relative">
              <div className="absolute top-0 left-4 h-full w-0.5 bg-gray-200"></div>
              
              <div className="relative mb-8">
                <div className="flex items-center">
                  <div className="absolute left-0 mt-1 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center z-10">
                    <Truck className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="ml-12">
                    <div className="text-sm font-medium text-gray-900">Manifest Created</div>
                    <div className="text-xs text-gray-500">
                      {new Date(manifest.created_at).toLocaleDateString()} {new Date(manifest.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative mb-8">
                <div className="flex items-center">
                  <div className="absolute left-0 mt-1 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center z-10">
                    <Pin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="ml-12">
                    <div className="text-sm font-medium text-gray-900">Trip Started</div>
                    <div className="text-xs text-gray-500">
                      {new Date(manifest.created_at).toLocaleDateString()} {new Date(new Date(manifest.created_at).getTime() + 3600000).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative mb-8">
                <div className="flex items-center">
                  <div className="absolute left-0 mt-1 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center z-10">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="ml-12">
                    <div className="text-sm font-medium text-gray-900">Payment Approved</div>
                    <div className="text-xs text-gray-500">
                      {new Date(manifest.created_at).toLocaleDateString()} {new Date(new Date(manifest.created_at).getTime() + 86400000).toLocaleTimeString()}
                    </div>
                    <div className="text-xs text-gray-700 mt-1">Approved by: Dispatch Manager</div>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <div className="flex items-center">
                  <div className="absolute left-0 mt-1 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center z-10">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="ml-12">
                    <div className="text-sm font-medium text-gray-900">Payment Issued</div>
                    <div className="text-xs text-gray-500">
                      {new Date(manifest.created_at).toLocaleDateString()} {new Date(new Date(manifest.created_at).getTime() + 172800000).toLocaleTimeString()}
                    </div>
                    <div className="text-xs text-gray-700 mt-1">Payment Reference: PAY-{Math.floor(Math.random() * 1000000)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}