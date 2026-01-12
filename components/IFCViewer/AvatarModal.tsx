"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@heroui/react";
import Image from "next/image";
import { useAppContext } from "@/contexts/AppContext"; // Import useAppContext
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useTranslation } from "react-i18next";

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAvatarSelect: (avatarUrl: string) => void;
}

const defaultAvatars = [
  "/avatars/avatar1.svg",
  "/avatars/avatar2.svg",
  "/avatars/avatar3.svg",
  "/avatars/avatar4.svg",
];

const AvatarModal: React.FC<AvatarModalProps> = ({ isOpen, onClose, onAvatarSelect }) => {
  const { darkMode, user } = useAppContext(); // Get darkMode and user from context
  const { t } = useTranslation(); // Initialize useTranslation
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imgSrc, setImgSrc] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setCrop(undefined); // Makes crop controlled
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setImgSrc(reader.result?.toString() || ''),
      );
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  const getCroppedImg = async (image: HTMLImageElement, crop: PixelCrop, fileName: string): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height,
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.7); // Adjust quality as needed
    });
  };

  const handleUpload = async (): Promise<string | null> => {
    if (!completedCrop || !imgRef.current || !user?._id) {
      console.error("Missing crop data, image reference, or user ID for avatar upload.");
      return null;
    }

    const croppedBlob = await getCroppedImg(imgRef.current, completedCrop, selectedFile?.name || 'avatar.jpeg');

    if (!croppedBlob) {
      console.error("Failed to get cropped image blob.");
      return null;
    }

    const formData = new FormData();
    formData.append("file", croppedBlob, selectedFile?.name || 'avatar.jpeg');
    formData.append("userId", user._id.toString()); // Append userId to FormData, converting ObjectId to string

    try {
      const response = await fetch("/api/user/upload-avatar", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.filePath;
      } else {
        console.error("Failed to upload avatar");
        return null;
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className={` ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-lg w-full max-w-md`}>
        <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-black'}`}>Choose Avatar</h2>
        <div className="mb-4">
          <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>Select from default</h3>
          <div className="flex space-x-2">
            {defaultAvatars.map((avatar) => (
              <button key={avatar} onClick={() => setSelectedAvatarUrl(avatar)} className={`focus:outline-none focus:ring-2 ${selectedAvatarUrl === avatar ? 'ring-blue-500' : ''} rounded-full`}>
                <Image src={avatar} alt="Default avatar" width={64} height={64} className="rounded-full" />
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>Or upload your own</h3>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <span className="sr-only">Choose profile photo</span>
            <input type="file" accept="image/*" onChange={handleFileChange} className={`block w-full text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              ${darkMode ? 'file:bg-gray-700 file:text-amber-100 hover:file:bg-gray-600' : 'file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200'}
            `}/>
          </label>
          {imgSrc && (
            <div className="mt-4">
              <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={1}>
                <img ref={imgRef} alt="Crop me" src={imgSrc} onLoad={(e) => {
                  const { width, height } = e.currentTarget;
                  setCrop({
                    unit: '%',
                    width: 50,
                    height: 50,
                    x: (100 - 50) / 2,
                    y: (100 - 50) / 2,
                  });
                }} />
              </ReactCrop>
              <p className="text-sm text-gray-500 mt-2">{isClient ? t('drag_and_resize_crop') : 'Drag and resize the square to crop your avatar.'}</p>
            </div>
          )}
        </div>
        {selectedAvatarUrl && (
          <div className="mb-4">
            <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>Selected Avatar Preview</h3>
            <Image src={selectedAvatarUrl} alt="Selected avatar preview" width={64} height={64} className="rounded-full" />
          </div>
        )}
        <div className="flex justify-end space-x-2">
          <Button onClick={onClose} className={`${darkMode ? "bg-gray-600 hover:bg-gray-700 text-white" : "bg-gray-200 hover:bg-gray-300 text-black"} px-4 py-2 rounded-xl`}>Close</Button>
          <Button onClick={async () => {
            let finalAvatarUrl = selectedAvatarUrl;
            if (imgSrc && completedCrop) { // Use imgSrc and completedCrop for uploaded image
              finalAvatarUrl = await handleUpload();
            } else if (selectedAvatarUrl) { // Fallback to default selected avatar
              finalAvatarUrl = selectedAvatarUrl;
            }

            if (finalAvatarUrl) {
              onAvatarSelect(finalAvatarUrl);
              onClose();
            }
          }} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-blue-500 hover:bg-blue-600"} text-white px-4 py-2 rounded-xl`} disabled={(!selectedAvatarUrl && !imgSrc) || !user?._id}>Confirm</Button>
        </div>
      </div>
    </div>
  );
};

export default AvatarModal;
