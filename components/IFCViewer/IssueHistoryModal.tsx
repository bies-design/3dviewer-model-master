"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const isEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (let v of a) if (!b.has(v)) return false;
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => isEqual(v, b[i]));
  }
  if (typeof a === 'object' && a && typeof b === 'object' && b) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (let key of keysA) {
      if (!keysB.includes(key) || !isEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
};

const IssueHistoryModal = ({ onClose, history, darkMode }: any) => {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatValue = (val: any) => {
    if (val instanceof Set) return Array.from(val).join(", ");
    if (Array.isArray(val)) return val.join(", ");
    if (val === null || val === undefined || val === "") return "—";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  };

  return (
    <div
      className="fixed inset-0 bg-opacity-50 backdrop-blur-sm flex justify-center items-center z-50"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className={`${darkMode ? "bg-gray-800 text-white" : "bg-zinc-50 text-black"} p-4 rounded-xl shadow-lg w-1/2 max-h-[80vh] overflow-y-auto`}
      >
        <h3 className="text-lg font-bold mb-4">{isClient ? t("history") : "History"}</h3>

        {history.length === 0 ? (
          <p className="text-gray-400">{isClient ? t("no_history") : "No history available for this issue."}</p>
        ) : (
          <ul className="space-y-4">
            {history.map((record: any, idx: number) => {
              return (
                <li
                  key={idx}
                  className={`p-3 rounded border ${
                    darkMode ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      {isClient ? t("edited_by") : "Edited by"} <span className="font-bold">{record.authorInfo?.username || record.userId}</span>
                    </span>
                    <span className="text-xs text-gray-400">{new Date(record.timestamp).toLocaleString()}</span>
                  </div>

                  {Object.keys(record.changes).length === 0 ? (
                    <p className="text-xs text-gray-400">{isClient ? t("no_changes_detected") : "No changes detected."}</p>
                  ) : (
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left p-1 border-b">{isClient ? t("field") : "Field"}</th>
                          <th className="text-left p-1 border-b">{isClient ? t("before") : "Before"}</th>
                          <th className="text-left p-1 border-b">{isClient ? t("after") : "After"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(record.changes).map(([key, change]: [string, any]) => (
                          <tr key={key}>
                            <td className="p-1 font-semibold">{key}</td>
                            <td className="p-1 text-custom-gomorered-400">{formatValue(change.oldValue)}</td>
                            <td className="p-1 text-success-400">{formatValue(change.newValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            {isClient ? t("close") : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssueHistoryModal;