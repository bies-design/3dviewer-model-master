"use client";

import React from "react";
import { Listbox, ListboxItem } from "@heroui/react";

const AssetsPanel: React.FC = () => {
  const assets = [
    { id: "1", name: "Asset 1" },
    { id: "2", name: "Asset 2" },
    { id: "3", name: "Asset 3" },
  ];

  return (
    <div className="flex flex-col p-4">
      <h3 className="text-lg font-bold mb-2">Assets</h3>
      <Listbox aria-label="Assets list">
        {assets.map((asset) => (
          <ListboxItem key={asset.id}>{asset.name}</ListboxItem>
        ))}
      </Listbox>
    </div>
  );
};

export default AssetsPanel;
