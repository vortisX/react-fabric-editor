import type { FabricImage, FabricObject, Group } from "fabric";

export type FabricImageLayer = FabricImage & { id: string };
export type FabricGroupLayer = Group & { id: string; editingParentGroupId?: string };
export type EditableFabricObject = FabricObject & {
  id?: string;
  editingParentGroupId?: string;
};

export type FabricSelectionEvent = { selected?: FabricObject[] };

export type FabricObjectEvent = { target: FabricObject };

export type FabricHoverEvent = { target?: FabricObject };
export type FabricDoubleClickEvent = { target?: FabricObject };

export type FabricScalingEvent = {
  target: FabricObject;
  transform?: { corner?: string; action?: string };
};

export type FabricModifiedEvent = {
  target: FabricObject;
  transform?: { corner?: string };
};

export type FabricLayerTarget = EditableFabricObject;

export type LayerMeasurement = {
  x: number;
  y: number;
  width: number;
  height: number;
};
