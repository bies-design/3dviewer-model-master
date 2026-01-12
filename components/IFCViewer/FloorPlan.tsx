"use client";

import React, { useEffect, useRef, useState } from "react";
import * as OBC from "@thatopen/components";
import { Button } from "@heroui/react";
interface FloorPlanProps {
  // components: OBC.Components;
  // world: OBC.World;
  onSelectFloor: (floor: number) => void;
}

const FloorPlan: React.FC<FloorPlanProps> = ({ onSelectFloor }) => {
  const [activeFloor, setActiveFloor] = useState<number | null>(null);
  const floors = Array.from({ length: 12 }, (_, i) => i + 2); // 2 to 13

  const handleSelectFloor = (floor: number) => {
    setActiveFloor(floor);
    onSelectFloor(floor);
  };

  return (
    <div className="flex flex-col p-4">
      <h3 className="text-lg font-bold mb-2">Floor Plans</h3>
      <div className="flex flex-col gap-2">
        {floors.map((floor) => (
          <Button
            key={floor}
            onClick={() => handleSelectFloor(floor)}
            color={activeFloor === floor ? "primary" : "default"}
            size="sm"
          >
            {`${floor}F`}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default FloorPlan;
