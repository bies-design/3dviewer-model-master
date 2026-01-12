"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Response } from '@/types/mongodb';

interface ResponseEditModalProps {
  onClose: () => void;
  onSubmit: (updatedResponse: Partial<Response>) => void;
  darkMode: boolean;
  response: Response;
}

const ResponseEditModal: React.FC<ResponseEditModalProps> = ({ onClose, onSubmit, darkMode, response }) => {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [responseText, setResponseText] = useState(response.text || '');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ text: responseText });
  };

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-zinc-50 text-black'} p-4 rounded-xl shadow-lg w-1/3`}>
        <h3 className="text-lg font-bold mb-4">{isClient ? t('edit_response') : 'Edit Response'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{isClient ? t('response_text') : 'Response Text'}</label>
            <textarea
              name="responseText"
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`}
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">{isClient ? t('cancel') : 'Cancel'}</button>
            <button type="submit" className={`${darkMode ? 'bg-dark-primary hover:bg-dark-focus' : 'bg-light-primary hover:bg-light-focus'} text-amber-100 px-4 py-2 rounded`}>{isClient ? t('save_changes') : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResponseEditModal;