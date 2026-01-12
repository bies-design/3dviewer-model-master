"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Input } from '@heroui/input';
import { Card, CardBody, Button } from '@heroui/react';
import { PlusIcon, XIcon } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import HorizontalSteps from '@/components/HorizontalSteps';
import MaterialDataTable from '@/components/MaterialDataTable';
import * as OBC from "@thatopen/components";

interface MaterialRow {
  id: number;
  index: string;
  material: string;
  thickness: number;
  width: number;
  density: number;
  length: number;
  kgM2: number;
  co2eKg: number;
  co2eM2: number;
  isDefault: boolean;
  subRows: Omit<MaterialRow, 'subRows' | 'index'>[];
}

interface Project {
  _id: string;
  modelName: string;
  coverImageUrl: string;
  totalCO2: number;
}

const initialData: MaterialRow[] = [
  { id: 1, index: '1.', material: '鋁擠型', thickness: 0, width: 0, density: 2700, length: 0, kgM2: 0, co2eKg: 13.14, co2eM2: 0, isDefault: true, subRows: [] },
  { id: 2, index: '2.', material: '鋁板', thickness: 0, width: 0, density: 2700, length: 0, kgM2: 0, co2eKg: 13.15, co2eM2: 0, isDefault: true, subRows: [] },
  { id: 3, index: '3.', material: '鐵件', thickness: 0, width: 0, density: 7850, length: 0, kgM2: 0, co2eKg: 2.99, co2eM2: 0, isDefault: true, subRows: [] },
  { id: 4, index: '4.', material: '玻璃', thickness: 0, width: 0, density: 2500, length: 0, kgM2: 0, co2eKg: 1.75, co2eM2: 0, isDefault: true, subRows: [] },
  { id: 5, index: '5.', material: '隔音毯', thickness: 0, width: 0, density: 1200, length: 0, kgM2: 0, co2eKg: 4.19, co2eM2: 0, isDefault: true, subRows: [] },
  { id: 6, index: '6.', material: '矽酸鈣板', thickness: 0, width: 0, density: 800, length: 0, kgM2: 0, co2eKg: 1.12, co2eM2: 0, isDefault: true, subRows: [] },
  { id: 7, index: '7.', material: '鍍鋅板', thickness: 0, width: 0, density: 7850, length: 0, kgM2: 0, co2eKg: 2.99, co2eM2: 0, isDefault: true, subRows: [] },
  { id: 8, index: '8.', material: '膠條', thickness: 0, width: 0, density: 1200, length: 0, kgM2: 0, co2eKg: 2.89, co2eM2: 0, isDefault: true, subRows: [] },
  { id: 9, index: '9.', material: '不鏽鋼板', thickness: 0, width: 0, density: 8000, length: 0, kgM2: 0, co2eKg: 2.01, co2eM2: 0, isDefault: true, subRows: [] },
  { id: 10, index: '10.', material: '岩棉', thickness: 0, width: 0, density: 120, length: 0, kgM2: 0, co2eKg: 1.4, co2eM2: 0, isDefault: true, subRows: [] },
];

const CO2ViewerContainer = () => {
  const { darkMode, setToast } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [modelName, setModelName] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [ifcFile, setIfcFile] = useState<File | null>(null);

  const [materials, setMaterials] = useState<MaterialRow[]>(JSON.parse(JSON.stringify(initialData)));
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set(initialData.map(row => row.id)));

  const [components, setComponents] = useState<OBC.Components | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/co2-projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        console.error("Failed to fetch projects");
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const initOBC = async () => {
      const components = new OBC.Components();
      const ifcLoader = components.get(OBC.IfcLoader);
      await ifcLoader.setup({
        autoSetWasm: false,
        wasm: { path: "https://unpkg.com/web-ifc@0.0.71/", absolute: true },
      });
      const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
      const fetchedUrl = await fetch(githubUrl);
      const workerBlob = await fetchedUrl.blob();
      const workerFile = new File([workerBlob], "worker.mjs", { type: "text/javascript" });
      const workerUrl = URL.createObjectURL(workerFile);
      const fragments = components.get(OBC.FragmentsManager);
      fragments.init(workerUrl);
      await components.init();
      setComponents(components);
      return () => {
        components.dispose();
        URL.revokeObjectURL(workerUrl);
      };
    };
    initOBC();
  }, []);

  useEffect(() => {
    if (coverImage) {
      const objectUrl = URL.createObjectURL(coverImage);
      setCoverImagePreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [coverImage]);

  const resetState = () => {
    setModelName('');
    setCoverImage(null);
    setCoverImagePreview(null);
    setIfcFile(null);
    setMaterials(JSON.parse(JSON.stringify(initialData)));
    setExpandedRows(new Set(initialData.map(row => row.id)));
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStatus('');
  }

  const onOpen = () => {
    setCurrentStep(1);
    resetState();
    setIsOpen(true);
  };
  const onClose = () => {
    setIsOpen(false);
    fetchProjects();
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCoverImage(e.target.files[0]);
    }
  };

  const handleIfcFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIfcFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!ifcFile || !coverImage || !modelName || !components) {
      setToast({ message: "Please fill in all fields and upload required files.", type: "error" });
      return;
    }

    setCurrentStep(3);
    setIsUploading(true);
    setUploadStatus('Converting...');
    let progressInterval: any;

    try {
      await new Promise(resolve => {
        let progress = 0;
        progressInterval = setInterval(() => {
          progress = Math.min(progress + Math.random() * 5, 48);
          setUploadProgress(progress);
          if (progress >= 48) {
            clearInterval(progressInterval);
            resolve(null);
          }
        }, 100);
      });

      const ifcLoader = components.get(OBC.IfcLoader);
      const arrayBuffer = await ifcFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const model = await ifcLoader.load(uint8Array, false, `frag-${ifcFile.name}`);
      const fragmentData = await model.getBuffer(false);
      setUploadProgress(50);

      setUploadStatus('Uploading...');
      await new Promise(resolve => {
        let progress = 50;
        progressInterval = setInterval(() => {
          progress = Math.min(progress + Math.random() * 5, 98);
          setUploadProgress(progress);
          if (progress >= 98) {
            clearInterval(progressInterval);
            resolve(null);
          }
        }, 100);
      });
      
      const formData = new FormData();
      formData.append('modelName', modelName);
      formData.append('materials', JSON.stringify(materials));
      formData.append('coverImage', coverImage);
      formData.append('fragmentFile', new Blob([fragmentData]), `${modelName}.frag`);

      const response = await fetch('/api/co2-projects', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      setUploadProgress(100);
      setUploadStatus('Success');
      setTimeout(() => setIsUploading(false), 2000);

    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      console.error("Upload process failed:", error);
      setUploadStatus(`Failed`);
      setTimeout(() => setIsUploading(false), 2000);
    }
  };

  const handleProceed = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      handleUpload();
    } else if (currentStep === 3 && !isUploading) {
      onClose();
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const steps = [
    { title: "Details" },
    { title: "Materials" },
    { title: "Complete" },
  ];

  const filteredProjects = useMemo(() => {
    return projects.filter(project =>
      project.modelName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  return (
    <>
      <div className="w-full h-dvh mx-auto bg-main-gradient">
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="mb-8">
            <Image src="/Type=Full.svg" alt="Logo" width={240} height={60} className={darkMode ? "brightness-0 invert" : ""} />
          </div>
          <div className="w-full max-w-md mb-8">
            <Input
              type="text"
              placeholder="Search by model name..."
              className="w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Card isPressable onPress={onOpen} className="w-full h-64 bg-gray-300 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-400 min-w-64">
              <CardBody className="w-full h-full flex flex-col items-center justify-center">
                <PlusIcon className="w-12 h-12 text-gray-700" />
                <p className="mt-2 text-sm font-medium text-gray-700">Add New</p>
              </CardBody>
            </Card>
            {filteredProjects.map((project) => (
              <Link href={`/co2/${project._id}`} key={project._id} target="_blank" rel="noopener noreferrer">
                <Card isPressable className="w-full h-64 flex flex-col min-w-64">
                  <Image
                    src={project.coverImageUrl}
                    alt={project.modelName}
                    width={300}
                    height={150}
                    className="w-full h-3/5 object-cover rounded-t-lg"
                  />
                  <CardBody className="flex-grow flex flex-col justify-between p-3">
                    <h3 className="text-md font-bold truncate">{project.modelName}</h3>
                    <p className="mt-2 text-xs text-gray-400">
                      總碳排放: {project.totalCO2} kg Co2e/m2
                    </p>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="flex flex-col items-center gap-4 min-w-2/3">
            <div className="relative bg-gray-800 rounded-xl shadow-lg w-full max-w-5/6">
              <div className="flex items-center justify-between p-4 border-b border-divider">
                <h3 className="text-lg font-semibold">Add New Model</h3>
                <Button isIconOnly variant="light" onPress={onClose} size="sm">
                  <XIcon className="w-5 h-5" />
                </Button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                {currentStep === 1 && (
                  <>
                    <Input label="Name" placeholder="Enter model name" variant="bordered" className="mb-4" value={modelName} onChange={(e) => setModelName(e.target.value)} />
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-foreground mb-2">Cover Image</label>
                      <label className={`w-full flex justify-center items-center font-medium px-6 py-2 rounded-xl cursor-pointer transition-colors duration-200 ${darkMode ? "bg-dark-primary text-white hover:bg-dark-focus" : "bg-light-secondary text-white hover:bg-light-focus"}`}>
                        {coverImage ? coverImage.name : 'Upload Image'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleCoverImageChange} />
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">IFC File</label>
                      <label className={`w-full flex justify-center items-center font-medium px-6 py-2 rounded-xl cursor-pointer transition-colors duration-200 ${darkMode ? "bg-dark-primary text-white hover:bg-dark-focus" : "bg-light-secondary text-white hover:bg-light-focus"}`}>
                        {ifcFile ? ifcFile.name : 'Upload IFC File'}
                        <input type="file" accept=".ifc" className="hidden" onChange={handleIfcFileChange} />
                      </label>
                    </div>
                  </>
                )}
                {currentStep === 2 && (
                  <MaterialDataTable rows={materials} setRows={setMaterials} expandedRows={expandedRows} setExpandedRows={setExpandedRows} darkMode={darkMode}/>
                )}
                {currentStep === 3 && (
                  <div className="w-full bg-gray-700 rounded-lg p-4 flex items-center gap-4">
                    {coverImagePreview && (
                      <Image src={coverImagePreview} alt="Cover Preview" width={80} height={80} className="rounded-md object-cover flex-shrink-0" />
                    )}
                    <div className="flex-grow overflow-hidden">
                      <h5 className="font-bold text-lg truncate">{modelName || "No Name"}</h5>
                      <p className="text-sm text-gray-300 truncate">IFC: {ifcFile?.name || "Not uploaded"}</p>
                      <div className="mt-2">
                        {isUploading ? (
                          <>
                            <div className="w-full bg-gray-600 rounded-full h-2.5">
                              <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{uploadStatus} {Math.round(uploadProgress)}%</p>
                          </>
                        ) : (
                          <p className="text-sm">
                            Status: 
                            <span className={uploadStatus === 'Success' ? 'text-green-400' : uploadStatus === 'Failed' ? 'text-red-400' : 'text-gray-400'}>
                              {uploadStatus || 'Ready'}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center p-2 border-t border-divider">
                <div>
                  {currentStep > 1 && !isUploading && (
                    <Button className="bg-dark-primary" onPress={handlePreviousStep}>Previous Step</Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {/* <Button className="bg-dark-danger" onPress={onClose}>Close</Button> */}
                  <Button className="bg-dark-primary" onPress={handleProceed} isDisabled={isUploading}>
                    {currentStep === 1 ? 'Next Step' : currentStep === 2 ? 'Upload' : 'Finish'}
                  </Button>
                </div>
              </div>
            </div>
            <div className="w-full max-w-5/6">
              <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                <HorizontalSteps currentStep={currentStep} steps={steps} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CO2ViewerContainer;