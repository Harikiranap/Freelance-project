import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Don't show breadcrumbs on the home page
  if (pathnames.length === 0) {
    return null;
  }

  // Optional: Custom labels for specific routes
  const routeLabels = {
    'dashboard': 'Dashboard',
    'about': 'About Us',
    'chat': 'Messages',
    'admin': 'Admin Panel',
    'complete-profile': 'Complete Profile',
    'edit-profile': 'Edit Profile',
    'verify-otp': 'Verify OTP',
    'payment': 'Secure Payment',
    'job': 'Job Details',
  };

  return (
    <div className="w-full bg-slate-50 border-b border-slate-200 py-3">
      <div className="max-w-7xl mx-auto px-4 flex items-center text-sm">
        <Link 
          to="/" 
          className="flex items-center text-slate-500 hover:text-blue-600 transition-colors font-medium"
        >
          <Home size={16} className="mr-1.5" />
          Home
        </Link>
        
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const isLast = index === pathnames.length - 1;
          
          // Try to get a friendly label, otherwise capitalize the path segment
          // Also check if it's a dynamic ID (e.g., job ID which is long and alphanumeric)
          let label = routeLabels[value] || value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
          
          // If the value is a long ID, shorten it
          if (value.length > 20) {
            label = `ID: ${value.substring(0, 8)}...`;
          }

          return (
            <React.Fragment key={to}>
              <ChevronRight size={16} className="mx-2 text-slate-400 flex-shrink-0" />
              {isLast ? (
                <span className="text-slate-900 font-bold truncate max-w-[200px]" title={value}>
                  {label}
                </span>
              ) : (
                <Link 
                  to={to} 
                  className="text-slate-500 hover:text-blue-600 transition-colors font-medium truncate max-w-[150px]"
                  title={value}
                >
                  {label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
