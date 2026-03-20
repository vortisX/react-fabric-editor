import { engineInstance } from "../engine";
import { dataUrlToBlob } from "./download";
import { JPEG_EXPORT_QUALITY, type ExportScale } from "./types";

/**
 * Export the current canvas scene as a raster blob.
 */
export const exportRasterBlob = (
  format: "png" | "jpeg",
  scale: ExportScale,
): Blob => {
  const dataUrl = engineInstance.exportSceneDataUrl(
    format,
    format === "jpeg" ? JPEG_EXPORT_QUALITY : 1,
    scale,
  );
  if (!dataUrl) {
    throw new Error("EXPORT_FAILED");
  }

  return dataUrlToBlob(dataUrl);
};
