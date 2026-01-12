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
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (let key of keys) {
      if (!isEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
};

const getDiff = (before: any, after: any) => {
  const diffs: { key: string; before: any; after: any }[] = [];
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  keys.forEach((key) => {
    if (!isEqual(before?.[key], after?.[key])) {
      diffs.push({ key, before: before?.[key], after: after?.[key] });
    }
  });

  return diffs;
};

const ElementHistoryModal = ({ onClose, history, darkMode }: any) => {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatValue = (val: any) => {
    if (val instanceof Set) return Array.from(val).join(", ");
    if (Array.isArray(val)) return val.join(", ");
    if (val === null || val === undefined || val === "") return "—";
    if (typeof val === "object" && val !== null) {
      // If it's a MaterialRow-like object, display its key properties
      if (val && typeof val.material === 'string' && typeof val.co2eM2 === 'number') {
        return `{ material: ${val.material}, co2eM2: ${val.co2eM2} }`;
      }
      return JSON.stringify(val, null, 2); // Pretty print JSON
    }
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
          <p className="text-gray-400">{isClient ? t("no_history") : "No history available for this element."}</p>
        ) : (
          <ul className="space-y-4">
            {history.map((record: any, idx: number) => {
              const diffs = getDiff(record.changes, {});
              return (
                <li
                  key={idx}
                  className={`p-3 rounded border ${
                    darkMode ? "border-gray-600 bg-gray-700" : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      {isClient ? t("edited_by") : "Edited by"} <span className="font-bold">{record.user}</span>
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

export default ElementHistoryModal;
