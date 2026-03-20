import { FabricImage, Pattern, Rect, type Canvas } from "fabric";

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

/**
 * 把页面背景配置应用到 Fabric 画布。
 * 支持纯色、渐变、图片 cover/stretch/tile/none，并负责取消上一次未完成的图片加载。
 */
export const applyBackground = ({
  canvas,
  background,
  width,
  height,
  currentAbort,
  setAbort,
}: ApplyBackgroundParams): void => {
  /** 创建一个不可交互的背景矩形，用来承载纯色、渐变或平铺 Pattern。 */
  const createBackgroundRect = (fill: string | Pattern): Rect =>
    new Rect({
      left: 0,
      top: 0,
      originX: "left",
      originY: "top",
      width,
      height,
      fill,
      selectable: false,
      evented: false,
      excludeFromExport: false,
    });

  // 为什么每次都先终止旧请求：
  // 用户快速切换背景时，旧图片如果后到达，会把新背景覆盖掉，因此必须先 cancel。
  currentAbort?.abort();

  const controller = new AbortController();
  setAbort(controller);
  const { signal } = controller;

  if (background.type === "color") {
    canvas.backgroundImage = createBackgroundRect(background.value);
    canvas.backgroundColor = "transparent";
    canvas.requestRenderAll();
    return;
  }

  if (background.type === "gradient") {
    canvas.backgroundImage = createBackgroundRect(
      fillStyleToFabric(background.value, width, height) as string | Pattern,
    );
    canvas.backgroundColor = "transparent";
    canvas.requestRenderAll();
    return;
  }

  const fit = background.fit ?? "cover";
  const url = background.url;

  if (!url) {
    canvas.backgroundImage = createBackgroundRect("#ffffff");
    canvas.backgroundColor = "transparent";
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
        // 平铺模式不需要缩放图片本体，而是把图片元素包装成 Fabric Pattern 重复填充。
        canvas.backgroundImage = createBackgroundRect(
          new Pattern({
            source: img.getElement(),
            repeat: "repeat",
          }),
        );
        canvas.backgroundColor = "transparent";
        canvas.requestRenderAll();
        return;
      }

      if (fit === "stretch") {
        // 拉伸模式直接把图片缩放到文档尺寸，允许牺牲原始比例。
        img.set({
          originX: "left",
          originY: "top",
          left: 0,
          top: 0,
          scaleX: width / imageWidth,
          scaleY: height / imageHeight,
        });
        canvas.backgroundImage = img;
        canvas.backgroundColor = "transparent";
        canvas.requestRenderAll();
        return;
      }

      if (fit === "none") {
        // 原尺寸模式只把图片放到画布中心，不做任何缩放。
        img.set({
          originX: "center",
          originY: "center",
          left: width / 2,
          top: height / 2,
          scaleX: 1,
          scaleY: 1,
        });
        canvas.backgroundImage = img;
        canvas.backgroundColor = "transparent";
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
      canvas.backgroundColor = "transparent";
      canvas.requestRenderAll();
    })
    .catch(() => {
      // 背景图片加载失败时保持当前画布可用，避免因为资源异常阻塞编辑器。
    });
};
