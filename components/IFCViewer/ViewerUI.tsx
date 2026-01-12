import React from "react";

interface Props {
  darkMode: boolean;
  viewerRef: React.RefObject<HTMLDivElement>;
  uploadedModels: any[];
}

export default function IFCViewerUI({ darkMode, viewerRef, uploadedModels }: Props) {
  return (
    <div ref={viewerRef} className="w-full h-full" />
  );
}
