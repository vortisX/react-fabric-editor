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
 * Export the current scene as an SVG blob with embedded local fonts.
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
 * Export the current scene as a single-page PDF blob.
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
 * Export the current design document as the requested file format and start a browser download.
 */
export const exportCurrentDesign = async (
  format: ExportFormat,
  filename: string,
  scale: ExportScale,
): Promise<void> => {
  const outputName = buildDownloadName(filename, format);

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
