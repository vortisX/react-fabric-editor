import { FabricImage, Pattern, type Canvas } from "fabric";

import type { PageBackground } from "../../types/schema";
import { fillStyleToFabric } from "./fill";

interface ApplyBackgroundParams {
  canvas: Canvas;
  background: PageBackground;
  width: number;
  height: number;
  currentAbort: AbortController | null;
  setAbort: (controller: AbortController) => void;
}

export const applyBackground = ({
  canvas,
  background,
  width,
  height,
  currentAbort,
  setAbort,
}: ApplyBackgroundParams): void => {
  currentAbort?.abort();

  const controller = new AbortController();
  setAbort(controller);
  const { signal } = controller;

  if (background.type === "color") {
    canvas.backgroundImage = undefined;
    canvas.backgroundColor = background.value;
    canvas.requestRenderAll();
    return;
  }

  if (background.type === "gradient") {
    canvas.backgroundImage = undefined;
    canvas.backgroundColor = fillStyleToFabric(background.value, width, height);
    canvas.requestRenderAll();
    return;
  }

  const fit = background.fit ?? "cover";
  const url = background.url;

  if (!url) {
    canvas.backgroundImage = undefined;
    canvas.backgroundColor = "#ffffff";
    canvas.requestRenderAll();
    return;
  }

  FabricImage.fromURL(url, { signal })
    .then((img) => {
      if (signal.aborted) return;

      img.set({ selectable: false, evented: false });

      const imageWidth = img.width ?? 1;
      const imageHeight = img.height ?? 1;

      if (fit === "tile") {
        canvas.backgroundImage = undefined;
        canvas.backgroundColor = new Pattern({
          source: img.getElement(),
          repeat: "repeat",
        });
        canvas.requestRenderAll();
        return;
      }

      if (fit === "stretch") {
        img.set({
          originX: "left",
          originY: "top",
          left: 0,
          top: 0,
          scaleX: width / imageWidth,
          scaleY: height / imageHeight,
        });
        canvas.backgroundImage = img;
        canvas.backgroundColor = "#ffffff";
        canvas.requestRenderAll();
        return;
      }

      if (fit === "none") {
        img.set({
          originX: "center",
          originY: "center",
          left: width / 2,
          top: height / 2,
          scaleX: 1,
          scaleY: 1,
        });
        canvas.backgroundImage = img;
        canvas.backgroundColor = "#ffffff";
        canvas.requestRenderAll();
        return;
      }

      const scale = Math.max(width / imageWidth, height / imageHeight);
      const scaledWidth = imageWidth * scale;
      const scaledHeight = imageHeight * scale;

      img.set({
        originX: "left",
        originY: "top",
        left: (width - scaledWidth) / 2,
        top: (height - scaledHeight) / 2,
        scaleX: scale,
        scaleY: scale,
      });
      canvas.backgroundImage = img;
      canvas.backgroundColor = "#ffffff";
      canvas.requestRenderAll();
    })
    .catch(() => {});
};
