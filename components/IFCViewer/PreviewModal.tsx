"use client";

import React, { useEffect, useRef, useState } from "react";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as THREE from "three";
import LoadingModal from "./LoadingModal";

// Duplicating types here to avoid circular dependencies, or we can move them to a types file.
interface UploadedFile {
  id: string;
  file: File;
  status: "converting" | "uploading" | "success" | "failed" | "pending";
  progress?: number;
  fragmentData?: ArrayBuffer;
}

interface HistoryEntry {
  _id: string;
  originalFileName: string;
  r2FileName: string;
  status: string;
  uploadedAt: string;
}

interface PreviewModalProps {
  darkMode: boolean;
  item: UploadedFile | HistoryEntry | null;
  onClose: () => void;
}

export default function PreviewModal({ darkMode, item, onClose }: PreviewModalProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!item || !viewerRef.current) return;

    const components = new OBC.Components();
    const viewerContainer = viewerRef.current;
    let progressInterval: NodeJS.Timeout;

    const init = async () => {
      setIsLoading(true);
      setProgress(0);

      let simulatedProgress = 0;
      progressInterval = setInterval(() => {
        simulatedProgress += Math.random() * 7;
        if (simulatedProgress >= 95) {
            // Don't complete until model is loaded
        } else {
            setProgress(Math.floor(simulatedProgress));
        }
      }, 200);

      let fragmentData: ArrayBuffer | undefined;

      try {
        if ("r2FileName" in item) { // HistoryEntry
          const downloadResponse = await fetch('/api/element-manager/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ r2FileName: item.r2FileName }),
          });

          if (!downloadResponse.ok) throw new Error('Failed to get signed URL.');
          const { signedUrl } = await downloadResponse.json();
          
          const modelResponse = await fetch(signedUrl);
          if (!modelResponse.ok) throw new Error('Failed to download model from R2.');
          fragmentData = await modelResponse.arrayBuffer();

        } else if (item.fragmentData) { // UploadedFile
          fragmentData = item.fragmentData;
        }

        if (!fragmentData) {
            throw new Error("No fragment data available for preview.");
        }

        const worlds = components.get(OBC.Worlds);
        const world = worlds.create();
        
        const scene = new OBC.SimpleScene(components);
        world.scene = scene;
        scene.setup();
        scene.three.background = null;

        const renderer = new OBCF.PostproductionRenderer(components, viewerContainer);
        world.renderer = renderer;

        const camera = new OBC.OrthoPerspectiveCamera(components);
        world.camera = camera;
        await camera.controls.setLookAt(10, 10, 10, 0, 0, 0);
        
        const githubUrl = "https://thatopen.github.io/engine_fragment/resources/worker.mjs";
        const fetchedUrl = await fetch(githubUrl);
        const workerBlob = await fetchedUrl.blob();
        const workerFile = new File([workerBlob], "worker.mjs", { type: "text/javascript" });
        const workerUrl = URL.createObjectURL(workerFile);

        const fragments = components.get(OBC.FragmentsManager);
        fragments.init(workerUrl);

        await components.init();
        camera.updateAspect();

        const grid = components.get(OBC.Grids).create(world);
        grid.material.uniforms.uColor.value = new THREE.Color(darkMode ? 0x444444 : 0x888888);
        grid.material.uniforms.uSize1.value = 1;
        grid.material.uniforms.uSize2.value = 10;

        const modelId = `preview-${Date.now()}`;
        const model = await fragments.core.load(fragmentData, { modelId });
        world.scene.three.add(model.object);
        model.useCamera(camera.three);
        fragments.list.set(modelId, model);

        camera.controls.addEventListener("update", () => fragments.core.update(true));
        
        setTimeout(() => {
          camera.fitToItems();
        }, 50);

        return () => {
          URL.revokeObjectURL(workerUrl);
        }
      } catch (error) {
        console.error("Error during preview initialization:", error);
        // Optionally, show an error message in the modal
      } finally {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
            setIsLoading(false)
        }, 500);
      }
    };

    let cleanup: (() => void) | undefined;
    init().then(returnedCleanup => {
      cleanup = returnedCleanup;
    });

    return () => {
      if (cleanup) cleanup();
      if (progressInterval) clearInterval(progressInterval);
      components.dispose();
    };
  }, [item, darkMode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
      <div className={`relative w-3/4 h-3/4 rounded-lg shadow-lg ${darkMode ? "bg-gray-800" : "bg-white"}`} onClick={(e) => e.stopPropagation()}>
        <LoadingModal darkMode={darkMode} progress={progress} show={isLoading} />
        <button onClick={onClose} className="z-50 absolute top-2 right-2 text-2xl font-bold">&times;</button>
        <div ref={viewerRef} className="w-full h-full rounded-lg"></div>
      </div>
    </div>
  );
}