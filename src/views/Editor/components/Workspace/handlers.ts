import { engineInstance } from '../../../../core/engine';
import { computeCanvasSizeFromDrag, type DragEdge } from '../../../../core/canvas/canvasMath';
import { useEditorStore, type EditorCommand } from '../../../../store/useEditorStore';
import type { ImageLayer, TextLayer } from '../../../../types/schema';

import { calcFitZoom, clampZoom } from './shared';

interface ApplyCanvasResizeFromDragParams {
  edge: DragEdge;
  zoom: number;
  startWidth: number;
  startHeight: number;
  deltaX: number;
  deltaY: number;
  commit: boolean;
}

interface WorkspaceFrameAnchor {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface ApplyWorkspaceZoomParams {
  nextZoom: number;
}

const WHEEL_ZOOM_SENSITIVITY = 0.001;

/**
 * ???????
 * ???????????????????????????????
 */
const stopWorkspaceZoomAnimation = (): void => {};

/**
 * 鏍规嵁鎷栨嫿杈逛笌褰撳墠缂╂斁鍊硷紝鎶婂睆骞曚綅绉绘崲绠楁垚涓嬩竴甯х殑鏂囨。鍍忕礌灏哄銆?
 * 杩欓噷杩斿洖鐨勬槸 Schema 灞備娇鐢ㄧ殑鐪熷疄瀹介珮锛岃€屼笉鏄凡缁忎箻杩?zoom 鐨勬樉绀哄昂瀵搞€?
 */
export const measureCanvasResizeFromDrag = ({
  edge,
  zoom,
  startWidth,
  startHeight,
  deltaX,
  deltaY,
}: Omit<ApplyCanvasResizeFromDragParams, 'commit'>): {
  widthPx: number;
  heightPx: number;
} => {
  const { widthPx, heightPx } = computeCanvasSizeFromDrag({
    edge,
    startWidthPx: startWidth,
    startHeightPx: startHeight,
    // 灞忓箷鎷栨嫿璺濈闇€瑕侀櫎浠ュ綋鍓嶆樉绀虹缉鏀撅紝鎵嶈兘杩樺師鎴愭枃妗ｅ儚绱犮€?
    deltaX: deltaX / zoom,
    deltaY: deltaY / zoom,
  });

  return {
    widthPx: Math.round(widthPx),
    heightPx: Math.round(heightPx),
  };
};

/**
 * 鍦ㄥ伐浣滃尯 canvas DOM 鎸傝浇瀹屾垚鍚庡垵濮嬪寲 Fabric 寮曟搸銆?
 * 杩斿洖鐨勬竻鐞嗗嚱鏁颁細鍦ㄧ粍浠跺嵏杞芥椂閲婃斁 Fabric 浜嬩欢涓庡唴閮ㄨ祫婧愩€?
 */
export const initializeWorkspaceEngine = (
  canvasElement: HTMLCanvasElement | null,
): (() => void) | undefined => {
  if (!canvasElement) return undefined;

  const documentState = useEditorStore.getState().document;
  if (!documentState) return undefined;

  engineInstance.init(
    canvasElement,
    documentState.global.width,
    documentState.global.height,
  );
  engineInstance.loadDocument(documentState);

  return () => {
    engineInstance.dispose();
  };
};

/**
 * 鎶?Store 涓彂鍑虹殑缂栬緫鍛戒护鍚屾鍒伴殧绂荤殑 Fabric 寮曟搸銆?
 * 杩欓噷鏄?React/Store 涓?Engine 涔嬮棿鐨勫懡浠ゆˉ锛屼繚璇?UI 涓嶇洿鎺ユ搷浣?Fabric 瀹炰緥銆?
 */
export const applyWorkspaceEditorCommand = (
  editorCommand: EditorCommand | null,
): void => {
  if (!editorCommand || !engineInstance.isReady()) return;

  if (editorCommand.type === 'commands:batch') {
    editorCommand.commands.forEach((command) => {
      applyWorkspaceEditorCommand(command);
    });
    return;
  }

  // 涓轰粈涔堣繖閲岀敤鏄惧紡鍒嗘敮鑰屼笉鏄懡浠よ〃锛?
  // 姣忕鍛戒护瀵瑰簲鐨勫壇浣滅敤宸紓寰堝ぇ锛屾樉寮忓垎鏀洿鏂逛究鍦ㄥ悗缁淮鎶ゆ椂琛ュ厖杈圭晫鏉′欢鍜屾敞閲娿€?
  if (editorCommand.type === 'selection:set') {
    if (editorCommand.layerId) {
      engineInstance.selectLayer(editorCommand.layerId);
    } else {
      engineInstance.clearSelection();
    }
    return;
  }

  if (editorCommand.type === 'layer:update') {
    engineInstance.updateLayerProps(editorCommand.layerId, editorCommand.payload);
    return;
  }

  if (editorCommand.type === 'group:edit-enter') {
    engineInstance.openGroupEditing(editorCommand.groupId);
    return;
  }

  if (editorCommand.type === 'group:edit-exit') {
    engineInstance.closeGroupEditing(true);
    return;
  }

  if (editorCommand.type === 'group:refresh') {
    engineInstance.refreshGroupLayer(
      editorCommand.groupId,
      editorCommand.preserveSelection,
    );
    return;
  }

  if (editorCommand.type === 'canvas:resize') {
    engineInstance.resizeCanvas(editorCommand.width, editorCommand.height);
    return;
  }

  if (editorCommand.type === 'canvas:resize-and-translate') {
    engineInstance.resizeCanvasAndTranslateLayers(
      editorCommand.width,
      editorCommand.height,
      editorCommand.offsetX,
      editorCommand.offsetY,
    );
    return;
  }

  if (editorCommand.type === 'layers:translate') {
    engineInstance.translateAllLayers(
      editorCommand.offsetX,
      editorCommand.offsetY,
    );
    return;
  }

  if (editorCommand.type === 'document:load') {
    engineInstance.loadDocument(
      editorCommand.document,
      editorCommand.activeLayerId,
    );
    return;
  }

  if (editorCommand.layer.type === 'text') {
    const measured = engineInstance.addTextLayer(editorCommand.layer as TextLayer);
    if (!measured) return;

    useEditorStore.getState().updateLayer(
      editorCommand.layer.id,
      measured,
      { commit: false, origin: 'engine' },
    );
    return;
  }

  void engineInstance
    .addImageLayer(editorCommand.layer as ImageLayer)
    .then((measured) => {
      if (!measured) return;

      useEditorStore.getState().updateLayer(
        editorCommand.layer.id,
        measured,
        { commit: false, origin: 'engine' },
      );
    });
};

/**
 * 鎶婃枃妗ｇ湡瀹炲昂瀵稿悓姝ョ粰 Fabric 鐢诲竷 buffer銆?
 * 杩欎釜鍏ュ彛涓昏鐢ㄤ簬宸ヤ綔鍖哄昂瀵稿彉鍖栧悗锛岄€氱煡 Engine 閲嶅缓鏄剧ず缂撳啿鍖恒€?
 */
export const syncWorkspaceCanvasSize = (
  width: number,
  height: number,
): void => {
  engineInstance.resizeCanvas(width, height);
};

/**
 * 鎶婂綋鍓嶉〉闈㈣儗鏅悓姝ュ埌 Fabric 寮曟搸銆?
 * 鑳屾櫙灞炰簬椤甸潰绾х姸鎬侊紝鍥犳闇€瑕佹牴鎹?currentPageId 瑙ｆ瀽鍑哄綋鍓嶉〉鍐嶄笅鍙戙€?
 */
export const syncWorkspaceBackground = (
  width: number,
  height: number,
): void => {
  const state = useEditorStore.getState();
  const documentState = state.document;
  if (!documentState) return;

  const page =
    documentState.pages.find((item) => item.pageId === state.currentPageId) ??
    documentState.pages[0];

  if (!page?.background) return;
  engineInstance.setBackground(page.background, width, height);
};

/**
 * 鎶婂伐浣滃尯缂╂斁鍊煎悓姝ュ埌 Fabric 鏄剧ず灞傘€?
 * 杩欓噷鍙悓姝ユ樉绀?zoom锛屼笉浼氫慨鏀规枃妗ｇ湡瀹炲楂樸€?
 */
export const syncWorkspaceZoom = (zoom: number): void => {
  engineInstance.setDisplayZoom(zoom);
};

/**
 * 鎶婂綋鍓嶅彲瑙嗗伐浣滃尯灏哄鍚屾缁?Engine銆?
 * Engine 浼氱敤瀹冭绠楃紦鍐插眰 padding锛岀‘淇濆ぇ缂╂斁涓嬩粛鐒舵湁瓒冲鐨勫彲娓叉煋鍖哄煙銆?
 */
export const syncWorkspaceViewportSize = (
  width: number,
  height: number,
): void => {
  engineInstance.setWorkspaceViewportSize(width, height);
};

/**
 * 鏍规嵁褰撳墠宸ヤ綔鍖哄彲瑙嗗尯鍩熼噸鏂拌绠椻€滈€傚簲鐢诲竷鈥濈缉鏀惧€硷紝骞舵妸婊氬姩浣嶇疆鍥炴鍒颁腑蹇冦€?
 * 杩欓噷閫氬父鍦ㄩ娆¤繘鍏ョ紪杈戝櫒鎴栫敤鎴蜂富鍔ㄧ偣鍑?Fit 鏃惰皟鐢ㄣ€?
 */
export const fitWorkspaceToViewport = (
  viewportElement: HTMLDivElement | null,
): void => {
  if (!viewportElement) return;

  const documentState = useEditorStore.getState().document;
  if (!documentState) return;

  const fitZoom = calcFitZoom(
    documentState.global.width,
    documentState.global.height,
    viewportElement.clientWidth,
    viewportElement.clientHeight,
  );

  // Fit 灞炰簬鈥滅洿鎺ュ洖鍒扮簿纭缉鏀惧€尖€濈殑鍦烘櫙锛屽繀椤诲厛娓呮帀鏃у姩鐢伙紝閬垮厤鏃?target 鍦ㄤ笅涓€甯ц鐩?fit 缁撴灉銆?
  stopWorkspaceZoomAnimation();
  useEditorStore.getState().setZoom(fitZoom);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // 涓轰粈涔堣繛缁涓ゅ眰 rAF锛?
      // 闇€瑕佸厛绛?React 鍜?Fabric 閮藉畬鎴愪竴杞昂瀵告洿鏂帮紝鍐嶈鍙栨渶鏂?scrollWidth/scrollHeight锛?
      // 鍚﹀垯寰堝鏄撳湪鏃у竷灞€鍩虹涓婂眳涓紝閫犳垚鈥滃垰 fit 瀹屽張杞诲井璺充竴涓嬧€濄€?
      viewportElement.scrollLeft = Math.max(
        (viewportElement.scrollWidth - viewportElement.clientWidth) / 2,
        0,
      );
      viewportElement.scrollTop = Math.max(
        (viewportElement.scrollHeight - viewportElement.clientHeight) / 2,
        0,
      );
    });
  });
};

/**
 * 缁戝畾宸ヤ綔鍖虹偣鍑荤┖鐧藉彇娑堥€変腑鐨勪氦浜掋€?
 * 鍙鐐瑰嚮鐩爣涓嶅湪 Fabric wrapper 鍐咃紝灏辨妸褰撳墠婵€娲诲浘灞傛竻绌恒€?
 */
export const bindWorkspaceSelectionClear = (
  viewportElement: HTMLDivElement,
): (() => void) => {
  const onPointerDown = (event: PointerEvent) => {
    // Fabric 浼氭妸 upper/lower canvas 鍖呭湪鍚屼竴涓?wrapper 鍐咃紝蹇呴』鐢?wrapper 鍛戒腑鍒ゆ柇锛?
    // 鍚﹀垯 upper canvas 涓婄殑鐐瑰嚮浼氳閿欒鍦拌涓衡€滅偣鍑讳簡鐢诲竷澶栭儴鈥濄€?
    if (!engineInstance.isTargetInsideCanvas(event.target)) {
      useEditorStore.getState().setActiveLayer(null);
    }
  };

  viewportElement.addEventListener('pointerdown', onPointerDown);
  return () => {
    viewportElement.removeEventListener('pointerdown', onPointerDown);
  };
};

/**
 * 缁戝畾宸ヤ綔鍖烘粴杞缉鏀捐涓恒€?
 * 褰撳墠浜у搧瑙勫垯鏄€滅敾甯冨缁堝眳涓€濓紝鍥犳婊氳疆鍙礋璐ｈ绠椾笅涓€鐩爣 zoom锛?
 * 鍏蜂綋鐨勫眳涓笌骞虫粦杩囨浮浜ょ粰 applyWorkspaceZoom 缁熶竴澶勭悊銆?
 */
export const bindWorkspaceWheelZoom = (
  viewportElement: HTMLDivElement,
): (() => void) => {
  /** 澶勭悊宸ヤ綔鍖烘粴杞缉鏀捐緭鍏ワ紝骞舵妸绂绘暎婊氳疆浜嬩欢杞垚杩炵画缂╂斁鐩爣鍊笺€?*/
  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const currentZoom = useEditorStore.getState().zoom;
    // 涓轰粈涔堟敼鎴愭寚鏁扮缉鏀撅細
    // 鍥哄畾 0.1 姝ヨ繘鍦ㄦ粴杞笂浼氭樉寰楀緢鈥滈】鈥濓紝杩欓噷鎸?deltaY 杩炵画璁＄畻缂╂斁鍊硷紝
    // 淇濇寔鐢诲竷浠嶇劧鍥哄畾灞呬腑锛屼絾瑙嗚涓婁細椤烘粦寰堝銆?
    const rawNextZoom =
      currentZoom * Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY);
    const nextZoom = clampZoom(Math.round(rawNextZoom * 1000) / 1000);
    applyWorkspaceZoom({
      nextZoom,
    });
  };

  viewportElement.addEventListener('wheel', onWheel, { passive: false });
  return () => {
    viewportElement.removeEventListener('wheel', onWheel);
  };
};

/**
 * 鎶婂伐浣滃尯婊氬姩浣嶇疆鐩存帴缃负姘村钩/鍨傜洿涓績銆?
 * 璇ュ嚱鏁板彧璐熻矗婊氬姩鏉′綅缃紝涓嶈礋璐ｆ敼 zoom銆?
 */
export const centerWorkspaceViewport = (
  viewportElement: HTMLDivElement,
): void => {
  viewportElement.scrollLeft = Math.max(
    (viewportElement.scrollWidth - viewportElement.clientWidth) / 2,
  0,
  );
  viewportElement.scrollTop = Math.max(
    (viewportElement.scrollHeight - viewportElement.clientHeight) / 2,
    0,
  );
};

/**
 * 鐢ㄥ崟涓€鍔ㄧ敾寰幆鎶婂綋鍓?zoom 骞虫粦杩藉埌鐩爣 zoom銆?
 * 杩炵画婊氳疆杈撳叆鏃朵笉浼氬弽澶嶉噸鍚姩鐢伙紝鑰屾槸鎸佺画杩借釜鏈€鏂扮洰鏍囧€硷紝鍑忓皯椤挎尗鎰熴€?
 */
/**
 * ??????????
 * ???????????????????? Fabric ???? backstore ????????
 */
export const applyWorkspaceZoom = ({
  nextZoom,
}: ApplyWorkspaceZoomParams): void => {
  const currentZoom = useEditorStore.getState().zoom;
  if (Math.abs(nextZoom - currentZoom) < 1e-6) return;

  stopWorkspaceZoomAnimation();
  useEditorStore.getState().setZoom(Math.round(nextZoom * 1000) / 1000);
};

export const readWorkspaceFrameAnchor = (
  frameElement: HTMLDivElement | null,
): WorkspaceFrameAnchor | null => {
  if (!frameElement) return null;

  const { left, top, right, bottom } = frameElement.getBoundingClientRect();
  return { left, top, right, bottom };
};

/**
 * 鍦ㄥ伐浣滃尯灏哄璋冩暣鍚庢仮澶嶈鍙ｆ粴鍔ㄤ綅缃紝灏介噺淇濇寔鐢ㄦ埛褰撳墠鐪嬪埌鐨勫唴瀹逛笉璺冲姩銆?
 * 杩欓噷閫氳繃姣旇緝 resize 鍓嶅悗鐨?frame 浣嶇疆宸紝鍙嶆帹闇€瑕佽ˉ鍋跨殑 scroll 浣嶇Щ銆?
 */
export const restoreWorkspaceViewportAnchor = (
  viewportElement: HTMLDivElement | null,
  frameElement: HTMLDivElement | null,
  anchor: WorkspaceFrameAnchor | null,
  edge: DragEdge,
): void => {
  if (!viewportElement || !frameElement || !anchor) return;

  const { left, top, right, bottom } = frameElement.getBoundingClientRect();
  const deltaLeft =
    edge === 'left' ? right - anchor.right : left - anchor.left;
  const deltaTop =
    edge === 'top' ? bottom - anchor.bottom : top - anchor.top;

  if (deltaLeft !== 0) {
    viewportElement.scrollLeft += deltaLeft;
  }

  if (deltaTop !== 0) {
    viewportElement.scrollTop += deltaTop;
  }
};

/**
 * 鍦ㄤ竴娆?Store 浜嬪姟閲屽悓鏃舵彁浜ょ敾甯冨昂瀵稿彉鍖栧拰鍥惧眰骞崇Щ銆?
 * 杩欐牱鍙互淇濊瘉宸?涓婅竟鎷栨嫿鏃讹紝鏂囨。灏哄鍙樺寲涓庡浘灞傛暣浣撳钩绉诲睘浜庡悓涓€涓巻鍙叉楠ゃ€?
 */
export const commitCanvasResizeDrag = ({
  edge,
  zoom,
  startWidth,
  startHeight,
  deltaX,
  deltaY,
  offsetX,
  offsetY,
}: Omit<ApplyCanvasResizeFromDragParams, 'commit'> & {
  offsetX: number;
  offsetY: number;
}): void => {
  const { widthPx, heightPx } = measureCanvasResizeFromDrag({
    edge,
    zoom,
    startWidth,
    startHeight,
    deltaX,
    deltaY,
  });

  useEditorStore.getState().resizeCanvasAndTranslateCurrentPageLayers(
    widthPx,
    heightPx,
    offsetX,
    offsetY,
    { commit: true },
  );
};

/**
 * 鍦ㄧ湡姝ｆ彁浜ゅ昂瀵镐慨鏀瑰墠锛屾妸鏈€缁堢粨鏋滅粯鍒跺埌 overlay canvas銆?
 * 杩欐牱鍙互閬垮厤鐢ㄦ埛鍦?commit 鐬棿鐪嬪埌 Fabric buffer 閲嶅缓甯︽潵鐨勯棯鐑併€?
 */
export const drawCanvasResizeCommitPreview = (
  previewCanvasElement: HTMLCanvasElement | null,
  widthPx: number,
  heightPx: number,
  offsetX: number,
  offsetY: number,
): boolean => {
  if (!previewCanvasElement) return false;

  return engineInstance.drawResizeCommitPreview(
    previewCanvasElement,
    widthPx,
    heightPx,
    offsetX,
    offsetY,
  );
};

/**
 * 绛夊緟鐪熷疄 Fabric 鐢诲竷瀹屾垚涓嬩竴娆℃覆鏌撳悗锛屽啀绉婚櫎灏哄璋冩暣棰勮灞傘€?
 * 杩欐牱鑳戒繚璇?overlay 涓庣湡瀹炵敾闈箣闂寸殑鍒囨崲鏄繛缁殑銆?
 */
export const finishWorkspaceResizePreviewAfterRender = (
  onRendered: () => void,
): void => {
  engineInstance.onNextRender(onRendered);
};

/**
 * 鏍规嵁鎷栨嫿浣嶇Щ搴旂敤宸ヤ綔鍖哄昂瀵搁瑙堟垨鏈€缁堟彁浜ゃ€?
 * `commit=false` 鍙洿鏂伴瑙堝昂瀵革紱`commit=true` 鎵嶄細鐪熸鍐欏叆 Store銆?
 */
export const applyCanvasResizeFromDrag = ({
  edge,
  zoom,
  startWidth,
  startHeight,
  deltaX,
  deltaY,
  commit,
}: ApplyCanvasResizeFromDragParams): void => {
  const { widthPx, heightPx } = measureCanvasResizeFromDrag({
    edge,
    zoom,
    startWidth,
    startHeight,
    deltaX,
    deltaY,
  });

  useEditorStore.getState().setCanvasSizePx(
    widthPx,
    heightPx,
    { commit },
  );
};
