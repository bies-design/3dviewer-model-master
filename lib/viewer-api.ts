import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { ItemData } from "@thatopen/fragments";
import { FragmentsModel } from "@thatopen/fragments";
import * as FRAGS from "@thatopen/fragments";

export class ViewerAPI {
  private components: OBC.Components | null = null;
  private highlighter: OBCF.Highlighter | null = null;
  private fragments: OBC.FragmentsManager | null = null;
  private world: OBC.World | null = null;

  init(components: OBC.Components, world: OBC.World) {
    this.components = components;
    this.world = world;
    this.highlighter = components.get(OBCF.Highlighter);
    this.fragments = components.get(OBC.FragmentsManager);
  }

  async highlightElement(elementIds: string | string[]) {
    if (!this.highlighter) return;

    const ids = Array.isArray(elementIds) ? elementIds : [elementIds];
    console.log(`API: Highlighting elements ${ids.join(", ")}`);

    const selection: OBC.ModelIdMap = {};
    for (const id of ids) {
      const [modelId, expressId] = id.split("-");
      if (!selection[modelId]) {
        selection[modelId] = new Set();
      }
      selection[modelId].add(parseInt(expressId, 10));
    }

    await this.highlighter.highlightByID("select", selection, true, true);
  }

  async zoomToElement(elementIds: string | string[]) {
    if (!this.world || !this.highlighter) return;
    const ids = Array.isArray(elementIds) ? elementIds : [elementIds];
    const selection: OBC.ModelIdMap = {};
    for (const id of ids) {
      const [modelId, expressId] = id.split("-");
      if (!selection[modelId]) {
        selection[modelId] = new Set();
      }
      selection[modelId].add(parseInt(expressId, 10));
    }
    const camera = this.world.camera as OBC.OrthoPerspectiveCamera;
    if (ids.length > 0) {
      await camera.fitToItems(selection);
    } else {
      await camera.fitToItems();
    }
  }

  async isolateElements(elementIds: string | string[]) {
    if (!this.components) return;
    const hider = this.components.get(OBC.Hider);
    const ids = Array.isArray(elementIds) ? elementIds : [elementIds];
    const selection: OBC.ModelIdMap = {};
    for (const id of ids) {
      const [modelId, expressId] = id.split("-");
      if (!selection[modelId]) {
        selection[modelId] = new Set();
      }
      selection[modelId].add(parseInt(expressId, 10));
    }
    await hider.set(false);
    await hider.set(true, selection);
  }

  async showAllElements() {
    if (!this.components) return;
    const hider = this.components.get(OBC.Hider);
    await hider.set(true);
  }

  async getAllAttributes(): Promise<Set<string>> {
    if (!this.fragments) return new Set();
    const allAttributes = new Set<string>();
    for (const model of this.fragments.list.values()) {
      const allIds = model.tiles.keys();
      for (const id of allIds) {
        const [attrs] = await model.getItemsData([id], { attributesDefault: true });
        if (attrs) {
          for (const attr in attrs) {
            allAttributes.add(attr);
          }
        }
      }
    }
    return allAttributes;
  }

  async getAllCategories(): Promise<string[]> {
    if (!this.fragments) return [];
    const allCats = new Set<string>();
    for (const model of this.fragments.list.values()) {
      const cats = await model.getItemsOfCategories([/.*/]);
      Object.keys(cats).forEach((c) => allCats.add(c));
    }
    return Array.from(allCats).sort();
  }

  async findElementsByAttribute(attribute: string, value: string, operator: "includes" | "startsWith" | "endsWith" | "equals" = "equals"): Promise<string[]> {
    if (!this.fragments) return [];
    console.log(`API: Finding elements with ${attribute} ${operator} ${value}`);
    const foundElementIds: string[] = [];
    for (const model of this.fragments.list.values()) {
      const allIds = model.tiles.keys();
      for (const id of allIds) {
        const [attrs] = await model.getItemsData([id], { attributesDefault: true });
        if (attrs && attrs[attribute]) {
          const attributeValue = (attrs[attribute] as any).value;
          if (attributeValue) {
            const attrValue = attributeValue.toString().toLowerCase();
            const searchValue = value.toString().toLowerCase();
            let match = false;
            switch (operator) {
              case "includes":
                match = attrValue.includes(searchValue);
                break;
              case "startsWith":
                match = attrValue.startsWith(searchValue);
                break;
              case "endsWith":
                match = attrValue.endsWith(searchValue);
                break;
              case "equals":
                match = attrValue === searchValue;
                break;
            }
            if (match) {
              foundElementIds.push(`${model.modelId}-${id}`);
            }
          }
        }
      }
    }
    return foundElementIds;
  }

  async getElementProperties(elementId: string) {
    if (!this.fragments) return null;
    console.log(`API: Getting properties for element ${elementId}`);
    const [modelId, expressIdStr] = elementId.split("-");
    const expressId = parseInt(expressIdStr, 10);
    const model = this.fragments.list.get(modelId);
    if (!model) return null;

    const [attrs] = await model.getItemsData([expressId], { attributesDefault: true });
    
    const psetsRaw = await this.getItemPsets(model, expressId);
    const psets = this.formatItemPsets(psetsRaw);

    return { attrs, psets };
  }

  private async getItemPsets(model: any, localId: number) {
    const [data] = await model.getItemsData([localId], {
      attributesDefault: false,
      attributes: ["Name", "NominalValue"],
      relations: {
        IsDefinedBy: { attributes: true, relations: true },
        DefinesOcurrence: { attributes: false, relations: false },
      },
    });
    return (data?.IsDefinedBy as ItemData[]) ?? [];
  }

  private formatItemPsets(raw: ItemData[]) {
    const result: Record<string, Record<string, any>> = {};
    for (const pset of raw) {
      const { Name: psetName, HasProperties } = pset as any;
      if (!(psetName && "value" in psetName && Array.isArray(HasProperties))) continue;
      const props: Record<string, any> = {};
      for (const prop of HasProperties) {
        const { Name, NominalValue } = prop || {};
        if (!(Name && "value" in Name && NominalValue && "value" in NominalValue)) continue;
        props[Name.value] = NominalValue.value;
      }
      result[psetName.value] = props;
    }
    return result;
  }

  private originalColors = new Map<
    FRAGS.BIMMaterial,
    { color: number; transparent: boolean; opacity: number }
  >();

  async setModelTransparent(opacity: number = 0.6) {
    if (!this.fragments || !this.components) return;

    // Restore materials to their original state before applying new transparency
    await this.restoreModelMaterials();

    const materials = [...this.fragments.core.models.materials.list.values()];
    for (const material of materials) {
      if (material.userData.customId) continue;

      if (!this.originalColors.has(material)) {
        let color: number;
        if ('color' in material) {
          color = material.color.getHex();
        } else {
          color = material.lodColor.getHex();
        }

        this.originalColors.set(material, {
          color,
          transparent: material.transparent,
          opacity: material.opacity,
        });
      }

      material.transparent = true;
      material.opacity = opacity;
      material.needsUpdate = true;

      if ("color" in material) {
        material.color.setColorName("white");
      } else {
        material.lodColor.setColorName("white");
      }

    }
  }

  async restoreModelMaterials() {
    if (!this.fragments) return;
    for (const [material, data] of this.originalColors) {
      material.transparent = data.transparent;
      material.opacity = data.opacity;
      if ('color' in material) material.color.setHex(data.color);
      else material.lodColor.setHex(data.color);
      material.needsUpdate = true;
    }
    this.originalColors.clear();
  }
}

export const viewerApi = new ViewerAPI();
