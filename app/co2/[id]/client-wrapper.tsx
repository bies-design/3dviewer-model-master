"use client";

import dynamic from 'next/dynamic';

const CO2DetailContainer = dynamic(() => import('@/containers/CO2DetailContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-dvh flex items-center justify-center bg-gray-900 text-white">
      <p>Loading Viewer...</p>
    </div>
  ),
});

const ClientWrapper = () => {
  return <CO2DetailContainer />;
};

export default ClientWrapper;