import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // API endpoint - update this to match your backend URL
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  /**
   * Fetch data from backend API
   */
  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/data`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
        setConnectionStatus('connected');
        setLastUpdate(new Date());
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      setConnectionStatus('disconnected');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initial data fetch and set up auto-refresh interval
   */
  useEffect(() => {
    // Fetch data immediately on mount
    fetchData();

    // Set up auto-refresh every 5 seconds
    const intervalId = setInterval(fetchData, 5000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  /**
   * Format date/time for display
   */
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (err) {
      return dateString;
    }
  };

  /**
   * Get status badge color based on status value
   */
  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';

    if (statusLower.includes('active') || statusLower.includes('success') || statusLower.includes('ok')) {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (statusLower.includes('warning') || statusLower.includes('pending')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else if (statusLower.includes('error') || statusLower.includes('failed') || statusLower.includes('inactive')) {
      return 'bg-red-100 text-red-800 border-red-200';
    } else {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                📊 MSSQL Real-Time Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Live data synchronization from production database
              </p>
            </div>

            {/* Connection Status */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className={`h-3 w-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                  connectionStatus === 'disconnected' ? 'bg-red-500' :
                  'bg-yellow-500 animate-pulse'
                }`}></div>
                <span className="text-sm font-medium text-gray-700">
                  {connectionStatus === 'connected' ? 'Connected' :
                   connectionStatus === 'disconnected' ? 'Disconnected' :
                   'Checking...'}
                </span>
              </div>

              {lastUpdate && (
                <div className="text-xs text-gray-500">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Auto-Refresh Enabled
              </h3>
              <div className="mt-1 text-sm text-blue-700">
                Dashboard automatically refreshes every 5 seconds. Backend syncs production data every 10 seconds.
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-1 text-sm text-red-700">{error}</div>
                <div className="mt-2 text-xs text-red-600">
                  Make sure the backend is running on {API_URL}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading dashboard data...</span>
          </div>
        )}

        {/* Data Table */}
        {!loading && !error && (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
            {/* Table Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Dashboard Data
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({data.length} records)
                </span>
              </h2>
            </div>

            {/* Table Content */}
            {data.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Waiting for data to be synced from production database...
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Time
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row, index) => (
                      <tr
                        key={row.ID || index}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {row.ID}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(row.Status)}`}>
                            {row.Status || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {formatDateTime(row.DateTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(row.LastUpdated)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Powered by React + Node.js + MSSQL | Backend API: {API_URL}
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
