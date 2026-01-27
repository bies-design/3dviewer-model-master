import React from "react";
import { useAppContext } from "@/contexts/AppContext";

// const {viewMode} = useAppContext();

interface Props {
  darkMode: boolean;
  viewerRef: React.RefObject<HTMLDivElement>;
  uploadedModels: any[];
  viewMode:'global' | 'floor' | 'device';
}

export default function IFCViewerUI({ darkMode, viewerRef, uploadedModels, viewMode }: Props) {
  return (
    <div ref={viewerRef} className="w-full h-full"/>
  );
}
