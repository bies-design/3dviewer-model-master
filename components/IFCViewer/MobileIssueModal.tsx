"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Input } from '@heroui/react';
import { useAppContext } from '@/contexts/AppContext';

interface MobileIssueModalProps {
  onClose: () => void;
  darkMode: boolean;
  expressId: number;
  modelId: string;
  deviceName: string;
  floor: string;
}

const MobileIssueModal: React.FC<MobileIssueModalProps> = ({ 
  onClose, 
  darkMode, 
  expressId, 
  modelId, 
  deviceName,
  floor 
}) => {
  const { t } = useTranslation();
  const { setToast } = useAppContext();
  const [isClient, setIsClient] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState({
    title: `設備報修: ${deviceName}`,
    description: `[系統自動帶入資訊]\n樓層: ${floor}\n設備名稱: ${deviceName}\n\n[詳細狀況描述]：\n`,
    type: 'Failure',
    priority: 'Normal',
    stage: '1',
    labels: 'MEP',
    assignedTo: '',
    dueDate: '',
    status: 'Active',
  });

  const [isAddingNew, setIsAddingNew] = useState<string | null>(null);
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    setIsClient(true);
    setMounted(true); 
    
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (value === 'add-new') {
      setIsAddingNew(name);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddNewOption = () => {
    if (!isAddingNew || !newOption) return;
    setFormData((prev) => ({ ...prev, [isAddingNew]: newOption }));
    setIsAddingNew(null);
    setNewOption('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const elementId = `${modelId}_${expressId}`;

    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, elementId }),
      });
      
      if (res.ok) {
        setToast({ message: isClient ? t('issue_created_successfully') : '報修單建立成功', type: 'success' });
        onClose();
      } else {
        const errorData = await res.json();
        setToast({ message: errorData.error || (isClient ? t('failed_to_create_issue') : '建立失敗'), type: 'error' });
      }
    } catch (error) {
      console.error("Error creating issue:", error);
      setToast({ message: isClient ? t('error_creating_issue') : '發生錯誤', type: 'error' });
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-md flex justify-center items-center z-[100] animate-in fade-in duration-200">
      <div className={`relative ${darkMode ? 'rounded-[20px] border border-white/10 backdrop-blur-[20px] bg-black/50 text-white' : 'bg-zinc-50 text-black'} rounded shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.5),inset_0px_0px_20px_0px_rgba(255,255,255,0.05),inset_0px_-4px_6px_0px_rgba(100,200,255,0.3),0px_20px_40px_-10px_rgba(0,0,0,0.6)] p-4 w-11/12 sm:w-1/2 md:w-1/3 max-h-[95vh] overflow-y-auto`}>
        <div className="absolute inset-0 rounded-[20px] opacity-15 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay"/>
        
        <h3 className="text-center text-2xl drop-shadow-md font-bold mb-4 mt-2">
          新增報修單
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          <div>
            <Input 
              label={'標題'} 
              type="text" 
              name="title"
              value={formData.title} 
              onChange={handleChange} 
              required
              classNames={{
                label: [
                  "text-black/80 dark:text-white/80",
                  "invalid:text-blue-100",
                ],
                input: ["text-black/90 dark:text-white/90"],
                inputWrapper: [
                  "data-[focus-true]:bg-black/20 border border-white/10 shadow-[inset_0px_4px_4px_0px_rgba(0,0,0,0.8),inset_0px_-1px_4px_0px_rgba(255,255,255,0.5)]"
                ],
              }} 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block pl-1 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>類型</label>
              {isAddingNew === 'type' ? (
                <div className="flex gap-2">
                  <input type="text" value={newOption} onChange={(e) => setNewOption(e.target.value)} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : '新增'}</button>
                </div>
              ) : (
                <select name="type" value={formData.type} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`}>                
                  <option value="Clash">{isClient ? t('clash') : 'Clash'}</option>
                  <option value="Failure">{isClient ? t('failure') : 'Failure'}</option>
                  <option value="Fault">{isClient ? t('fault') : 'Fault'}</option>
                  <option value="Inquiry">{isClient ? t('inquiry') : 'Inquiry'}</option>
                  <option value="Issue">{isClient ? t('issue') : 'Issue'}</option>
                  <option value="Remark">{isClient ? t('remark') : 'Remark'}</option>
                  <option value="Request">{isClient ? t('request') : 'Request'}</option>
                  <option value="add-new">{isClient ? t("add_new") : '新增選項...'}</option>
                </select>
              )}
            </div>
            <div>
              <label className={`block pl-1 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>優先級</label>
              {isAddingNew === 'priority' ? (
                <div className="flex gap-2">
                  <input type="text" value={newOption} onChange={(e) => setNewOption(e.target.value)} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : '新增'}</button>
                </div>
              ) : (
                <select name="priority" value={formData.priority} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`}>
                  <option value="OnHold">{isClient ? t('on_hold') : 'On hold'}</option>
                  <option value="Minor">{isClient ? t('minor') : 'Minor'}</option>
                  <option value="Normal">{isClient ? t('normal') : 'Normal'}</option>
                  <option value="Major">{isClient ? t('major') : 'Major'}</option>
                  <option value="Critical">{isClient ? t('critical') : 'Critical'}</option>
                  <option value="add-new">{isClient ? t("add_new") : '新增選項...'}</option>
                </select>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block pl-1 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>標籤</label>
              {isAddingNew === 'labels' ? (
                <div className="flex gap-2">
                  <input type="text" value={newOption} onChange={(e) => setNewOption(e.target.value)} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : '新增'}</button>
                </div>
              ) : (
                <select name="labels" value={formData.labels} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`}>
                  <option value="Structure">{isClient ? t('structure') : 'Structure'}</option>
                  <option value="Structural, HVAC">{isClient ? t('structural_hvac') : 'Structural, HVAC'}</option>
                  <option value="Architectural">{isClient ? t('architectural') : 'Architectural'}</option>
                  <option value="MEP">{isClient ? t('mep') : 'MEP'}</option>
                  <option value="add-new">{isClient ? t("add_new") : '新增選項...'}</option>
                </select>
              )}
            </div>
            <div>
              <label className={`block pl-1 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>到期日</label>
              <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} />
            </div>
            {/* <div>
              <label className={`block pl-1 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{isClient ? t('assigned_to') : '指派給'}</label>
              {isAddingNew === 'assignedTo' ? (
                <div className="flex gap-2">
                  <input type="text" value={newOption} onChange={(e) => setNewOption(e.target.value)} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : '新增'}</button>
                </div>
              ) : (
                <select name="assignedTo" value={formData.assignedTo} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`}>
                  <option value="user_a@something.com">{isClient ? t('user_a_email') : 'user_a@something.com'}</option>
                  <option value="user_b@something.com">{isClient ? t('user_b_email') : 'user_b@something.com'}</option>
                  <option value="add-new">{isClient ? t("add_new") : '新增選項...'}</option>
                </select>
              )}
            </div> */}
          </div>
          
          {/* <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block pl-1 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{isClient ? t('due_date') : '到期日'}</label>
              <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} />
            </div>
            <div>
              <label className={`block pl-1 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{isClient ? t('stage') : '階段'}</label>
              {isAddingNew === 'stage' ? (
                <div className="flex gap-2">
                  <input type="text" value={newOption} onChange={(e) => setNewOption(e.target.value)} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : '新增'}</button>
                </div>
              ) : (
                <select name="stage" value={formData.stage} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`}>
                  <option value="1">{isClient ? t('stage_1') : '1'}</option>
                  <option value="2">{isClient ? t('stage_2') : '2'}</option>
                  <option value="3">{isClient ? t('stage_3') : '3'}</option>
                  <option value="4">{isClient ? t('stage_4') : '4'}</option>
                  <option value="5">{isClient ? t('stage_5') : '5'}</option>
                  <option value="add-new">{isClient ? t("add_new") : '新增選項...'}</option>
                </select>
              )}
            </div>
          </div> */}
          
          <div>
            <label className={`block pl-1 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>描述</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows={6}
              className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} 
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="bg-white/[0.05] border border-white/10 rounded-full text-red-500 p-3 hover:bg-red-500/10 transition-colors shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.5),inset_0px_0px_20px_0px_rgba(255,255,255,0.05),inset_0px_-4px_6px_0px_rgba(100,200,255,0.3),0px_20px_40px_-10px_rgba(0,0,0,0.6)]">
              <X size={24}/>
            </button>
            <button type="submit" className="bg-white/[0.05] border border-white/10 rounded-full text-green-500 p-3 hover:bg-green-500/10 transition-colors shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.5),inset_0px_0px_20px_0px_rgba(255,255,255,0.05),inset_0px_-4px_6px_0px_rgba(100,200,255,0.3),0px_20px_40px_-10px_rgba(0,0,0,0.6)]">
              <Upload size={24}/>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default MobileIssueModal;