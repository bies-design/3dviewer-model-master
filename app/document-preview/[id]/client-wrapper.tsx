"use client";

import dynamic from 'next/dynamic';

const PDFViewerContainer = dynamic(() => import('@/containers/PDFViewerContainer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-dvh flex items-center justify-center bg-gray-900 text-white">
      <p>Loading PDF Viewer...</p>
    </div>
  ),
});

const ClientWrapper = () => {
  return <PDFViewerContainer />;
};

export default ClientWrapper;