"use client";

import React, { useRef, useState } from "react";
import * as OBC from "@thatopen/components";

interface ViewOrientationProps {
  components: OBC.Components;
  fragments: OBC.FragmentsManager;
  world: OBC.World;
}

const ViewOrientation: React.FC<ViewOrientationProps> = ({ world, components }) => {
  const cubeRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: -20, y: 20 });
  const [hoverFace, setHoverFace] = useState<string | null>(null);
  const dragState = useRef({ dragging: false, lastX: 0, lastY: 0 });

  const viewFromOrientation = async (
    orientation: "front" | "back" | "left" | "right" | "top" | "bottom"
  ) => {
    const boxer = components.get(OBC.BoundingBoxer);
    if (!world.camera.hasCameraControls()) return;
    const { position, target } = await boxer.getCameraOrientation(orientation);
    await world.camera.controls.setLookAt(
      position.x,
      position.y,
      position.z,
      target.x,
      target.y,
      target.z,
      true
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    dragState.current.dragging = true;
    dragState.current.lastX = e.clientX;
    dragState.current.lastY = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current.dragging) return;
    const deltaX = e.clientX - dragState.current.lastX;
    const deltaY = e.clientY - dragState.current.lastY;
    dragState.current.lastX = e.clientX;
    dragState.current.lastY = e.clientY;

    setRotation((prev) => ({
      x: prev.x + deltaY * 2,
      y: prev.y + deltaX * 2,
    }));
  };

  const handleMouseUp = () => {
    dragState.current.dragging = false;
  };

  const faceClasses = (bgColor: string, face: string) =>
    `absolute w-15 h-15 border border-gray-700 flex justify-center items-center cursor-pointer select-none transition-opacity duration-200 ${
      hoverFace === face ? "opacity-75" : "opacity-100"
    } ${bgColor}`;

  return (
    <div className="absolute left-4 bottom-5 w-15 h-15 perspective-[200px]">
      <div
        ref={cubeRef}
        className="w-full h-full relative [transform-style:preserve-3d]"
        style={{ transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseUp}
        onMouseUp={handleMouseUp}
      >
        {/* Front */}
        <div
          className={faceClasses("bg-red-500", "front")}
          style={{ transform: "rotateY(0deg) translateZ(30px)" }}
          onClick={() => viewFromOrientation("front")}
          onMouseEnter={() => setHoverFace("front")}
          onMouseLeave={() => setHoverFace(null)}
        >
          Front
        </div>

        {/* Back */}
        <div
          className={faceClasses("bg-green-500", "back")}
          style={{ transform: "rotateY(180deg) translateZ(30px)" }}
          onClick={() => viewFromOrientation("back")}
          onMouseEnter={() => setHoverFace("back")}
          onMouseLeave={() => setHoverFace(null)}
        >
          Back
        </div>

        {/* Left */}
        <div
          className={faceClasses("bg-blue-500", "left")}
          style={{ transform: "rotateY(-90deg) translateZ(30px)" }}
          onClick={() => viewFromOrientation("left")}
          onMouseEnter={() => setHoverFace("left")}
          onMouseLeave={() => setHoverFace(null)}
        >
          Left
        </div>

        {/* Right */}
        <div
          className={faceClasses("bg-yellow-400", "right")}
          style={{ transform: "rotateY(90deg) translateZ(30px)" }}
          onClick={() => viewFromOrientation("right")}
          onMouseEnter={() => setHoverFace("right")}
          onMouseLeave={() => setHoverFace(null)}
        >
          Right
        </div>

        {/* Top */}
        <div
          className={faceClasses("bg-cyan-400", "top")}
          style={{ transform: "rotateX(90deg) translateZ(30px)" }}
          onClick={() => viewFromOrientation("top")}
          onMouseEnter={() => setHoverFace("top")}
          onMouseLeave={() => setHoverFace(null)}
        >
          Top
        </div>

        {/* Bottom */}
        <div
          className={faceClasses("bg-pink-400", "bottom")}
          style={{ transform: "rotateX(-90deg) translateZ(30px)" }}
          onClick={() => viewFromOrientation("bottom")}
          onMouseEnter={() => setHoverFace("bottom")}
          onMouseLeave={() => setHoverFace(null)}
        >
          Bottom
        </div>
      </div>
    </div>
  );
};

export default ViewOrientation;
