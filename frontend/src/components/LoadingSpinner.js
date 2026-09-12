import React from 'react';

export const PageSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  </div>
);

export const ButtonSpinner = () => (
  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
);

export default PageSpinner;
