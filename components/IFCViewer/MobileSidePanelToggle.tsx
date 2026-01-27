"use client";

import React, { useState } from 'react';
import { Home, Layers, LayoutList, ChevronLeft, Search } from 'lucide-react';

type PanelType = 'home' | 'search' | 'floor' | 'assets';

interface MobileSidePanelToggleProps {
  selectedPanel: PanelType;
  onPanelSelect: (panel: PanelType) => void;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
}

const panelIcons: { [key in PanelType]: React.ReactNode } = {
  home: <Home size={32} />,
  search:<Search size={32}/>,
  floor: <Layers size={32} />,
  assets: <LayoutList size={32} />,
};

const MobileSidePanelToggle: React.FC<MobileSidePanelToggleProps> = ({
  selectedPanel,
  onPanelSelect,
  onTogglePanel,
  isPanelOpen,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSelect = (panel: PanelType) => {
    onPanelSelect(panel);
    setIsMenuOpen(false);
  };

  return (
    <div className="absolute top-2 right-2 z-20" style={{ top: 'calc(64px + 16px)' }}>
      <div className="flex items-center rounded-md border border-gray-600">
        {!isPanelOpen && (
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="bg-gray-800/50 text-white p-2 backdrop-blur-sm hover:bg-gray-700/70 border-r border-gray-600"
            >
              {panelIcons[selectedPanel]}
            </button>
            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-2 bg-gray-800/80 rounded-md backdrop-blur-sm flex flex-col border border-gray-600 z-30">
                <button onClick={() => handleSelect('home')} className="p-2 text-white hover:bg-gray-700">{panelIcons.home}</button>
                <button onClick={() => handleSelect('search')} className="p-2 text-white hover:bg-gray-700">{panelIcons.search}</button>
                <button onClick={() => handleSelect('floor')} className="p-2 text-white hover:bg-gray-700">{panelIcons.floor}</button>
                <button onClick={() => handleSelect('assets')} className="p-2 text-white hover:bg-gray-700">{panelIcons.assets}</button>
              </div>
            )}
          </div>
        )}
        <button
          onClick={onTogglePanel}
          className="bg-gray-800/50 text-white p-2 backdrop-blur-sm transition-transform duration-300 hover:bg-gray-700/70"
          style={{ transform: isPanelOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <ChevronLeft size={32} />
        </button>
      </div>
    </div>
  );
};

export default MobileSidePanelToggle;