import React, { useState, useRef, useEffect } from 'react';
import { Truck, ClipboardList, MapPin, DollarSign, Users, BarChart3, Settings, LayoutDashboard } from 'lucide-react';
import { NewOrderForm } from './components/NewOrderForm';
import { OverviewTab } from './components/OverviewTab';
import { SignInForm } from './components/SignInForm';
import { OrderDetails } from './components/OrderDetails';
import { ManifestTab } from './components/ManifestTab';
import { SplitOrderModal } from './components/SplitOrderModal';
import { OrderErrorDialog } from './components/OrderErrorDialog';
import { openInNewWindow } from './lib/window';
import { supabase } from './lib/supabase';
import { useAuth } from './lib/auth';

function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showNewOrderForm, setShowNewOrderForm] = useState(false);
  const [showSignInForm, setShowSignInForm] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [showSplitOrderModal, setShowSplitOrderModal] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<{ id: string; orderNumber: string } | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const { session } = useAuth();
  const expandTimeoutRef = useRef<number>();
  const collapseTimeoutRef = useRef<number>();

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          locations (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setIsSidebarExpanded(false);
  };

  const handleMouseEnter = () => {
    if (collapseTimeoutRef.current) {
      clearTimeout(collapseTimeoutRef.current);
    }
    expandTimeoutRef.current = window.setTimeout(() => {
      setIsSidebarExpanded(true);
    }, 200);
  };

  const handleMouseLeave = () => {
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
    }
    collapseTimeoutRef.current = window.setTimeout(() => {
      setIsSidebarExpanded(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (expandTimeoutRef.current) clearTimeout(expandTimeoutRef.current);
      if (collapseTimeoutRef.current) clearTimeout(collapseTimeoutRef.current);
    };
  }, []);

  const handleNewOrder = (data: any) => {
    console.log('New order data:', data);
    setShowNewOrderForm(false);
    fetchOrders(); // Refresh orders list
  };

  return (
    <div className="min-h-screen bg-neulight-base flex">
      {/* Sidebar */}
      <div 
        className={`${
          isSidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'
        } bg-white flex flex-col fixed h-screen z-20 transition-all duration-300 ease-in-out`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="p-4 border-b border-neulight-divider w-64">
          <div className="flex items-center space-x-2">
            <div className="nav-icon-container">
              <Truck className="nav-icon text-neulight-primary" aria-hidden="true" />
            </div>
            <span className={`text-2xl font-bold text-gray-900 sidebar-text ${
              isSidebarExpanded ? 'opacity-100' : 'opacity-0'
            }`} aria-hidden={!isSidebarExpanded}>
              TAP
            </span>
          </div>
        </div>
        
        <nav className="flex-1 py-4" aria-label="Sidebar navigation">
          <button
            onClick={() => handleTabClick('overview')}
            className={`sidebar-link ${
              activeTab === 'overview' ? 'active' : ''
            }`}
            title={!isSidebarExpanded ? 'Overview' : undefined}
            aria-label="Overview"
          >
            <div className="nav-icon-container">
              <LayoutDashboard className="nav-icon" aria-hidden="true" />
            </div>
            <span className={`ml-2 sidebar-text ${
              isSidebarExpanded ? 'opacity-100' : 'opacity-0'
            }`} aria-hidden={!isSidebarExpanded}>Overview</span>
            {!isSidebarExpanded && <span className="tooltip">Overview</span>}
          </button>
          
          <button
            onClick={() => handleTabClick('orders')}
            className={`sidebar-link ${
              activeTab === 'orders' ? 'active' : ''
            }`}
            title={!isSidebarExpanded ? 'Orders' : undefined}
          >
            <div className="nav-icon-container">
              <ClipboardList className="nav-icon" aria-hidden="true" />
            </div>
            <span className={`ml-2 sidebar-text ${
              isSidebarExpanded ? 'opacity-100' : 'opacity-0'
            }`}>Orders</span>
            {!isSidebarExpanded && <span className="tooltip">Orders</span>}
          </button>
          
          <button
            onClick={() => handleTabClick('routing')}
            className={`sidebar-link ${
              activeTab === 'routing' ? 'active' : ''
            }`}
            title={!isSidebarExpanded ? 'Routing' : undefined}
          >
            <div className="nav-icon-container">
              <MapPin className="nav-icon" aria-hidden="true" />
            </div>
            <span className={`ml-2 sidebar-text ${
              isSidebarExpanded ? 'opacity-100' : 'opacity-0'
            }`}>Routing</span>
            {!isSidebarExpanded && <span className="tooltip">Routing</span>}
          </button>
          
          <button
            onClick={() => handleTabClick('drivers')}
            className={`sidebar-link ${
              activeTab === 'drivers' ? 'active' : ''
            }`}
            title={!isSidebarExpanded ? 'Drivers' : undefined}
          >
            <div className="nav-icon-container">
              <Users className="nav-icon" aria-hidden="true" />
            </div>
            <span className={`ml-2 sidebar-text ${
              isSidebarExpanded ? 'opacity-100' : 'opacity-0'
            }`}>Drivers</span>
            {!isSidebarExpanded && <span className="tooltip">Drivers</span>}
          </button>
          
          <button
            onClick={() => handleTabClick('finance')}
            className={`sidebar-link ${
              activeTab === 'finance' ? 'active' : ''
            }`}
            title={!isSidebarExpanded ? 'Finance' : undefined}
          >
            <div className="nav-icon-container">
              <DollarSign className="nav-icon" aria-hidden="true" />
            </div>
            <span className={`ml-2 sidebar-text ${
              isSidebarExpanded ? 'opacity-100' : 'opacity-0'
            }`}>Finance</span>
            {!isSidebarExpanded && <span className="tooltip">Finance</span>}
          </button>
          
          <button
            onClick={() => handleTabClick('reports')}
            className={`sidebar-link ${
              activeTab === 'reports' ? 'active' : ''
            }`}
            title={!isSidebarExpanded ? 'Reports' : undefined}
          >
            <div className="nav-icon-container">
              <BarChart3 className="nav-icon" aria-hidden="true" />
            </div>
            <span className={`ml-2 sidebar-text ${
              isSidebarExpanded ? 'opacity-100' : 'opacity-0'
            }`}>Reports</span>
            {!isSidebarExpanded && <span className="tooltip">Reports</span>}
          </button>
          
          <button
            onClick={() => handleTabClick('settings')}
            className={`sidebar-link ${
              activeTab === 'settings' ? 'active' : ''
            }`}
            title={!isSidebarExpanded ? 'Settings' : undefined}
          >
            <div className="nav-icon-container">
              <Settings className="nav-icon" aria-hidden="true" />
            </div>
            <span className={`ml-2 sidebar-text ${
              isSidebarExpanded ? 'opacity-100' : 'opacity-0'
            }`}>Settings</span>
            {!isSidebarExpanded && <span className="tooltip">Settings</span>}
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto relative ml-16">
        <header className="bg-white border-b border-neulight-divider sticky top-0 z-10 shadow-neu">
          <div className="px-8 py-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h1>
          </div>
        </header>

        <main className="p-8">
          {activeTab === 'overview' && <OverviewTab />}
          
          {activeTab === 'orders' && (
            <div className="bg-white rounded-lg shadow-sm p-6 transition-shadow duration-200 hover:shadow-md">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Order Management</h2>
                <button
                  onClick={() => session ? setShowNewOrderForm(true) : setShowSignInForm(true)}
                  className="btn-primary px-6 py-2"
                >
                  New Order
                </button>
              </div>

              {/* Order List Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Order #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Load #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pickup
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivery
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-6 py-3">Created</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map(order => {
                      const pickupLocation = order.locations?.find((loc: any) => loc.type === 'pickup');
                      const deliveryLocation = order.locations?.find((loc: any) => loc.type === 'delivery');
                      
                      return (
                        <tr 
                          key={order.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            if (!session) {
                              setShowSignInForm(true);
                              return;
                            }
                            setCurrentOrderId(order.id);
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {order.order_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.load_tender_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.customer_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {pickupLocation?.name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {deliveryLocation?.name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.currency} {order.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {orders.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No orders found. Click "New Order" to create one.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'routing' && <ManifestTab />}
          
          {showNewOrderForm && (
            <NewOrderForm
              onClose={() => setShowNewOrderForm(false)}
              onSubmit={handleNewOrder}
            />
          )}
          
          {showSignInForm && (
            <SignInForm onClose={() => setShowSignInForm(false)} />
          )}
          
          {currentOrderId && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                <OrderDetails
                  orderId={currentOrderId}
                  onClose={() => setCurrentOrderId(null)}
                  onUpdate={fetchOrders}
                />
              </div>
            </div>
          )}
          
          {orderError && (
            <OrderErrorDialog
              error={orderError}
              onClose={() => setOrderError(null)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;