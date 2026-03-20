import { engineInstance } from "../engine";
import { dataUrlToBlob } from "./download";
import { JPEG_EXPORT_QUALITY, type ExportScale } from "./types";

/**
 * 导出当前场景为 PNG/JPEG Blob。
 * 栅格导出底层依赖 Engine 先生成 DataURL，再统一转为 Blob。
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
