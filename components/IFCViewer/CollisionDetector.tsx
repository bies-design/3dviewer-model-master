"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import * as THREE from "three";
import * as FRAGS from "@thatopen/fragments";
import { MeshBVH, MeshBVHHelper } from "three-mesh-bvh";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";

interface CollisionDetectorProps {
  isOpen: boolean;
  onClose: () => void;
  components: OBC.Components;
  world: OBC.World;
  darkMode: boolean;
  categories: string[];
}

type CollisionResult = {
  item1: ItemWithBox;
  item2: ItemWithBox;
  intersectionEdges?: Float32Array;
};

type ItemWithBox = { modelId: string; itemId: string; box: THREE.Box3 };
type Group = { [modelId: string]: Set<string> };
type SelectedCategory = { name: string; count: number };

const CollisionDetector: React.FC<CollisionDetectorProps> = ({ isOpen, onClose, components, world, darkMode, categories }) => {
  const { t } = useTranslation();
  const [isClient, setIsClient] = useState(false);
  const [results, setResults] = useState<CollisionResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [itemsProcessed, setItemsProcessed] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [groupA, setGroupA] = useState<Group>({});
  const [groupB, setGroupB] = useState<Group>({});
  const [selectedCategoriesA, setSelectedCategoriesA] = useState<SelectedCategory[]>([]);
  const [selectedCategoriesB, setSelectedCategoriesB] = useState<SelectedCategory[]>([]);
  const boxerRef = useRef<OBC.BoundingBoxer | null>(null);
  const selectARef = useRef<HTMLSelectElement>(null);
  const selectBRef = useRef<HTMLSelectElement>(null);
  const boundingBoxHelpers = useRef<THREE.Object3D[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (components) {
      boxerRef.current = components.get(OBC.BoundingBoxer);
    }
  }, [components]);

  const cleanupHelpers = () => {
    const highlighter = components.get(OBCF.Highlighter);
    highlighter.clear();
    for (const helper of boundingBoxHelpers.current) {
      world.scene.three.remove(helper);
      if (helper instanceof THREE.Mesh || helper instanceof THREE.LineSegments || helper instanceof Line2) {
        helper.geometry.dispose();
        const material = helper.material as THREE.Material | THREE.Material[];
        if (Array.isArray(material)) {
          material.forEach(m => m.dispose());
        } else {
          material.dispose();
        }
      } else if (helper instanceof THREE.Box3Helper) {
        helper.dispose();
      }
    }
    boundingBoxHelpers.current = [];
  };

  const getGroupItemCount = (group: Group) => {
    return Object.values(group).reduce((count, ids) => count + ids.size, 0);
  };

  const handleAddSelectionToGroup = async (
    groupSetter: React.Dispatch<React.SetStateAction<Group>>,
    catSetter: React.Dispatch<React.SetStateAction<SelectedCategory[]>>
  ) => {
    const highlighter = components.get(OBCF.Highlighter) as OBCF.Highlighter;
    if (!highlighter) return;

    const selection = highlighter.selection.select;
    if (Object.keys(selection).length === 0) {
      setStatus(t("no_items_selected"));
      await new Promise(resolve => setTimeout(resolve, 2000));
      return;
    }
    
    const selectionCount = Object.values(selection).reduce((acc, set) => acc + set.size, 0);

    groupSetter(prevGroup => {
      const newGroup = { ...prevGroup };
      for (const modelId in selection) {
        if (!newGroup[modelId]) {
          newGroup[modelId] = new Set();
        }
        for (const id of selection[modelId]) {
          newGroup[modelId].add(id.toString());
        }
      }
      return newGroup;
    });
    
    catSetter(prev => [...prev, { name: `Selection`, count: selectionCount }])

    await highlighter.clear("select");
  };

  const handleAddCategoryToGroup = async (
    category: string, 
    groupSetter: React.Dispatch<React.SetStateAction<Group>>,
    catSetter: React.Dispatch<React.SetStateAction<SelectedCategory[]>>
  ) => {
    if (!category) return;
    const fragments = components.get(OBC.FragmentsManager);

    setStatus(t("adding_category_to_group", { category }));
    await new Promise(resolve => setTimeout(resolve, 0));

    const newItems: Group = {};
    let itemsCount = 0;
    for (const model of fragments.list.values()) {
      const categories = await model.getItemsOfCategories([new RegExp(`^${category}$`)]);
      const ids = Object.values(categories).flat();
      if (ids.length > 0) {
        itemsCount += ids.length;
        if (!newItems[model.modelId]) {
          newItems[model.modelId] = new Set();
        }
        for (const id of ids) {
          newItems[model.modelId].add(id.toString());
        }
      }
    }

    groupSetter(prevGroup => {
      const newGroup = { ...prevGroup };
      for (const modelId in newItems) {
        if (!newGroup[modelId]) {
          newGroup[modelId] = new Set();
        }
        for (const id of newItems[modelId]) {
          newGroup[modelId].add(id);
        }
      }
      return newGroup;
    });
    
    catSetter(prev => [...prev, { name: category, count: itemsCount }]);

    setStatus(t("added_items_from_category", { count: itemsCount, category }));
    await new Promise(resolve => setTimeout(resolve, 2000));
  };

  const getItemsWithBoxes = async (group: Group): Promise<ItemWithBox[]> => {
    const boxer = boxerRef.current;
    if (!boxer) return [];

    const itemsWithBoxes: ItemWithBox[] = [];
    const groupItems: { modelId: string, itemId: string }[] = [];
    for (const modelId in group) {
      for (const itemId of group[modelId]) {
        groupItems.push({ modelId, itemId });
      }
    }

    setTotalItems(groupItems.length);
    setItemsProcessed(0);

    for (let i = 0; i < groupItems.length; i++) {
      const { modelId, itemId } = groupItems[i];
      try {
        const numericId = parseInt(itemId, 10);
        if (isNaN(numericId)) continue;

        const modelIdMap: OBC.ModelIdMap = { [modelId]: new Set([numericId]) };
        
        boxer.list.clear();
        await boxer.addFromModelIdMap(modelIdMap);
        const box = boxer.get();
        boxer.list.clear();

        if (box && !box.isEmpty()) {
          itemsWithBoxes.push({ modelId, itemId, box });
        }
      } catch (error) {
        console.warn(`Could not get bounding box for item ${itemId} in model ${modelId}.`, error);
      }
      
      const currentProgress = Math.round(((i + 1) / groupItems.length) * 100);
      setProgress(currentProgress);
      setItemsProcessed(i + 1);
      if (i % 20 === 0 || i === groupItems.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    return itemsWithBoxes;
  };

  const handleDetectCollision = async () => {
    cleanupHelpers();
    const countA = getGroupItemCount(groupA);
    const countB = getGroupItemCount(groupB);

    if (!boxerRef.current || countA === 0 || countB === 0) {
      setStatus(t("add_items_to_both_groups"));
      await new Promise(resolve => setTimeout(resolve, 2000));
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setItemsProcessed(0);
    setTotalItems(0);
    setResults([]);

    const areGroupsEqual = groupA === groupB;

    setStatus(t("getting_boxes_a"));
    await new Promise(resolve => setTimeout(resolve, 0));
    const itemsA = await getItemsWithBoxes(groupA);

    let itemsB = itemsA;
    if (!areGroupsEqual) {
      setStatus(t("getting_boxes_b"));
      await new Promise(resolve => setTimeout(resolve, 0));
      itemsB = await getItemsWithBoxes(groupB);
    }

    if (itemsA.length === 0 || itemsB.length === 0) {
      setStatus(t("could_not_get_boxes"));
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsLoading(false);
      return;
    }

    setStatus(t("comparing_items"));
    setProgress(0);
    setItemsProcessed(0);
    
    const collisions: CollisionResult[] = [];
    const foundPairs = new Set<string>();
    let comparisons = 0;
    let totalComparisons = 0;

    if (areGroupsEqual) {
      totalComparisons = itemsA.length * (itemsA.length - 1) / 2;
      setTotalItems(totalComparisons);
      for (let i = 0; i < itemsA.length; i++) {
        for (let j = i + 1; j < itemsA.length; j++) {
          const item1 = itemsA[i];
          const item2 = itemsA[j];
          if (item1.box.intersectsBox(item2.box)) {
            const model1 = components.get(OBC.FragmentsManager).list.get(item1.modelId);
            const model2 = components.get(OBC.FragmentsManager).list.get(item2.modelId);
            if (!model1 || !model2) continue;

            const [geometry1] = await model1.getItemsGeometry([parseInt(item1.itemId, 10)]);
            const [geometry2] = await model2.getItemsGeometry([parseInt(item2.itemId, 10)]);

            let intersectionDetected = false;
            for (const data1 of geometry1) {
              if (intersectionDetected) break;
              if (!data1.positions || !data1.indices) continue;
              const geom1 = new THREE.BufferGeometry();
              geom1.setAttribute("position", new THREE.BufferAttribute(data1.positions, 3));
              geom1.setIndex(Array.from(data1.indices));
              geom1.applyMatrix4(data1.transform);
              const bvh1 = new MeshBVH(geom1, { maxLeafTris: 1 });

              for (const data2 of geometry2) {
                if (intersectionDetected) break;
                if (!data2.positions || !data2.indices) continue;
                const geom2 = new THREE.BufferGeometry();
                geom2.setAttribute("position", new THREE.BufferAttribute(data2.positions, 3));
                geom2.setIndex(Array.from(data2.indices));
                geom2.applyMatrix4(data2.transform);
                const bvh2 = new MeshBVH(geom2, { maxLeafTris: 1 });

                const matrix = new THREE.Matrix4(); // Identity matrix since geometries are in world space
                const intersectionEdges: number[] = [];
                const edge = new THREE.Line3();

                bvh1.bvhcast(bvh2, matrix, {
                  intersectsTriangles: (tri1, tri2) => {
                    if (tri1.intersectsTriangle(tri2, edge)) {
                      intersectionEdges.push(edge.start.x, edge.start.y, edge.start.z, edge.end.x, edge.end.y, edge.end.z);
                    }
                    return false; // Continue checking all intersections
                  }
                });

                if (intersectionEdges.length > 0) {
                  collisions.push({ item1, item2, intersectionEdges: new Float32Array(intersectionEdges) });
                  intersectionDetected = true;
                }
              }
            }
          }
          comparisons++;
          if (comparisons % 10000 === 0 || comparisons === totalComparisons) {
            const currentProgress = totalComparisons > 0 ? Math.round((comparisons / totalComparisons) * 100) : 100;
            setProgress(currentProgress);
            setItemsProcessed(comparisons);
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      }
    } else {
      totalComparisons = itemsA.length * itemsB.length;
      setTotalItems(totalComparisons);
      for (const item1 of itemsA) {
        for (const item2 of itemsB) {
          if (item1.modelId === item2.itemId) {
            // Skip self-comparison if an item is in both groups
            continue;
          }

          if (item1.box.intersectsBox(item2.box)) {
            const model1 = components.get(OBC.FragmentsManager).list.get(item1.modelId);
            const model2 = components.get(OBC.FragmentsManager).list.get(item2.modelId);
            if (!model1 || !model2) continue;

            const [geometry1] = await model1.getItemsGeometry([parseInt(item1.itemId, 10)]);
            const [geometry2] = await model2.getItemsGeometry([parseInt(item2.itemId, 10)]);
            
            let intersectionDetected = false;
            for (const data1 of geometry1) {
              if (intersectionDetected) break;
              if (!data1.positions || !data1.indices) continue;
              const geom1 = new THREE.BufferGeometry();
              geom1.setAttribute("position", new THREE.BufferAttribute(data1.positions, 3));
              geom1.setIndex(Array.from(data1.indices));
              geom1.applyMatrix4(data1.transform);
              const bvh1 = new MeshBVH(geom1, { maxLeafTris: 1 });

              for (const data2 of geometry2) {
                if (intersectionDetected) break;
                if (!data2.positions || !data2.indices) continue;
                const geom2 = new THREE.BufferGeometry();
                geom2.setAttribute("position", new THREE.BufferAttribute(data2.positions, 3));
                geom2.setIndex(Array.from(data2.indices));
                geom2.applyMatrix4(data2.transform);
                const bvh2 = new MeshBVH(geom2, { maxLeafTris: 1 });

                const matrix = new THREE.Matrix4();
                const intersectionEdges: number[] = [];
                const edge = new THREE.Line3();

                bvh1.bvhcast(bvh2, matrix, {
                  intersectsTriangles: (tri1, tri2) => {
                    if (tri1.intersectsTriangle(tri2, edge)) {
                      intersectionEdges.push(edge.start.x, edge.start.y, edge.start.z, edge.end.x, edge.end.y, edge.end.z);
                    }
                    return false;
                  }
                });

                if (intersectionEdges.length > 0) {
                  const key1 = `${item1.modelId}-${item1.itemId}`;
                  const key2 = `${item2.modelId}-${item2.itemId}`;
                  const pairKey = [key1, key2].sort().join('|');
                  if (!foundPairs.has(pairKey)) {
                    collisions.push({ item1, item2, intersectionEdges: new Float32Array(intersectionEdges) });
                    foundPairs.add(pairKey);
                  }
                  intersectionDetected = true;
                }
              }
            }
          }
          comparisons++;
          if (comparisons % 1000 === 0 || comparisons === totalComparisons) {
            const currentProgress = totalComparisons > 0 ? Math.round((comparisons / totalComparisons) * 100) : 100;
            setProgress(currentProgress);
            setItemsProcessed(comparisons);
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      }
    }
    
    setResults(collisions);
    
    setStatus(collisions.length > 0 ? t("collisions_found", { count: collisions.length }) : t("no_collisions_found"));
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
  };

  const handleCollisionClick = async (collision: CollisionResult) => {
    const { item1, item2, intersectionEdges } = collision;
    const fragments = components.get(OBC.FragmentsManager);
    const hider = components.get(OBC.Hider);
    if (!fragments || !hider) return;

    cleanupHelpers();

    const selection: OBC.ModelIdMap = {};
    
    const id1 = parseInt(item1.itemId, 10);
    if (!selection[item1.modelId]) {
      selection[item1.modelId] = new Set();
    }
    selection[item1.modelId].add(id1);

    const id2 = parseInt(item2.itemId, 10);
    if (!selection[item2.modelId]) {
      selection[item2.modelId] = new Set();
    }
    selection[item2.modelId].add(id2);

    await hider.set(false);
    await hider.set(true, selection);
    
    const highlighter = components.get(OBCF.Highlighter);
    await highlighter.clear();

    const ghostMaterial = {
      color: new THREE.Color(0.5, 0.5, 0.5),
      opacity: 0.5,
      transparent: true,
      renderedFaces: FRAGS.RenderedFaces.ONE,
    };

    highlighter.styles.set("collision-ghost", ghostMaterial);
    await highlighter.highlightByID("collision-ghost", selection);

    if (intersectionEdges && intersectionEdges.length > 0) {
      const lineGeometry = new LineGeometry();
      lineGeometry.setPositions(intersectionEdges);

      const resolution = new THREE.Vector2();
      (world.renderer as OBCF.PostproductionRenderer).three.getDrawingBufferSize(resolution);

      const lineMaterial = new LineMaterial({
        color: 0xffff00,
        linewidth: 5, // in pixels
        resolution: resolution,
        dashed: false,
        depthTest: true, // Render on top
        opacity: 1,
      });

      const line = new Line2(lineGeometry, lineMaterial);
      line.renderOrder = 5; // Ensure it renders on top
      world.scene.three.add(line);
      boundingBoxHelpers.current.push(line);
    }

    onClose(); // Directly call onClose to close the modal without cleaning up the helpers

    await fragments.core.update(true);

    const unionBox = item1.box.clone().union(item2.box);
    const center = new THREE.Vector3();
    unionBox.getCenter(center);
    const size = new THREE.Vector3();
    unionBox.getSize(size);
    const camera = world.camera as OBC.OrthoPerspectiveCamera;
    const newPos = new THREE.Vector3(center.x + size.x, center.y + size.y, center.z + size.z);
    await camera.controls.setLookAt(newPos.x, newPos.y, newPos.z, center.x, center.y, center.z, true);       
  };

  const handleClose = () => {
    cleanupHelpers();
    onClose();
  };

  const availableCategoriesA = categories.filter(cat => !selectedCategoriesA.some(sc => sc.name === cat));
  const availableCategoriesB = categories.filter(cat => !selectedCategoriesB.some(sc => sc.name === cat));

  return (
    <div className="relative flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{isClient ? t("collision_detection") : "Collision Detection"}</h2>
          <button onClick={handleClose} className="text-2xl font-bold">&times;</button>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            {/* Group A */}
            <div className={`p-4 rounded-xl ${darkMode ? "bg-zinc-700" : "bg-zinc-300"} flex flex-col gap-2`}>
              <h3 className="font-bold">{isClient ? t("group_a") : "Group A"} ({getGroupItemCount(groupA)} {isClient ? t("items") : "items"})</h3>
              <div className="flex flex-col gap-1 text-sm">
                {selectedCategoriesA.map(sc => (
                  <div key={sc.name} className="flex justify-between">
                    <span>{sc.name}</span>
                    <span>{sc.count} {isClient ? t("items") : "items"}</span>
                  </div>
                ))}
              </div>
              <select
                ref={selectARef}
                onChange={(e) => handleAddCategoryToGroup(e.target.value, setGroupA, setSelectedCategoriesA)}
                disabled={isLoading}
                className={`w-full p-1 rounded text-sm ${darkMode ? "bg-zinc-500 text-white" : "bg-zinc-100 text-black"}`}
              >
                <option value="">{isClient ? t("add_category_to_group") : "Add category to group..."}</option>
                {availableCategoriesA.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddSelectionToGroup(setGroupA, setSelectedCategoriesA)}
                  disabled={isLoading}
                  className={`w-full px-3 py-1 rounded text-white text-sm font-semibold ${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isClient ? t("add_selection") : "Add Selection"}
                </button>
                <button
                  onClick={() => {
                    setGroupA({});
                    setSelectedCategoriesA([]);
                    if(selectARef.current) selectARef.current.selectedIndex = 0;
                  }}
                  disabled={isLoading}
                  className={`w-full px-3 py-1 rounded text-white text-sm font-semibold ${darkMode ? "bg-custom-gomorered-500 hover:bg-custom-gomorered-600" : "bg-custom-gomorered-600 hover:bg-custom-gomorered-700"} ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isClient ? t("clear") : "Clear"}
                </button>
              </div>
            </div>

            {/* Group B */}
            <div className={`p-4 rounded-xl ${darkMode ? "bg-zinc-700" : "bg-zinc-300"} flex flex-col gap-2`}>
              <h3 className="font-bold">{isClient ? t("group_b") : "Group B"} ({getGroupItemCount(groupB)} {isClient ? t("items") : "items"})</h3>
              <div className="flex flex-col gap-1 text-sm">
                {selectedCategoriesB.map(sc => (
                  <div key={sc.name} className="flex justify-between">
                    <span>{sc.name}</span>
                    <span>{sc.count} {isClient ? t("items") : "items"}</span>
                  </div>
                ))}
              </div>
              <select
                ref={selectBRef}
                onChange={(e) => handleAddCategoryToGroup(e.target.value, setGroupB, setSelectedCategoriesB)}
                disabled={isLoading}
                className={`w-full p-1 rounded text-sm ${darkMode ? "bg-zinc-500 text-white" : "bg-zinc-100 text-black"}`}
              >
                <option value="">{isClient ? t("add_category_to_group") : "Add category to group..."}</option>
                {availableCategoriesB.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddSelectionToGroup(setGroupB, setSelectedCategoriesB)}
                  disabled={isLoading}
                  className={`w-full px-3 py-1 rounded text-white text-sm font-semibold ${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isClient ? t("add_selection") : "Add Selection"}
                </button>
                <button
                  onClick={() => {
                    setGroupB({});
                    setSelectedCategoriesB([]);
                    if(selectBRef.current) selectBRef.current.selectedIndex = 0;
                  }}
                  disabled={isLoading}
                  className={`w-full px-3 py-1 rounded text-white text-sm font-semibold ${darkMode ? "bg-custom-gomorered-500 hover:bg-custom-gomorered-600" : "bg-custom-gomorered-600 hover:bg-custom-gomorered-700"} ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isClient ? t("clear") : "Clear"}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleDetectCollision}
            disabled={isLoading || getGroupItemCount(groupA) === 0 || getGroupItemCount(groupB) === 0}
            className={`w-full px-4 py-2 rounded text-white font-semibold ${darkMode ? "bg-dark-primary hover:bg-dark-focus" : "bg-light-primary hover:bg-light-focus"} ${isLoading || getGroupItemCount(groupA) === 0 || getGroupItemCount(groupB) === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isLoading ? (isClient ? t("detecting") : "Detecting...") : (isClient ? t("detect_collisions") : "Detect Collisions")}
          </button>

          {isLoading && (
            <div>
              <p className="text-sm text-center mb-1">{status}</p>
              <div className="w-full bg-gray-600 rounded-xl h-2.5">
                <div className="bg-custom-blue-500 h-2.5 rounded-xl" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="text-sm text-center mt-1">{itemsProcessed} / {totalItems}</p>
            </div>
          )}
        </div>
        {results.length > 0 && (
          <div className={`absolute left-full h-screen ml-4 w-80 p-4 z-10 rounded-lg shadow-lg border ${darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-zinc-200 border-gray-300 text-black"} h-full`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{isClient ? t("results_collisions_found", { count: results.length }) : `Results: ${results.length} collisions found.`}</h3>
              <button onClick={() => setResults([])} className="text-2xl font-bold">&times;</button>
            </div>
            <div className="overflow-y-auto max-h-60">
              {results.map((collision, index) => (
                <div 
                  key={index} 
                  className={`p-2 border-b cursor-pointer ${darkMode ? "border-gray-700 hover:bg-gray-700" : "border-gray-300 hover:bg-gray-100"}`}
                  onClick={() => handleCollisionClick(collision)}
                >
                  <p>{isClient ? t("collision_index", { index: index + 1 }) : `Collision ${index + 1}:`}</p>
                  <p className="text-sm">{isClient ? t("item_a", { itemId: collision.item1.itemId, modelId: collision.item1.modelId }) : `Item A: ${collision.item1.itemId} (Model: ${collision.item1.modelId})`}</p>
                  <p className="text-sm">{isClient ? t("item_b", { itemId: collision.item2.itemId, modelId: collision.item2.modelId }) : `Item B: ${collision.item2.itemId} (Model: ${collision.item2.modelId})`}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
  );
};

export default CollisionDetector;
