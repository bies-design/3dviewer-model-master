"use client";

import React, { useEffect, useRef, useState, MutableRefObject } from "react";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as THREE from "three";
import LoadingModal from "./LoadingModal";
import { R2Model } from "./R2ModelHistoryPanel"; // Import R2Model

interface R2ModelPreviewModalProps {
  darkMode: boolean;
  model: R2Model | null;
  onClose: () => void;
}

export default function R2ModelPreviewModal({ darkMode, model, onClose }: R2ModelPreviewModalProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!model || !viewerRef.current) return;

    const viewerContainer = viewerRef.current;
    let progressInterval: NodeJS.Timeout;
    let components: OBC.Components;
    let world: OBC.World;
    let fragments: OBC.FragmentsManager;
    let workerUrl: string;

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
        if (model.r2FileName) { // R2Model
          const downloadResponse = await fetch('/api/models/r2-upload/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: model.r2FileName }),
          });

          if (!downloadResponse.ok) throw new Error('Failed to get signed URL.');
          const { signedUrl } = await downloadResponse.json();
          
          const modelResponse = await fetch(signedUrl);
          if (!modelResponse.ok) throw new Error('Failed to download model from R2.');
          fragmentData = await modelResponse.arrayBuffer();
        }

        if (!fragmentData) {
            throw new Error("No fragment data available for preview.");
        }

        components = new OBC.Components();
        const worlds = components.get(OBC.Worlds);
        world = worlds.create();
        
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
        workerUrl = URL.createObjectURL(workerFile);

        fragments = components.get(OBC.FragmentsManager);
        fragments.init(workerUrl);

        await components.init();
        camera.updateAspect();

        const grid = components.get(OBC.Grids).create(world);
        grid.material.uniforms.uColor.value = new THREE.Color(darkMode ? 0x444444 : 0x888888);

        const modelId = `preview-${Date.now()}`;
        const loadedModel = await fragments.core.load(fragmentData, { modelId });
        world.scene.three.add(loadedModel.object);
        loadedModel.useCamera(camera.three);
        fragments.list.set(modelId, loadedModel);

        camera.controls.addEventListener("update", () => fragments.core.update(true));
        
        setTimeout(() => {
          camera.fitToItems();
        }, 200);

      } catch (error) {
        console.error("Error during preview initialization:", error);
        // Optionally, show an error message in the modal
      } finally {
        clearInterval(progressInterval);
        setProgress(100);
        setTimeout(() => {
            setIsLoading(false)
        }, 1200);
      }
    };

    init();

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      if (components) {
        components.dispose();
      }
      if (workerUrl) {
        URL.revokeObjectURL(workerUrl);
      }
    };
  }, [model, darkMode]);

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