import { useEditorStore } from '../../../../../store/useEditorStore';
import { CANVAS_PRESETS, type CanvasPresetId } from '../../../../../core/canvas/canvasPresets';
import { presetToPx, convertUnitToPx } from '../../../../../core/canvas/canvasMath';
import { CANVAS_MIN_PX, CANVAS_MAX_PX, type CanvasUnit } from '../../../../../core/config/constants';
import type { FillStyle, GradientFill, PageBackground } from '../../../../../types/schema';

/**
 * 将 Schema 中的 PageBackground 转换为 FillPicker 所需的 FillStyle
 * 处理纯色与渐变背景，确保 FillPicker 能正确解析与展示
 */
export function normalizeFillFromBackground(bg: PageBackground): FillStyle {
  if (bg.type === 'color') return { type: 'solid', color: bg.value };
  if (bg.type === 'gradient') return bg.value;
  return { type: 'solid', color: '#ffffff' };
}

/** 闁?FillPicker 閺夆晜鏌ㄥú鏍儍閸曨偓缍栭柛蹇撴噽缁劑寮搁崟顖氭闁哄倹濯藉ù鍡涘箲閵忊€崇亣闁告瑯鍨甸幆銈嗘償閹捐埖鐣卞銈囨暬濞间即鎳楃仦鐐彲闁轰胶澧楀畵渚€濡?*/
export function nextBackgroundFromFill(fill: FillStyle): PageBackground {
  if (fill.type === 'solid') return { type: 'color', value: fill.color };
  // 婵炴挻鍔曡ぐ澶岀尵鐠囪尙鈧兘鏁嶅鐖刲l 闁哄牜鍓濋棅鈺呭础閸忓懓绀?GradientFill闁挎稑鐬煎ú鍧楀箳閵夈儱鐦堕悷浣告噺閸?GradientBackground
  return { type: 'gradient', value: fill as GradientFill };
}

/**
 * 濠㈣泛瀚幃濠囨偨鐠囪尙顏村Λ鏉垮椤旀洟宕氶崶銊ュ簥闁?
 * 閺夆晜鐟╅崳鐑芥儎鐎涙ê澶嶉梺顐ｄ亢缁?getState() 闁哄洤鐡ㄩ弻?Store闁挎稑濂旂换姘跺箰娴ｅ壊妲遍柣鐐叉閳ь剚妲掔欢顐ｇ▔?React 闁汇垻鍠庨幊锟犲川閵婏附鍩傞悷娆欑秬閳ь剨璐熼埀?
 */
export function handlePresetChange(presetId: CanvasPresetId): void {
  const preset = CANVAS_PRESETS.find((p) => p.id === presetId);
  if (!preset || preset.id === 'custom') return;

  const next = presetToPx(preset.id);
  if (!next) return;

  const { setCanvasUnit, setCanvasSizePx, requestFit } = useEditorStore.getState();
  setCanvasUnit(preset.unit);
  setCanvasSizePx(next.widthPx, next.heightPx, { commit: true });
  // 闁告帒娲﹀畷鍙夛紣閸曨噮鍟庨柛姘唉閸ゆ粓宕濋妸鈹惧亾閸屾氨瀹夐柣銏ｎ嚙缁旂兘鏁嶅畝鍕╂慨婵勫灮閺佸墽鏁崘顓犵畺濠㈠爢鍕仐閺夆晛娲ら惃顒勫Υ?
  requestFit();
}

/**
 * 濠㈣泛瀚幃濠囧箥鐎ｎ亜袟閺夊牊鎸搁崣鍡涙儍閸曨厽鏆伴悽顖氬暙閺勫倻鈧灚鎮堕埀?
 * 闁哄稄绻濋悰娆愬緞鏉堫偉袝闁哄啯鍎肩换鎴﹀炊?i18n key闁挎稑鏈崹姘跺礉閻斿憡顦ч弶鈺傛煥濞?null闁挎稑鐬奸悙鏇犳嫚閹存繀绱ｅù锝嗙矌閺佽京鎷崘顏呮殢闁哄倸缍婇埀顒佷亢缁?`t()` 閻庣懓鏈崹姘跺Υ?
 */
export function applyDimensionChange(
  kind: 'width' | 'height',
  valueInUnit: number | null,
  unit: CanvasUnit,
): 'rightPanel.canvasWidthError' | 'rightPanel.canvasHeightError' | null {
  if (valueInUnit === null) return null;

  const nextPx = Math.round(convertUnitToPx(valueInUnit, unit));
  const valid = nextPx >= CANVAS_MIN_PX && nextPx <= CANVAS_MAX_PX;

  if (!valid) {
    return kind === 'width' ? 'rightPanel.canvasWidthError' : 'rightPanel.canvasHeightError';
  }

  const { document, setCanvasSizePx } = useEditorStore.getState();
  if (!document) return null;

  const widthPx = document.global.width;
  const heightPx = document.global.height;

  if (kind === 'width') {
    setCanvasSizePx(nextPx, heightPx, { commit: true });
  } else {
    setCanvasSizePx(widthPx, nextPx, { commit: true });
  }

  return null;
}
