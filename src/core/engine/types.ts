import type { FabricImage, FabricObject } from "fabric";

export type FabricImageLayer = FabricImage & { id: string };

export type FabricSelectionEvent = { selected?: FabricObject[] };

export type FabricObjectEvent = { target: FabricObject };

export type FabricHoverEvent = { target?: FabricObject };

export type FabricScalingEvent = {
  target: FabricObject;
  transform?: { corner?: string; action?: string };
};

export type FabricModifiedEvent = {
  target: FabricObject;
  transform?: { corner?: string };
};

export type FabricLayerTarget = FabricObject & { id?: string };

export type LayerMeasurement = {
  x: number;
  y: number;
  width: number;
  height: number;
};
