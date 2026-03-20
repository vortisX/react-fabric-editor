import { engineInstance } from "../engine";
import { useEditorStore } from "../../store/useEditorStore";
import { buildDownloadName, triggerDownload } from "./download";
import { exportJsonBlob } from "./json";
import { createPdfBlob } from "./pdf";
import { exportRasterBlob } from "./raster";
import { embedSvgFonts } from "./svg";
import {
  JPEG_EXPORT_QUALITY,
  type ExportFormat,
  type ExportScale,
} from "./types";

/**
 * 导出当前场景为 SVG Blob，并把本地字体内嵌进去。
 */
export const exportSvgBlob = async (): Promise<Blob> => {
  const svg = engineInstance.exportSceneSvg();
  if (!svg) {
    throw new Error("EXPORT_FAILED");
  }

  const embeddedSvg = await embedSvgFonts(svg);

  return new Blob([embeddedSvg], {
    type: "image/svg+xml;charset=utf-8",
  });
};

/**
 * 导出当前场景为单页 PDF Blob。
 */
export const exportPdfBlob = (scale: ExportScale): Blob => {
  const documentState = useEditorStore.getState().document;
  if (!documentState) {
    throw new Error("EXPORT_FAILED");
  }

  const jpegDataUrl = engineInstance.exportSceneDataUrl(
    "jpeg",
    JPEG_EXPORT_QUALITY,
    scale,
  );
  if (!jpegDataUrl) {
    throw new Error("EXPORT_FAILED");
  }

  return createPdfBlob({
    dataUrl: jpegDataUrl,
    widthPx: documentState.global.width * scale,
    heightPx: documentState.global.height * scale,
    dpi: documentState.global.dpi,
  });
};

/**
 * 按指定格式导出当前设计，并立即触发浏览器下载。
 */
export const exportCurrentDesign = async (
  format: ExportFormat,
  filename: string,
  scale: ExportScale,
): Promise<void> => {
  const outputName = buildDownloadName(filename, format);

  // 为什么这里集中分发格式：
  // 导出入口统一放在 core/export 层，视图层只负责传递用户选择，不关心具体格式实现细节。
  const blob =
    format === "png"
      ? exportRasterBlob("png", scale)
      : format === "jpeg"
        ? exportRasterBlob("jpeg", scale)
        : format === "svg"
          ? await exportSvgBlob()
          : format === "pdf"
            ? exportPdfBlob(scale)
            : exportJsonBlob();

  triggerDownload(blob, outputName);
};

export type { ExportFormat, ExportScale } from "./types";
