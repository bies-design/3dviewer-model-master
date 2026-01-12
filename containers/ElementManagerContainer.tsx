"use client";

import React, { useEffect, useState } from "react";
import * as OBC from "@thatopen/components";
import { useAppContext } from "@/contexts/AppContext";
import ElementManager from "@/components/IFCViewer/ElementManager";

interface Props {
  category: string;
}

export default function ElementManagerContainer({ category }: Props) {
  const { darkMode } = useAppContext();
  const [components, setComponents] = useState<OBC.Components | null>(null);

  useEffect(() => {
    const init = async () => {
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

    init();
  }, []);

  return (
    <div className="flex flex-col w-full h-dvh overflow-hidden">
      <main className="flex-grow p-6">
        {components ? (
          <ElementManager darkMode={darkMode} components={components} category={category} />
        ) : (
          <div>Loading...</div>
        )}
      </main>
    </div>
  );
}