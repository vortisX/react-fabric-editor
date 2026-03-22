import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, FillPicker, Select } from '../../../../../components/ui';
import type { PageBackground } from '../../../../../types/schema';
import { CANVAS_MAX_PX, CANVAS_MIN_PX, type CanvasUnit } from '../../../../../core/config/constants';
import { CANVAS_PRESETS } from '../../../../../core/canvas/canvasPresets';
import { convertPxToUnit, matchCanvasPresetId } from '../../../../../core/canvas/canvasMath';
import { useEditorStore } from '../../../../../store/useEditorStore';
import {
  normalizeFillFromBackground,
  nextBackgroundFromFill,
  handlePresetChange,
  applyDimensionChange,
} from './CanvasLayout.handlers';

/** 闁硅泛锕ラ弳鐔煎磹閸忕厧鐦婚柟绋挎搐閻ｅ墽浜歌箛鏃€娈跺ù锝呯Т濞叉捇鎳滃鍕畨闁稿繈鍎荤槐婵囩瑹濞戙垺濮?px 闁告娲戠紞鍛村及閸撗佷粵闁哄啳娉涢ˇ鏌ユ偨閵婏絺鍋?*/
function roundTo(n: number, digits: number) {
  const m = Math.pow(10, digits);
  return Math.round(n * m) / m;
}

/** 闁汇垼顕х粩鐑芥閵忊剝绶查柛鎺戞鐏忣垶寮介崶顒夋毌闁?*/
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-2 bg-white mt-1">
      <span className="text-[11px] font-bold text-gray-800 tracking-wide">{title}</span>
    </div>
  );
}

/**
 * 閻㈩垽绠戦悿鍕籍閹壆缈婚柛蹇嬪劤濞堟垿寮弶璺ㄦ憻婵℃妫庨埀?
 * 閺夊牊鎸搁崣鍡樻交閸モ斁鏌ゅù鍏艰壘閸樻盯寮寸€涙ɑ鐓€闁哄牜鍓欏﹢瀵糕偓娑欘殘椤戜焦绋夌拠褏绀夐柛鎰Ч閳ь剚淇虹换?rAF 闁煎搫鍊圭粊锕傚箮婵犲倸璁查悷娆欑稻閻庝粙寮弶搴撳亾閻撳孩绀€濞磋偐濮风划鐗堝緞閺嵮呮勾闁?
 */
function RealtimeNumberInput(props: {
  value: number;
  onChange: (value: number | null) => void;
  invalid?: boolean;
}) {
  const { value, onChange, invalid = false } = props;
  const [local, setLocal] = useState(String(value));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      onChange={(e) => {
        const next = e.target.value;
        setLocal(next);
        // 濞戞捁妗ㄧ划鍫熺▕閸垺鏆?rAF 闁告牕鎳嶇粩瀵镐沪閸岋妇绐?
        // 閺夆晝鍋熼悽缁樻綇閹惧啿寮抽柡鍐硾瑜板弶绂掗妷锕€惟闁告艾濂旂粩瀵告暜瑜嶉崬鎾儍閸曨偒妯嬫繛鍡忊偓宕囨憻缂佹绠戣ぐ澶愬礌閺嵮勫€ゆ鐐额啇缁辨繈宕欒箛鎾舵瘜濠㈣埖鐗曢惇?Store 闁哄洤鐡ㄩ弻濠冿紣閹寸姴鑺抽柕?
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const n = parseFloat(next);
          onChange(Number.isFinite(n) ? n : null);
        });
      }}
      className={[
        'w-full h-6 px-1.5 text-xs bg-transparent outline-none text-gray-700 tabular-nums',
        invalid ? 'text-red-600' : '',
      ].join(' ')}
    />
  );
}

/**
 * 闁汇垼顕х粩鐑藉礂閵娿儳婀伴悹浣稿⒔閻ゅ棝宕犻幁鎺嗗亾?
 * 閻犳劗鍠曢惌妤佸緞閸曨厽鍊炲Λ鏉垮椤旀洜浜搁崫鍕靛殶闁靛棔绀侀鏃€顨囧Ο鍝勭濞达絽绉撮崹蹇涘箲椤兘鍋撴担钘夊壒闁哄拋鍨甸鏇犵磾椤旇绨伴柛娆忥攻閹告瑩鏌ㄩ埀?闂佹彃绉存禒娑㈠礂閵夈儱缍撻柕?
 */
export function CanvasLayoutSection() {
  const { t } = useTranslation();
  const unitOptions = useMemo(
    () => [
      { value: 'px', label: t('rightPanel.canvasUnitPx') },
      { value: 'mm', label: t('rightPanel.canvasUnitMm') },
      { value: 'cm', label: t('rightPanel.canvasUnitCm') },
      { value: 'in', label: t('rightPanel.canvasUnitIn') },
    ],
    [t],
  );
  const hasDocument = useEditorStore((s) => s.document !== null);
  const widthPx = useEditorStore((s) => s.document?.global.width ?? 0);
  const heightPx = useEditorStore((s) => s.document?.global.height ?? 0);
  const unit = useEditorStore((s) => (s.document?.global.unit ?? 'px') as CanvasUnit);
  const background = useEditorStore((s) => {
    const doc = s.document;
    if (!doc) return null;
    const page = doc.pages.find((p) => p.pageId === s.currentPageId) ?? doc.pages[0];
    return page?.background ?? null;
  });
  const canUndo = useEditorStore((s) => s.history.past.length > 0);
  const canRedo = useEditorStore((s) => s.history.future.length > 0);

  const setCanvasUnit = useEditorStore((s) => s.setCanvasUnit);
  const setPageBackground = useEditorStore((s) => s.setPageBackground);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  const selectedPresetId = useMemo(() => matchCanvasPresetId(widthPx, heightPx), [widthPx, heightPx]);

  const widthDisplay = useMemo(() => {
    const raw = convertPxToUnit(widthPx, unit);
    return unit === 'px' ? Math.round(raw) : roundTo(raw, 2);
  }, [widthPx, unit]);

  const heightDisplay = useMemo(() => {
    const raw = convertPxToUnit(heightPx, unit);
    return unit === 'px' ? Math.round(raw) : roundTo(raw, 2);
  }, [heightPx, unit]);

  const [widthError, setWidthError] = useState<string | null>(null);
  const [heightError, setHeightError] = useState<string | null>(null);

  if (!hasDocument) return null;
  const safeBackground: PageBackground = background ?? { type: 'color', value: '#ffffff' };

  /** 濠㈣泛瀚幃濠勨偓纭呮鐎硅櫕娼忛幘鍐插汲闁挎稑鑻懟鐔煎箮婵犲啰澧″Δ鐘茬焸閺佸﹦鎷犻婊呭€抽悹鍥ㄥ灦閸ㄦ岸宕ｉ婊勭函闁规亽鍎遍惈宥囩矆閾忚鐣遍柡鍌氭处椤㈠秹濡?*/
  const handleWidthChange = (v: number | null) => {
    const errKey = applyDimensionChange('width', v, unit);
    setWidthError(errKey ? t(errKey, { min: CANVAS_MIN_PX, max: CANVAS_MAX_PX }) : null);
  };

  /** 濠㈣泛瀚幃濠冾殗濡搫顔婇弶鍫熸尭閸欏棝鏁嶇仦鍊熷珯闁硅泛锕ラ悧搴㈩殽瀹€鍕櫓閻犲浂鍨抽悙鏇犳嫚閹寸偛鐏囬柛娆樺灣濞插潡骞掗妷銉ф綌缂佲偓閾忚鐣遍柡鍌氭处椤㈠秹濡?*/
  const handleHeightChange = (v: number | null) => {
    const errKey = applyDimensionChange('height', v, unit);
    setHeightError(errKey ? t(errKey, { min: CANVAS_MIN_PX, max: CANVAS_MAX_PX }) : null);
  };

  /** 闁告帒娲﹀畷鑼焊閸濆嫷鍤熼柛妤佹磻缂嶅懘寮捄鍝勫弗婵炴挸鎳愰埞鏍煥濞嗘帩鍤栭柟顑跨筏缁辨繈鏌嗛崹顔煎赋婵炲矁娉曢弫銈夊籍瑜嶅畷鐔告媴瀹ュ嫮鐟撻柣銊ュ閺佸﹦鎷犻娑樼倒缂佲偓閹巻鍋?*/
  const handleUnitChange = (val: string) => {
    setWidthError(null);
    setHeightError(null);
    setCanvasUnit(val);
  };

  const backgroundMode = safeBackground.type === 'image' ? 'image' : 'fill';

  return (
    <div className="flex flex-col border-b border-gray-100 pb-3">
      <SectionHeader title={t('rightPanel.canvasLayout')} />
      <div className="px-4 flex flex-col gap-2">
        <Select
          value={selectedPresetId}
          onChange={(id) => handlePresetChange(id as Parameters<typeof handlePresetChange>[0])}
          options={CANVAS_PRESETS.map((preset) => ({
            value: preset.id,
            label: t(preset.labelKey),
          }))}
        />

        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center bg-[#f5f5f5] rounded px-2 py-0.5 border border-transparent hover:border-gray-300 transition-colors">
            <span className="text-[10px] text-gray-400 font-medium w-8 select-none flex items-center justify-center">{t('rightPanel.canvasWidthShort')}</span>
            <RealtimeNumberInput value={widthDisplay} onChange={handleWidthChange} invalid={!!widthError} />
          </div>
          <Select value={unit} onChange={handleUnitChange} options={unitOptions} />
          <div className="flex items-center bg-[#f5f5f5] rounded px-2 py-0.5 border border-transparent hover:border-gray-300 transition-colors">
            <span className="text-[10px] text-gray-400 font-medium w-8 select-none flex items-center justify-center">{t('rightPanel.canvasHeightShort')}</span>
            <RealtimeNumberInput value={heightDisplay} onChange={handleHeightChange} invalid={!!heightError} />
          </div>
          <Select value={unit} onChange={handleUnitChange} options={unitOptions} />
        </div>
        {widthError || heightError ? (
          <div className="text-[10px] text-red-600 font-medium">{widthError ?? heightError}</div>
        ) : null}

        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-medium">{t('rightPanel.backgroundColor')}</span>
            <div className="flex items-center gap-1">
              <Button variant="text" size="small" className="text-gray-600" onClick={undo} disabled={!canUndo}>
                {t('rightPanel.undoAction')}
              </Button>
              <Button variant="text" size="small" className="text-gray-600" onClick={redo} disabled={!canRedo}>
                {t('rightPanel.redoAction')}
              </Button>
            </div>
          </div>

          <Select
            value={backgroundMode}
            onChange={(mode) => {
              if (mode === 'image') {
                if (safeBackground.type === 'image') return;
                // 闁稿繐鐗嗛崯鎾诲礂閵壯€鏁?url 闁?image 闁煎啿鏈▍娆撴晬鐏炶棄绐楀ù锝呯箲鑶╃€殿喖楠忕槐閬嶆儑閻斿壊鍔€闁搞儱澧芥晶鏍導閸曨剛鐖遍柣銏犲船閹绱掗鐔哥€ù鐘茬埣閳ь剙顦扮€氥劍绻呴銏犲笭闁?
                setPageBackground({ type: 'image', url: '', fit: 'cover' });
                return;
              }
              if (safeBackground.type === 'image') {
                setPageBackground({ type: 'color', value: '#ffffff' });
              }
            }}
            options={[
              { value: 'image', label: t('rightPanel.bgImage') },
              { value: 'fill', label: t('rightPanel.bgColorGradient') },
            ]}
          />

          {safeBackground.type === 'image' ? (
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                className="text-[11px]"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  // 濞戞捁妗ㄧ划鍫熺▕閸綆鍤㈤柟?dataURL闁?
                  // 鐟滅増鎸告晶鐘绘嚄鐏炵偓鐝柛銉﹀劤閸樻稒绂掗妷銉ユ暥閻庢稒顭堢粊顐⑩攦閹邦厽鐓欑€殿喖绻戠敮鎾礂閵夘垳绀夐梺顒€鐏濋崢銈咁嚕閺囩偛寮冲Λ鐗堢箓椤︾粯绋夋繝浣虹倞婵炵繝鑳堕埢鍏肩▕閻旇鍘寸紒鏂款儏瀹撳棙锛愰崟顕呮綌闁?
                  const reader = new FileReader();
                  reader.onload = () => {
                    const url = String(reader.result || '');
                    setPageBackground({ type: 'image', url, fit: safeBackground.fit ?? 'cover' });
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <Select
                value={safeBackground.fit ?? 'cover'}
                onChange={(fit) => setPageBackground({ ...safeBackground, fit } as PageBackground)}
                options={[
                  { value: 'none', label: t('rightPanel.none') },
                  { value: 'tile', label: t('rightPanel.bgFitTile') },
                  { value: 'stretch', label: t('rightPanel.bgFitStretch') },
                  { value: 'cover', label: t('rightPanel.bgFitCover') },
                ]}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <FillPicker
                value={normalizeFillFromBackground(safeBackground)}
                onChange={(fill) => setPageBackground(nextBackgroundFromFill(fill))}
                size="small"
              />
              <span className="text-xs text-gray-500">{t('rightPanel.fill')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
