"use client";
import qrcode from 'qrcode';

import React, { useState, useEffect, FormEvent } from 'react';
import { Upload, Trash2, Edit, Maximize, Minimize, Printer, ClipboardClock, X } from "lucide-react";
import { useTranslation } from 'react-i18next';
import IssueHistoryModal from './IssueHistoryModal';
import ResponseHistoryModal from './ResponseHistoryModal';
import ResponseEditModal from './ResponseEditModal';
import { Issue, Response, IssueEdit } from '@/types/mongodb';
import { useAppContext } from '@/contexts/AppContext';

const CreateIssueModal = ({ onClose, onSubmit, darkMode, issue, isEdit }: any) => {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [formData, setFormData] = useState({
    title: issue?.title || '',
    description: issue?.description || '',
    type: issue?.type || 'Failure',
    priority: issue?.priority || 'Minor',
    stage: issue?.stage || '3',
    labels: issue?.labels || 'Structure',
    assignedTo: issue?.assignedTo || '',
    dueDate: issue?.dueDate || '',
    status: issue?.status || 'Active',
  });
  const [isAddingNew, setIsAddingNew] = useState<string | null>(null);
  const [newOption, setNewOption] = useState('');

  useEffect(() => {
    setIsClient(true);
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
    // In a real app, you'd update the options in your state management
    setFormData((prev) => ({ ...prev, [isAddingNew]: newOption }));
    setIsAddingNew(null);
    setNewOption('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-zinc-50 text-black'} p-4 rounded-xl shadow-lg w-1/3`}>
        <h3 className="text-lg font-bold mb-4">{isEdit ? (isClient ? t('edit_issue') : t('edit_issue')) : (isClient ? t('new_issue') : t('new_issue'))}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{isClient ? t('title') : t('title')}</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{isClient ? t('type') : t('type')}</label>
              {isAddingNew === 'type' ? (
                <div className="flex gap-2">
                  <input type="text" value={newOption} onChange={(e) => setNewOption(e.target.value)} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : t("add")}</button>
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
                  <option value="add-new">{isClient ? t("add_new") : t("add_new")}</option>
                </select>
              )}
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{isClient ? t('priority') : t('priority')}</label>
              {isAddingNew === 'priority' ? (
                <div className="flex gap-2">
                  <input type="text" value={newOption} onChange={(e) => setNewOption(e.target.value)} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : t("add")}</button>
                </div>
              ) : (
                <select name="priority" value={formData.priority} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`}>
                  <option value="OnHold">{isClient ? t('on_hold') : 'On hold'}</option>
                  <option value="Minor">{isClient ? t('minor') : 'Minor'}</option>
                  <option value="Normal">{isClient ? t('normal') : 'Normal'}</option>
                  <option value="Major">{isClient ? t('major') : 'Major'}</option>
                  <option value="Critical">{isClient ? t('critical') : 'Critical'}</option>
                  <option value="add-new">{isClient ? t("add_new") : t("add_new")}</option>
                </select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{isClient ? t('labels') : t('labels')}</label>
              {isAddingNew === 'labels' ? (
                <div className="flex gap-2">
                  <input type="text" value={newOption} onChange={(e) => setNewOption(e.target.value)} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : t("add")}</button>
                </div>
              ) : (
                <select name="labels" value={formData.labels} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`}>
                  <option value="Structure">{isClient ? t('structure') : 'Structure'}</option>
                  <option value="Structural, HVAC">{isClient ? t('structural_hvac') : 'Structural, HVAC'}</option>
                  <option value="Architectural">{isClient ? t('architectural') : 'Architectural'}</option>
                  <option value="MEP">{isClient ? t('mep') : 'MEP'}</option>
                  <option value="add-new">{isClient ? t("add_new") : t("add_new")}</option>
                </select>
              )}
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{isClient ? t('assigned_to') : t('assigned_to')}</label>
              {isAddingNew === 'assignedTo' ? (
                <div className="flex gap-2">
                  <input type="text" value={newOption} onChange={(e) => setNewOption(e.target.value)} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : t("add")}</button>
                </div>
              ) : (
                <select name="assignedTo" value={formData.assignedTo} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`}>
                  <option value="user_a@something.com">{isClient ? t('user_a_email') : 'user_a@something.com'}</option>
                  <option value="user_b@something.com">{isClient ? t('user_b_email') : 'user_b@something.com'}</option>
                  <option value="add-new">{isClient ? t("add_new") : t("add_new")}</option>
                </select>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{isClient ? t('due_date') : t('due_date')}</label>
              <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} />
            </div>
            <div>
              <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{isClient ? t('stage') : t('stage')}</label>
              {isAddingNew === 'stage' ? (
                <div className="flex gap-2">
                  <input type="text" value={newOption} onChange={(e) => setNewOption(e.target.value)} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} />
                  <button type="button" onClick={handleAddNewOption} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded`}>{isClient ? t("add") : t("add")}</button>
                </div>
              ) : (
                <select name="stage" value={formData.stage} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`}>
                  <option value="1">{isClient ? t('stage_1') : '1'}</option>
                  <option value="2">{isClient ? t('stage_2') : '2'}</option>
                  <option value="3">{isClient ? t('stage_3') : '3'}</option>
                  <option value="4">{isClient ? t('stage_4') : '4'}</option>
                  <option value="5">{isClient ? t('stage_5') : '5'}</option>
                  <option value="add-new">{isClient ? t("add_new") : t("add_new")}</option>
                </select>
              )}
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{isClient ? t('description') : t('description')}</label>
            <textarea name="description" value={formData.description} onChange={handleChange} className={`mt-1 block w-full border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} rounded-xl shadow-sm p-2`} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">{isClient ? t('cancel') : t('cancel')}</button>
            <button type="submit" className={`${darkMode ? 'bg-dark-primary hover:bg-dark-focus' : 'bg-light-primary hover:bg-light-focus'} text-amber-100 px-4 py-2 rounded`}>{isEdit ? (isClient ? t('save_changes') : t('save_changes')) : (isClient ? t('add_issue') : t('add_issue'))}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const IssueManager = ({ darkMode, elementId, elementName }: { darkMode: boolean, elementId: string, elementName: string }) => {
  const [isMaximized, setIsMaximized] = useState(false); // Internal state for issue details maximization
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([]); // New state for filtered issues
  const [activeTab, setActiveTab] = useState<'in-progress' | 'completed' | 'deleted'>('in-progress'); // New state for active tab
  const [tabUnderlineStyle, setTabUnderlineStyle] = useState({ left: '0px', width: '0px' });
  const inProgressTabRef = React.useRef<HTMLButtonElement>(null);
  const completedTabRef = React.useRef<HTMLButtonElement>(null);
  const deletedTabRef = React.useRef<HTMLButtonElement>(null);
  const { isLoggedIn, setShowLoginModal, setToast, user } = useAppContext();
  const [responses, setResponses] = useState<Response[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isIssueHistoryModalOpen, setIsIssueHistoryModalOpen] = useState(false);
  const [issueHistory, setIssueHistory] = useState<IssueEdit[]>([]);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [newIssueTemplate, setNewIssueTemplate] = useState<any>(null);
  const [responseText, setResponseText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isResponseEditModalOpen, setIsResponseEditModalOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<Response | null>(null);
  const [isResponseHistoryModalOpen, setIsResponseHistoryModalOpen] = useState(false);
  const [responseHistory, setResponseHistory] = useState<any[]>([]); // Define a proper type later
  const [isIssueDetailsCollapsed, setIsIssueDetailsCollapsed] = useState(false);
  const [isResponsesCollapsed, setIsResponsesCollapsed] = useState(false);

  const handlePrint = async () => { // Make the function async
    if (!selectedIssue) return;

    const modelId = "default-db-model";
    const expressId = elementId;

    let qrCodeImage = '';
    console.log("modelId:", modelId);
    console.log("expressId:", expressId);
    if (modelId && expressId) {
      const qrCodeUrl = `${window.location.origin}/element/${modelId}/${expressId}`;
      console.log("qrCodeUrl:", qrCodeUrl);
      try {
        qrCodeImage = await qrcode.toDataURL(qrCodeUrl, { width: 128, margin: 2 });
        console.log("qrCodeImage generated successfully (length):", qrCodeImage.length);
      } catch (err) {
        console.error("Error generating QR code", err);
      }
    } else {
      console.log("modelId or expressId is missing, cannot generate QR code.");
    }

    const printContent = `
      <div style="font-family: sans-serif; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1;">
            <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 10px;">${selectedIssue.title}</h1>
            <p style="font-size: 14px; color: #555;"><strong>${isClient ? t('create_time') : 'Create Time'} :</strong> ${new Date(selectedIssue.createdAt).toLocaleString()}</p>
            <p style="font-size: 14px; color: #555;"><strong>${isClient ? t('type') : 'Type'} :</strong> ${selectedIssue.type}</p>
            <p style="font-size: 14px; color: #555;"><strong>${isClient ? t('priority') : 'Priority'} :</strong> ${selectedIssue.priority}</p>
            <p style="font-size: 14px; color: #555;"><strong>${isClient ? t('labels') : 'Labels'} :</strong> ${Array.isArray(selectedIssue.labels) ? selectedIssue.labels.join(', ') : selectedIssue.labels}</p>
            <p style="font-size: 14px; color: #555;"><strong>${isClient ? t('assigned_to') : 'Assigned To'} :</strong> ${selectedIssue.assignedTo?.toString()}</p>
            <p style="font-size: 14px; color: #555;"><strong>${isClient ? t('due_date') : 'Due Date'} :</strong> ${selectedIssue.dueDate ? new Date(selectedIssue.dueDate).toLocaleDateString() : (isClient ? t('not_available') : 'Not Available')}</p>
            <p style="font-size: 14px; color: #555;"><strong>${isClient ? t('status') : 'Status'} :</strong> ${selectedIssue.status}</p>
            <p style="font-size: 14px; color: #555;"><strong>${isClient ? t('description') : 'Description'} :</strong> ${selectedIssue.description}</p>
          </div>
          ${qrCodeImage ? `
            <div style="margin-left: 20px; text-align: center;">
              <img src="${qrCodeImage}" alt="${selectedIssue.title}" style="width: 128px; height: 128px;" />
              <p style="font-size: 12px; margin-top: 5px; color: #555;">${elementName}</p>
            </div>
          ` : ''}
        </div>
      </div>
      <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
        <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">${isClient ? t('responses') : 'Responses'}</h2>
        ${responses.map(response => `
          <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
            <p style="font-weight: bold; margin-bottom: 5px;">${response.authorName}</p>
            <p style="margin-bottom: 5px;">${response.text}</p>
            ${response.imageUrl ? `<img src="${response.imageUrl}" alt="response attachment" style="max-width: 100%; height: auto; margin-top: 10px;" />` : ''}
            <p style="font-size: 12px; color: #888; margin-top: 5px;">${new Date(response.createdAt).toLocaleString()}</p>
          </div>
        `).join('')}
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${selectedIssue.title} - Print</title>
            <style>
              body { margin: 0; padding: 0; }
              @media print {
                body { margin: 0; padding: 0; }
                /* Add any print-specific styles here */
              }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      // Add a small delay to ensure content is rendered before printing
      await new Promise(resolve => setTimeout(resolve, 500));
      printWindow.print();
      printWindow.close(); // Close the new window after printing
    }
  };

  const fetchIssues = async () => {
    if (!elementId) return;
    try {
      const res = await fetch(`/api/issues?elementId=${elementId}`);
      if (res.ok) {
        const data = await res.json();
        setIssues(data);
      }
    } catch (error) {
      console.error("Failed to fetch issues", error);
    }
  };

  const fetchResponses = async () => {
    if (!selectedIssue) return;
    try {
      const res = await fetch(`/api/responses?issueId=${selectedIssue._id}`);
      if (res.ok) {
        const data = await res.json();
        setResponses(data);
      }
    } catch (error) {
      console.error("Failed to fetch responses", error);
    }
  };

  useEffect(() => {
    setIsClient(true);
    fetchIssues();
  }, [elementId]);

  useEffect(() => {
    const filterIssues = () => {
      let tempIssues = issues;
      if (activeTab === 'in-progress') {
        tempIssues = issues.filter(issue => issue.status === 'Active' && !issue.deleted);
      } else if (activeTab === 'completed') {
        tempIssues = issues.filter(issue => issue.status === 'Completed' && !issue.deleted);
      } else if (activeTab === 'deleted') {
        tempIssues = issues.filter(issue => issue.deleted);
      }
      setFilteredIssues(tempIssues);
    };
    filterIssues();
  }, [issues, activeTab]);

  useEffect(() => {
    if (!isClient) return;

    const updateTabUnderline = () => {
      let currentTabRef: React.RefObject<HTMLButtonElement> | null = null;
      if (activeTab === 'in-progress') {
        currentTabRef = inProgressTabRef;
      } else if (activeTab === 'completed') {
        currentTabRef = completedTabRef;
      } else if (activeTab === 'deleted') {
        currentTabRef = deletedTabRef;
      }

      if (currentTabRef?.current) {
        setTabUnderlineStyle({
          left: `${currentTabRef.current.offsetLeft}px`,
          width: `${currentTabRef.current.offsetWidth}px`,
        });
      }
    };

    // Ensure refs are available after initial render
    const timeoutId = setTimeout(updateTabUnderline, 0);
    window.addEventListener('resize', updateTabUnderline);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateTabUnderline);
    };
  }, [activeTab, isClient]);


  useEffect(() => {
    if (selectedIssue) {
      fetchResponses();
    } else {
      setResponses([]);
    }
  }, [selectedIssue]);

  const handleCreateIssue = async (formData: any) => {
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, elementId }),
      });
      if (res.ok) {
        fetchIssues();
        setCreateModalOpen(false);
        setToast({ message: t('issue_created_successfully'), type: 'success' });
      } else {
        const errorData = await res.json();
        setToast({ message: errorData.error || t('failed_to_create_issue'), type: 'error' });
      }
    } catch (error) {
      console.error("Error creating issue:", error);
      setToast({ message: t('error_creating_issue'), type: 'error' });
    }
  };

  const handleOpenCreateModal = () => {
    const newIssueNumbers = issues
      .map(issue => {
        const match = issue.title.match(/^New Issue (\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(num => num > 0);

    const nextIssueNumber = newIssueNumbers.length > 0 ? Math.max(...newIssueNumbers) + 1 : 1;
    const defaultTitle = `New Issue ${nextIssueNumber}`;

    setNewIssueTemplate({ title: defaultTitle });
    setCreateModalOpen(true);
  };

  const handleAddResponse = async (e: FormEvent) => {
    e.preventDefault();

    if (!isLoggedIn) {
      setToast({ message: t('please_login_to_add_response'), type: 'error' });
      setShowLoginModal(true);
      return;
    }

    if (!selectedIssue || !responseText) {
      setToast({ message: t('please_fill_in_all_fields'), type: 'error' });
      return;
    }

    const formData = new FormData();
    formData.append('issueId', selectedIssue._id.toString());
    formData.append('text', responseText);
    if (imageFile) {
      formData.append('file', imageFile);
    }

    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        fetchResponses();
        setResponseText('');
        setImageFile(null);
        setImagePreview(null);
      } else {
        console.error("Failed to add response");
      }
    } catch (error) {
      console.error("Error adding response:", error);
    }
  };

  const handleEditIssue = async (formData: any) => {
    if (!selectedIssue) return;

    // Check if the status is being changed
    if (formData.status && formData.status !== selectedIssue.status) {
      if (!window.confirm(t('are_you_sure_you_want_to_change_issue_status'))) {
        // If user cancels, revert the select dropdown to the original status
        setSelectedIssue({ ...selectedIssue, status: selectedIssue.status });
        return;
      }
    }

    try {
      const res = await fetch(`/api/issues/${selectedIssue._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        fetchIssues();
        setEditModalOpen(false);
        // Also update the selectedIssue state to reflect changes immediately
        setSelectedIssue({ ...selectedIssue, ...formData });
        setToast({ message: t('issue_updated_successfully'), type: 'success' });
      } else {
        const errorData = await res.json();
        setToast({ message: errorData.error || t('failed_to_update_issue'), type: 'error' });
      }
    } catch (error) {
      console.error("Error editing issue:", error);
      setToast({ message: t('error_updating_issue'), type: 'error' });
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    if (window.confirm(t('are_you_sure_you_want_to_delete_this_issue'))) {
      try {
        const res = await fetch(`/api/issues/${issueId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          fetchIssues();
          setSelectedIssue(null);
          setToast({ message: t('issue_deleted_successfully'), type: 'success' });
        } else {
          const errorData = await res.json();
          setToast({ message: errorData.error || t('failed_to_delete_issue'), type: 'error' });
        }
      } catch (error) {
        console.error("Error deleting issue:", error);
        setToast({ message: t('error_deleting_issue'), type: 'error' });
      }
    }
  };

  const handleOpenIssueHistoryModal = async () => {
    if (!selectedIssue) return;
    try {
      const res = await fetch(`/api/issues/${selectedIssue._id}/history`);
      if (res.ok) {
        const data = await res.json();
        const formattedHistory = data.map((item: IssueEdit) => ({
          ...item,
          user: item.userId.toString(),
        }));
        setIssueHistory(formattedHistory);
        setIsIssueHistoryModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch issue history", error);
    }
  };

  const handleEditResponse = async (updatedResponseData: Partial<Response>) => {
    if (!editingResponse) return;

    try {
      const res = await fetch(`/api/responses/${editingResponse._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedResponseData),
      });

      if (res.ok) {
        fetchResponses();
        setIsResponseEditModalOpen(false);
        setEditingResponse(null);
        setToast({ message: t('response_updated_successfully'), type: 'success' });
      } else {
        const errorData = await res.json();
        setToast({ message: errorData.error || t('failed_to_update_response'), type: 'error' });
      }
    } catch (error) {
      console.error("Error updating response:", error);
      setToast({ message: t('error_updating_response'), type: 'error' });
    }
  };

  const handleOpenResponseEditModal = (response: Response) => {
    setEditingResponse(response);
    setIsResponseEditModalOpen(true);
  };

  const handleDeleteResponse = async (response: Response) => {
    if (!isLoggedIn) {
      setToast({ message: t('please_login_to_delete_response'), type: 'error' });
      setShowLoginModal(true);
      return;
    }
    if (window.confirm('Are you sure you want to delete this response?')) {
      try {
        const res = await fetch(`/api/responses/${response._id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueId: selectedIssue?._id.toString(), // Pass issueId for history recording
            userId: user?._id, // Pass userId for history recording
            oldText: response.text,
            oldImageUrl: response.imageUrl,
          }),
        });
        if (res.ok) {
          fetchResponses();
          setToast({ message: t('response_deleted_successfully'), type: 'success' });
        } else {
          const errorData = await res.json();
          setToast({ message: errorData.error || t('failed_to_delete_response'), type: 'error' });
        }
      } catch (error) {
        console.error("Error deleting response:", error);
        setToast({ message: t('error_deleting_response'), type: 'error' });
      }
    }
  };

  const handleOpenResponseHistoryModal = async () => {
    if (!isLoggedIn) {
      setToast({ message: t('please_login_to_view_response_history'), type: 'error' });
      setShowLoginModal(true);
      return;
    }
    if (!selectedIssue) return; // Response history is tied to the issue
    try {
      const res = await fetch(`/api/responses/history?issueId=${selectedIssue._id}`);
      if (res.ok) {
        const data = await res.json();
        setResponseHistory(data);
        setIsResponseHistoryModalOpen(true);
      } else {
        const errorData = await res.json();
        setToast({ message: errorData.message || t('failed_to_fetch_response_history'), type: 'error' });
      }
    } catch (error) {
      console.error("Failed to fetch response history", error);
      setToast({ message: t('error_fetching_response_history'), type: 'error' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold">{isClient ? t('issue_manager') : t('issue_manager')}</h2>
        <button onClick={handleOpenCreateModal} className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-2 py-1 rounded`}>
          {isClient ? t('create') : t('create')}
        </button>
      </div>

      {/* Tabs for filtering issues */}
      <div className="relative flex mb-4 border-b border-gray-300 dark:border-gray-700">
        <button
          ref={inProgressTabRef}
          className={`py-2 px-4 text-sm font-medium transition-colors duration-300 ${activeTab === 'in-progress' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          onClick={() => setActiveTab('in-progress')}
        >
          {isClient ? t('in_progress') : 'In Progress'}
        </button>
        <button
          ref={completedTabRef}
          className={`py-2 px-4 text-sm font-medium transition-colors duration-300 ${activeTab === 'completed' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          onClick={() => setActiveTab('completed')}
        >
          {isClient ? t('completed') : 'Completed'}
        </button>
        {user?.role === 'admin' && (
          <button
            ref={deletedTabRef}
            className={`py-2 px-4 text-sm font-medium transition-colors duration-300 ${activeTab === 'deleted' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            onClick={() => setActiveTab('deleted')}
          >
            {isClient ? t('deleted') : 'Deleted'}
          </button>
        )}
        <div
          className="absolute bottom-0 h-0.5 bg-blue-500 transition-all duration-300 ease-in-out"
          style={{
            left: tabUnderlineStyle.left,
            width: tabUnderlineStyle.width,
          }}
        ></div>
      </div>

      <div className="max-h-[200px] border rounded ${darkMode ? 'border-zinc-600' : 'border-zinc-400'} p-1">
        {filteredIssues.length > 0 ? (
          <ul>
            {filteredIssues.map((issue) => (
              <li
                key={issue._id.toString()}
                onClick={() => setSelectedIssue(issue._id === selectedIssue?._id ? null : issue)}
                className={`cursor-pointer p-1 flex justify-between items-center ${selectedIssue?._id === issue._id ? (darkMode ? 'bg-custom-blue-600' : 'bg-custom-blue-300') : ''}`}
              >
                <div className="flex items-center gap-2 flex-1" onClick={() => setSelectedIssue(issue._id === selectedIssue?._id ? null : issue)}>
                  <span className="truncate" title={issue.title}>{issue.title}</span>
                  <span className="text-xs text-gray-500">{new Date(issue.createdAt).toLocaleDateString()}</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteIssue(issue._id.toString()); }} className="text-red-500 hover:text-red-700">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">{isClient ? t("no_issues_found") : t("no_issues_found")}</p>
          </div>
        )}
      </div>
      {selectedIssue && (
        <div className={`mt-4 p-4 rounded-lg shadow-lg border ${darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-zinc-200 border-gray-300 text-black"} flex flex-col overflow-y-auto ${isMaximized ? 'fixed inset-0 z-50' : ''}`}>
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-xl font-bold">{selectedIssue.title}</h1>
            <div className="flex items-center space-x-2">
              <button onClick={() => setIsMaximized(!isMaximized)} className="text-2xl font-bold hover:text-gray-400">
                {isMaximized ? <Minimize size={28} /> : <Maximize size={28} />}
              </button>
              <button onClick={() => setSelectedIssue(null)} className="text-2xl font-bold hover:text-gray-400">
                <X size={28} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-end space-x-2 mb-2">
            <select
              value={selectedIssue.status}
              onChange={(e) => handleEditIssue({ ...selectedIssue, status: e.target.value })}
              className={`p-1 rounded text-xs ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-black'}`}
            >
              <option value="Active">{isClient ? t('active') : 'Active'}</option>
              <option value="Completed">{isClient ? t('completed') : 'Completed'}</option>
              <option value="Deleted" disabled={user?.role !== 'admin'}>
                {isClient ? t('deleted') : 'Deleted'}
              </option>
            </select>
            <button onClick={handlePrint} className="bg-gray-500 text-white px-2 py-1 rounded text-xs">
              <Printer size={20} />
            </button>
            <button onClick={() => setEditModalOpen(true)} className="bg-blue-500 text-white px-2 py-1 rounded text-xs flex items-center justify-center">
              <Edit size={20} />
            </button>
            <button
              onClick={handleOpenIssueHistoryModal}
              className="bg-zinc-500 text-white px-2 py-1 rounded text-xs flex items-center justify-center"
            >
              <ClipboardClock size={20} />
            </button>
          </div>
            {/* Issue Details Section */}
            <div className="mt-2">
              <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsIssueDetailsCollapsed(!isIssueDetailsCollapsed)}>
                <h6 className="font-semibold border-b pb-1">{isClient ? t("details") : t("details")}</h6>
                <svg className={`w-4 h-4 transform transition-transform ${isIssueDetailsCollapsed ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
              {!isIssueDetailsCollapsed && (
                <div className="text-sm space-y-1 mt-2">
                  <p className="py-1 border-b border-gray-200 dark:border-gray-700"><strong>{isClient ? t('create_time') : t('create_time')} :</strong> {new Date(selectedIssue.createdAt).toLocaleString()}</p>
                  <p className="py-1 border-b border-gray-200 dark:border-gray-700"><strong>{isClient ? t('type') : t('type')} :</strong> {selectedIssue.type}</p>
                  <p className="py-1 border-b border-gray-200 dark:border-gray-700"><strong>{isClient ? t('priority') : t('priority')} :</strong> {selectedIssue.priority}</p>
                  <p className="py-1 border-b border-gray-200 dark:border-gray-700"><strong>{isClient ? t('labels') : t('labels')} :</strong> {Array.isArray(selectedIssue.labels) ? selectedIssue.labels.join(', ') : selectedIssue.labels}</p>
                  <p className="py-1 border-b border-gray-200 dark:border-gray-700"><strong>{isClient ? t('assigned_to') : t('assigned_to')} :</strong> {selectedIssue.assignedTo?.toString()}</p>
                  <p className="py-1 border-b border-gray-200 dark:border-gray-700"><strong>{isClient ? t('due_date') : t('due_date')} :</strong> {selectedIssue.dueDate ? new Date(selectedIssue.dueDate).toLocaleDateString() : t('not_available')}</p>
                  <p className="py-1 border-b border-gray-200 dark:border-gray-700"><strong>{isClient ? t('status') : t('status')} :</strong> {selectedIssue.status}</p>
                  <p className="py-1 border-b border-gray-200 dark:border-gray-700"><strong>{isClient ? t('description') : t('description')} :</strong> {selectedIssue.description}</p>
                </div>
              )}
            </div>

            {/* Responses Section */}
            <div className="mt-4 pt-2 border-t border-gray-600">
              <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => setIsResponsesCollapsed(!isResponsesCollapsed)}>
                <h6 className="font-semibold">{isClient ? t("responses") : t("responses")}</h6>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenResponseHistoryModal(); }}
                    className="bg-zinc-500 text-white px-2 py-1 rounded text-xs"
                  >
                    {isClient ? t("history") : t("history")}
                  </button>
                  <svg className={`w-4 h-4 transform transition-transform ${isResponsesCollapsed ? 'rotate-0' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              {!isResponsesCollapsed && (
                <>
                  <div className="space-y-2 mb-2">
                    {responses.map(response => (
                      <div key={response._id.toString()} className={`p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div className="flex justify-between items-center">
                          <p className="font-semibold text-base underline">{response.authorName}</p>
                          {user?._id === response.authorId.toString() && ( // Only show edit/delete if current user is the author
                            <div className="flex space-x-2">
                              <button onClick={() => handleOpenResponseEditModal(response)} className="text-blue-500 hover:text-blue-700">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handleDeleteResponse(response)} className="text-red-500 hover:text-red-700">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                        <p>{response.text}</p>
                        {response.imageUrl && <img src={response.imageUrl} alt="response attachment" className="mt-2 rounded max-w-full h-auto" />}
                        <p className="text-xs text-gray-500 mt-1">{new Date(response.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddResponse}>
                    <div className="flex flex-col gap-2">
                      <textarea
                        placeholder={isClient ? t("add_a_response") : t("add_a_response")}
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        className={`w-full border ${darkMode ? "bg-zinc-700 border-zinc-500" : "bg-zinc-50 border-zinc-300"} rounded-xl shadow-sm p-2`}
                        required
                      />
                      {imagePreview && (
                        <div className="relative mt-2">
                          <img src={imagePreview} alt="preview" className="rounded max-w-xs h-auto" />
                          <button
                            type="button"
                            onClick={() => {
                              setImageFile(null);
                              setImagePreview(null);
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <label className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded self-start cursor-pointer`}>
                          <Upload size={16}/>
                          <input type="file" accept="image/png, image/jpeg" className="hidden" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setImageFile(file);
                              setImagePreview(URL.createObjectURL(file));
                            }
                          }} />
                        </label>
                        <button type="submit" className={`${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} text-amber-100 px-4 py-2 rounded self-end`}>
                          {isClient ? t("add_response") : t("add_response")}
                        </button>
                      </div>
                    </div>
                  </form>
                </>
              )}
            </div>
        </div>
      )}
      {isCreateModalOpen && (
        <CreateIssueModal
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateIssue}
          darkMode={darkMode}
          issue={newIssueTemplate}
        />
      )}
      {isEditModalOpen && selectedIssue && (
        <CreateIssueModal
          onClose={() => setEditModalOpen(false)}
          onSubmit={handleEditIssue}
          darkMode={darkMode}
          issue={selectedIssue}
          isEdit={true}
        />
      )}
      {isIssueHistoryModalOpen && selectedIssue && (
        <IssueHistoryModal
          onClose={() => setIsIssueHistoryModalOpen(false)}
          history={issueHistory}
          darkMode={darkMode}
        />
      )}
      {isResponseEditModalOpen && editingResponse && (
        <ResponseEditModal
          onClose={() => setIsResponseEditModalOpen(false)}
          onSubmit={handleEditResponse}
          darkMode={darkMode}
          response={editingResponse}
        />
      )}
      {isResponseHistoryModalOpen && selectedIssue && (
        <ResponseHistoryModal
          onClose={() => setIsResponseHistoryModalOpen(false)}
          history={responseHistory}
          darkMode={darkMode}
        />
      )}
    </div>
  );
};

export default IssueManager;
