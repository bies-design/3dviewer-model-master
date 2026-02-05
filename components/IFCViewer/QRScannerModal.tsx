"use client";

import React, { useState } from "react";
import { QrReader } from "react-qr-reader";
import { X } from "lucide-react";

interface QRScannerModalProps {
  onClose: () => void;
  onScan: (data: string | null) => void;
  darkMode: boolean;
}

const QRScannerModal: React.FC<QRScannerModalProps> = ({ onClose, onScan, darkMode }) => {
  const [error, setError] = useState<string | null>(null);

  const handleResult = (result: any, error: any) => {
    if (result) {
      onScan(result?.text);
      onClose();
    }
    if (error) {
      console.info(error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Header / Close Button */}
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={onClose}
          className="p-2 bg-white/20 rounded-full text-white hover:bg-white/40 backdrop-blur-md"
        >
          <X size={24} />
        </button>
      </div>

      <div className="w-full max-w-md aspect-square relative overflow-hidden rounded-xl border-2 border-blue-500 shadow-2xl">
        <QrReader
          onResult={handleResult}
          constraints={{ facingMode: 'environment' }} // 使用後鏡頭
          containerStyle={{ width: '100%', height: '100%' }}
          videoStyle={{ objectFit: 'cover' }} // 讓影像填滿
        />
        {/* 掃描框線 (UI 裝飾) */}
        <div className="absolute inset-0 border-2 border-transparent">
             <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
             <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
             <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
             <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
        </div>
      </div>
      
      <p className="text-white mt-8 text-center px-4">
        請將 QR Code 對準框線<br/>系統將自動掃描
      </p>
    </div>
  );
};

export default QRScannerModal;