import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface OrderErrorDialogProps {
  error: string;
  onClose: () => void;
}

export function OrderErrorDialog({ error, onClose }: OrderErrorDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-3 w-0 flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              Unable to Open Order
            </h3>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-md bg-yellow-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Troubleshooting Steps
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Check if popup blocker is enabled</li>
                    <li>Allow popups for this site</li>
                    <li>Try using a different browser</li>
                    <li>Clear browser cache and cookies</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}