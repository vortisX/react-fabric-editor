import { useTranslation } from 'react-i18next';
import { Tabs } from '../../../../components/ui';
import { useEditorStore } from '../../../../store/useEditorStore';
import { handlePropChange, type PropChangeHandler } from './Layer.handlers';
import {
  LayoutSection,
  TypographySection,
  ColorFillSection,
  BorderStyleSection,
  LayerPropertiesSection,
} from './Sections';
import { CanvasLayoutSection } from './CanvasLayoutSection';
import type { TextLayer } from '../../../../types/schema';

export const RightPanel = () => {
  const { t } = useTranslation();

  // 只订阅当前激活图层，而非整个 document：
  // updateLayer 每次都创建新的 document 引用，若订阅 document 则文字拖动时面板以 60fps 重渲染；
  // 改为精确订阅 activeLayer 后，canvas resize / background 变更不会触发面板重渲染。
  const activeLayer = useEditorStore((state) => {
    if (!state.activeLayerId || !state.document) return null;
    const page =
      state.document.pages.find((p) => p.pageId === state.currentPageId) ??
      state.document.pages[0];
    return (page?.layers.find((l) => l.id === state.activeLayerId) ?? null) as TextLayer | null;
  });

  const onPropChange: PropChangeHandler = (key, value) => {
    if (activeLayer) {
      handlePropChange(activeLayer.id, key, value);
    }
  };

  const isTextLayer = activeLayer?.type === 'text';
  const textLayer = activeLayer as TextLayer;

  return (
    <aside className="w-[240px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-sm text-xs selection:bg-blue-100">
      <Tabs
        defaultActiveKey="1"
        className="w-full h-full flex flex-col"
        items={[
          {
            key: '1',
            label: <span className="text-[11px] font-medium">{t('rightPanel.propertiesConfig')}</span>,
            children: (
              <div className="overflow-y-auto h-[calc(100vh-40px)] pb-10 flex flex-col">
                <CanvasLayoutSection />
                {activeLayer ? (
                  <>
                    <LayoutSection layer={activeLayer} isTextLayer={isTextLayer} textLayer={textLayer} onPropChange={onPropChange} />
                    {isTextLayer && <TypographySection layer={textLayer} onPropChange={onPropChange} />}
                    <ColorFillSection layer={textLayer} onPropChange={onPropChange} />
                    <BorderStyleSection layer={textLayer} onPropChange={onPropChange} />
                    <LayerPropertiesSection layer={activeLayer} onPropChange={onPropChange} />
                  </>
                ) : (
                  <div className="px-4 py-6 text-gray-400 text-xs">{t('rightPanel.selectLayer')}</div>
                )}
              </div>
            ),
          },
        ]}
      />
    </aside>
  );
}
