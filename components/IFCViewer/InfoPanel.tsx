import React, { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import * as OBC from "@thatopen/components";
import QRCode from 'qrcode';
import Link from "next/link";
import { useAppContext } from "@/contexts/AppContext";

interface Props {
  components: OBC.Components;
  darkMode: boolean;
  infoLoading: boolean;
  modelId: string | null;
  localId: number | null;
  attrs: Record<string, any>;
  psets: Record<string, Record<string, any>>;
  rawPsets: any[];
  onClose: () => void;
  qrCodeData: { url:string; name: string; modelId: string; expressId: number }[]; // Updated type to include modelId and expressId
  isMultiSelectActive: boolean;
}

export default function IFCInfoPanel({
  components,
  darkMode,
  infoLoading, // Use directly, no initialInfoLoading
  modelId,
  localId,
  attrs, // Use directly, no initialAttrs
  psets, // Use directly, no initialPsets
  rawPsets,
  onClose,
  qrCodeData,
  isMultiSelectActive,
}: Props) {
  const { t } = useTranslation();
  const { setToast } = useAppContext();
  const [isClient, setIsClient] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [qrCodeImages, setQrCodeImages] = useState<string[]>([]);
  const [selectedQrCodes, setSelectedQrCodes] = useState<boolean[]>([]);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [isAttributesCollapsed, setIsAttributesCollapsed] = useState(false);
  const [isRawPsetsCollapsed, setIsRawPsetsCollapsed] = useState(true);

  // New states for Link Data
  const [linkedData, setLinkedData] = useState<any[]>([]);
  const [linkedDataLoading, setLinkedDataLoading] = useState(false);
  // const [selectedLinkedItem, setSelectedLinkedItem] = useState<any | null>(null); 
  const [categorizedData, setCategorizedData] = useState<{ models: any[], drawings: any[], documents: any[] }>({ models: [], drawings: [], documents: [] });
  const [isModelsCollapsed, setIsModelsCollapsed] = useState(false);
  const [isDrawingsCollapsed, setIsDrawingsCollapsed] = useState(false);
  const [isDocumentsCollapsed, setIsDocumentsCollapsed] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const generateQrCodes = async () => {
      if (qrCodeData.length > 0) {
        const images: string[] = [];
        for (const qr of qrCodeData) {
          try {
            const dataUrl = await QRCode.toDataURL(qr.url, {
              width: 200,
              margin: 1,
              color: {
                dark: "#000000",
                light: darkMode ? "#FFFFFF" : "#E5E7EB",
              },
            });
            images.push(dataUrl);
          } catch (error) {
            console.error("Error generating QR Code PNG:", error);
            images.push("");
          }
        }
        setQrCodeImages(images);
        setSelectedQrCodes(new Array(images.length).fill(false));
        setShowExportOptions(false);
      } else {
        setQrCodeImages([]);
        setSelectedQrCodes([]);
        setShowExportOptions(false);
      }
    };
    generateQrCodes();
  }, [qrCodeData, darkMode]);

  // Effect to fetch linked data when element name changes
  useEffect(() => {
    const fetchLinkedData = async () => {
      if (attrs.Name?.value) {
        setLinkedDataLoading(true);
        // setSelectedLinkedItem(null);
        // setPreviewUrl(null); // This state is removed
        setLinkedData([]);
        try {
          const response = await fetch(`/api/link-data?elementName=${attrs.Name.value}`);
          if (response.ok) {
            const data = await response.json();
            setLinkedData(data);
            // Categorize data
            const models = data.filter((item: any) => item.category === '3dmodels');
            const drawings = data.filter((item: any) => item.category === 'drawings');
            const documents = data.filter((item: any) => item.category === 'documents');

            setCategorizedData({ models, drawings, documents });
          } else {
            console.error("Failed to fetch linked data");
            setLinkedData([]);
            setCategorizedData({ models: [], drawings: [], documents: [] });
          }
        } catch (error) {
          console.error("Error fetching linked data:", error);
          setLinkedData([]);
          setCategorizedData({ models: [], drawings: [], documents: [] });
        } finally {
          setLinkedDataLoading(false);
        }
      } else {
        setLinkedData([]);
        setCategorizedData({ models: [], drawings: [], documents: [] });
        // setSelectedLinkedItem(null);
        // setPreviewUrl(null); // This state is removed
      }
    };

    fetchLinkedData();
  }, [attrs.Name]);

  const handleDirectPreview = async (r2FileName: string) => {
    try {
      const response = await fetch('/api/element-manager/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r2FileName }),
      });
      if (response.ok) {
        const { signedUrl } = await response.json();
        window.open(signedUrl, '_blank');
      } else {
        console.error("Failed to get signed URL");
        setToast({ message: "Could not open file preview.", type: "error" });
      }
    } catch (error) {
      console.error("Error fetching signed URL:", error);
      setToast({ message: "An error occurred while trying to open the file.", type: "error" });
    }
  };

  const handlePrintQrCodes = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write('<html><head><title>Print QR Codes</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
          body { font-family: sans-serif; margin: 20px; }
          .qr-code-container {
            display: inline-block;
            margin: 10px;
            border: 1px solid #ccc;
            padding: 10px;
            text-align: center;
          }
          .qr-code-name {
            font-size: 12px;
            font-weight: bold;
            margin-top: 5px;
          }
          @media print {
            .qr-code-container {
              page-break-inside: avoid;
            }
          }
        `);
        printWindow.document.write('</style></head><body>');
        
        qrCodeImages.forEach((dataUrl, index) => {
          if (dataUrl) {
            printWindow.document.write(`
              <div class="qr-code-container">
                <img src="${dataUrl}" alt="QR Code for ${qrCodeData[index].name}" width="150" height="150" />
                <div class="qr-code-name">${qrCodeData[index].name}</div>
              </div>
            `);
          }
        });
        
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleExportButtonClick = () => {
    setShowExportOptions(true);
  };

  const handleToggleSelectAll = () => {
    const allSelected = selectedQrCodes.every(Boolean);
    setSelectedQrCodes(new Array(qrCodeImages.length).fill(!allSelected));
  };

  const handleToggleQrCode = (index: number) => {
    setSelectedQrCodes((prev) => {
      const newSelection = [...prev];
      newSelection[index] = !newSelection[index];
      return newSelection;
    });
  };

  const filteredAttrs = Object.fromEntries(
    Object.entries(attrs).filter(
      ([key, val]) =>
        !["_guid", "_localId", "ObjectType"].includes(key) &&
        (key.toLowerCase().includes(searchText.toLowerCase()) ||
          String(val?.value ?? "").toLowerCase().includes(searchText.toLowerCase()))
    )
  );

  const filteredPsets = Object.fromEntries(
    Object.entries(psets)
      .map(([psetName, props]) => [
        psetName,
        Object.fromEntries(
          Object.entries(props).filter(
            ([propKey, value]) =>
              propKey.toLowerCase().includes(searchText.toLowerCase()) ||
              String(value).toLowerCase().includes(searchText.toLowerCase())
          )
        )
      ])
      .filter(([_, props]) => Object.keys(props).length > 0)
  );

  return (
    <>
      <div className="flex flex-col h-full p-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
        <h3 className="text-2xl font-semibold">{isClient ? t("element_info") : "Element Info"}</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-zinc-400" aria-label="Close info panel">
          <X size={18} />
        </button>
      </div>

      <div className="text-l opacity-80 mb-3">
        {!isMultiSelectActive && modelId ? `${isClient ? t("model") : "Model: "}${modelId}` : ""}
        {isMultiSelectActive && qrCodeData.length > 0 ? `${isClient ? t("model") : "Model: "}${qrCodeData[0].modelId}` : ""}
        <br />
        {/* {!isMultiSelectActive && localId !== null ? `${isClient ? t("local_id") : " Local ID: "}${localId}` : ""}
        {isMultiSelectActive && qrCodeData.length > 0 ? `${isClient ? t("local_id") : " Local ID: "}${qrCodeData[0].expressId}` : ""} */}
      </div>


      {/* Search Bar */}
      {/* <input
        type="text"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        placeholder={isClient ? t("search_attributes_property_sets") : "Search attributes & property sets..."}
        className={`mb-3 p-2 rounded w-full border ${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-gray-100 text-gray-900 border-gray-300"}`}
      /> */}

      {infoLoading ? (
        <div className="text-sm opacity-70">{isClient ? t("loading", { progress: '' }) : "Loading…"}</div>
      ) : (
        <>
          <button
            className="font-semibold mb-1 w-full flex justify-between items-center"
            onClick={() => setIsAttributesCollapsed(!isAttributesCollapsed)}
          >
            <span>{isClient ? t("attributes") : "Attributes"}</span>
            {isAttributesCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          {!isAttributesCollapsed && (
            <>
              {Object.keys(filteredAttrs).length > 0 ? (
                <div className={`text-xs ${darkMode ? "bg-gray-800" : "bg-gray-100"} rounded p-2 mb-4`}>
                  <ul className="space-y-1">
                    {Object.entries(filteredAttrs).map(([key, val]) => {
                      const displayKey = key === '_category' ? 'Category' : key;
                      return (
                        <li key={key} className="flex items-center justify-between border-b border-gray-600/30 py-1">
                          <span className="font-semibold text-base">{displayKey}</span>
                          <span>{String(val?.value ?? "")}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="text-sm opacity-60 mb-4">{isClient ? t("no_attributes_found") : "No attributes found."}</div>
              )}
            </>
          )}

{/*
          <h4 className="font-semibold mb-1">{isClient ? t("property_sets") : "Property Sets"}</h4>
          {Object.keys(filteredPsets).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(filteredPsets).map(([pset, props]) => (
                <div key={pset} className="mb-2">
                  <div className="font-medium mb-1">{pset}</div>
                  <ul className={`text-xs ${darkMode ? "bg-gray-800" : "bg-gray-100"} rounded p-2 space-y-1`}>
                    {Object.entries(props as Record<string, any>).map(([propKey, value]) => (
                      <li key={propKey} className="flex justify-between border-b border-gray-600/30 pb-1">
                        <span className={`flex items-center gap-2 px-4 py-2 rounded-xl ${darkMode ? "bg-dark-success-200 hover:bg-success-100" : "bg-success-300 hover:bg-success-200"} text-white`}>{propKey}</span>
                        <span className="flex items-center px-2">{String(value)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm opacity-60">{isClient ? t("no_property_sets_found") : "No property sets found."}</div>
          )} */}

          <button
            className="font-semibold mb-1 w-full flex justify-between items-center"
            onClick={() => setIsRawPsetsCollapsed(!isRawPsetsCollapsed)}
          >
            <span>Raw Property Sets</span>
            {isRawPsetsCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
          {!isRawPsetsCollapsed && (
            <>
              {rawPsets.length > 0 ? (
                <div className={`text-xs ${darkMode ? "bg-gray-800" : "bg-gray-100"} rounded p-2 mb-4`}>
                  <ul className="space-y-1">
                    {rawPsets.flat().flatMap(pset => pset.HasProperties || []).map((prop: any, index: number) => (
                      <li key={`raw-prop-${index}`} className="flex items-center justify-between border-b border-gray-600/30 py-1">
                        <span className="font-semibold text-base">{prop.Name?.value}</span>
                        <span>{String(prop.NominalValue?.value ?? "")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-sm opacity-60">No raw property sets found.</div>
              )}
            </>
          )}

          {/* Link Data Section */}
          <div className="mt-4">
            <h4 className="font-semibold text-xl mb-2">{isClient ? t("link_data") : "Link Data"}</h4>
            {linkedDataLoading ? (
              <div className="text-sm opacity-70">{isClient ? t("loading", { progress: '' }) : "Loading…"}</div>
            ) : (
              <>
                {/* 3D Models */}
                <button
                  className="w-full flex justify-between items-center"
                  onClick={() => setIsModelsCollapsed(!isModelsCollapsed)}
                >
                  <span className="font-semibold text-md">3D Models</span>
                  {isModelsCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>
                {!isModelsCollapsed && (
                  categorizedData.models.length > 0 ? (
                    <div className={`max-h-48 overflow-y-auto text-xs p-2 rounded mb-2 ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                      <ul className="space-y-2">
                        {categorizedData.models.map((item) => (
                          <li key={item._id} className="flex justify-between items-center p-1 border-b border-gray-600/30">
                            <span className="flex-grow pr-2 truncate">{item.originalFileName.split('@')[0]}</span>
                            <Link href={`/link-data-preview/${item._id}`} passHref legacyBehavior>
                              <a target="_blank" rel="noopener noreferrer" className={`px-3 py-1 text-xs rounded flex-shrink-0 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}>
                                {t("preview_button")}
                              </a>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : <div className="text-sm opacity-60 mb-2">No 3D Models found.</div>
                )}

                {/* Drawings */}
                <button
                  className="w-full flex justify-between items-center"
                  onClick={() => setIsDrawingsCollapsed(!isDrawingsCollapsed)}
                >
                  <span className="font-semibold text-md">Drawings</span>
                  {isDrawingsCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>
                {!isDrawingsCollapsed && (
                  categorizedData.drawings.length > 0 ? (
                    <div className={`max-h-48 overflow-y-auto text-xs p-2 rounded mb-2 ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                      <ul className="space-y-2">
                        {categorizedData.drawings.map((item) => (
                          <li key={item._id} className="flex justify-between items-center p-1 border-b border-gray-600/30">
                            <span className="flex-grow pr-2 truncate">{item.originalFileName.split('@')[0]}</span>
                            {item.originalFileName.toLowerCase().endsWith('.pdf') ? (
                              <Link href={`/document-preview/${item._id}`} passHref legacyBehavior>
                                <a target="_blank" rel="noopener noreferrer" className={`px-3 py-1 text-xs rounded flex-shrink-0 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}>
                                  {t("preview_button")}
                                </a>
                              </Link>
                            ) : (
                              <button onClick={() => handleDirectPreview(item.r2FileName)} className={`px-3 py-1 text-xs rounded flex-shrink-0 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}>
                                {t("preview_button")}
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : <div className="text-sm opacity-60 mb-2">No Drawings found.</div>
                )}

                {/* Documents */}
                <button
                  className="w-full flex justify-between items-center"
                  onClick={() => setIsDocumentsCollapsed(!isDocumentsCollapsed)}
                >
                  <span className="font-semibold text-md">Documents</span>
                  {isDocumentsCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>
                {!isDocumentsCollapsed && (
                  categorizedData.documents.length > 0 ? (
                    <div className={`max-h-48 overflow-y-auto text-xs p-2 rounded ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}>
                      <ul className="space-y-2">
                        {categorizedData.documents.map((item) => (
                          <li key={item._id} className="flex justify-between items-center p-1 border-b border-gray-600/30">
                            <span className="flex-grow pr-2 truncate">{item.originalFileName.split('@')[0]}</span>
                            {item.originalFileName.toLowerCase().endsWith('.pdf') ? (
                              <Link href={`/document-preview/${item._id}`} passHref legacyBehavior>
                                <a target="_blank" rel="noopener noreferrer" className={`px-3 py-1 text-xs rounded flex-shrink-0 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}>
                                  {t("preview_button")}
                                </a>
                              </Link>
                            ) : (
                              <button onClick={() => handleDirectPreview(item.r2FileName)} className={`px-3 py-1 text-xs rounded flex-shrink-0 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}>
                                {t("preview_button")}
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : <div className="text-sm opacity-60">No Documents found.</div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* QRCodePanel Content */}
      <div className="p-4 flex flex-col">
        <h3 className="text-lg font-bold mb-2 text-center">{t("qr_code_panel")}</h3>
        {qrCodeData.length > 0 && !showExportOptions && (
          <div className="flex justify-between mb-4">
            {qrCodeData.length === 1 ? (
              <button
                onClick={() => handleExportQrCodes(true)}
                className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 flex-grow mr-2"
              >
                {t("export_qr_code")}
              </button>
            ) : (
              <button
                onClick={handleExportButtonClick}
                className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 flex-grow mr-2"
              >
                {t("export_qr_code")}
              </button>
            )}
            <button
              onClick={handlePrintQrCodes}
              className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors duration-200 flex-grow ml-2"
            >
              {t("print_qr_code")}
            </button>
          </div>
        )}

        {qrCodeData.length > 1 && showExportOptions && (
          <div className="flex justify-between mb-4">
            <button
              onClick={handleToggleSelectAll}
              className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors duration-200 flex-grow mr-2"
            >
              {selectedQrCodes.every(Boolean) ? "Deselect All" : "Select All"}
            </button>
            <button
              onClick={() => handleExportQrCodes(false)}
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 flex-grow ml-2"
              disabled={!selectedQrCodes.some(Boolean)} // Disable if no QR codes are selected
            >
              Confirm Export
            </button>
          </div>
        )}

        {qrCodeData.length > 0 ? (
          <div className="flex-grow overflow-y-auto space-y-4 p-2">
            {qrCodeData.map((qr, index) => (
              <div key={index} className="flex items-center justify-center">
                {qrCodeData.length > 1 && showExportOptions && (
                  <input
                    type="checkbox"
                    checked={selectedQrCodes[index] || false}
                    onChange={() => handleToggleQrCode(index)}
                    className="mr-2"
                  />
                )}
                <div className="flex flex-col items-center">
                  <div className={`relative p-4 rounded-lg ${darkMode ? "bg-white" : "bg-gray-200"}`}>
                    {qrCodeImages[index] ? (
                      <img src={qrCodeImages[index]} alt={`QR Code for ${qr.name}`} width={200} height={200} />
                    ) : (
                      <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-500 text-xs">
                        {t("error_generating_qr")}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 text-center text-black text-xs font-semibold py-1">
                      {qr.name}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center">{t("select_element_to_generate_qr")}</p>
        )}
      </div>
      {/* Hidden div for printing */}
      <div ref={printRef} style={{ display: 'none' }}></div>
      </div>
    </>
  );

  function handleExportQrCodes(exportSingle: boolean) {
    if (exportSingle && qrCodeData.length === 1) {
      const dataUrl = qrCodeImages[0];
      if (dataUrl) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `qrcode_${qrCodeData[0].name}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      selectedQrCodes.forEach((isSelected, index) => {
        if (isSelected && qrCodeImages[index]) {
          const dataUrl = qrCodeImages[index];
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `qrcode_${qrCodeData[index].name}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      });
    }
    setShowExportOptions(false); // Hide options after export
  }
}
