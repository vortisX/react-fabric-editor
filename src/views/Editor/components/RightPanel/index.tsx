import { useTranslation } from 'react-i18next';
import { Tabs } from '../../../../components/ui';
import { useEditorStore } from '../../../../store/useEditorStore';
import { useLayerActions } from './useLayerActions';
import {
  LayoutSection,
  TypographySection,
  ColorFillSection,
  BorderStyleSection,
  LayerPropertiesSection,
} from './Sections';
import type { TextLayer } from '../../../../types/schema';

export default function RightPanel() {
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const document = useEditorStore((state) => state.document);
  const { t } = useTranslation();

  const activeLayer = document?.pages[0]?.layers.find(
    (layer) => layer.id === activeLayerId,
  );

  const { handlePropChange } = useLayerActions(activeLayer);

  // 未选中图层时显示空状态
  if (!activeLayer) {
    return (
      <aside className="w-[240px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-sm">
        <div className="h-10 border-b border-gray-100 flex items-center px-4 font-semibold text-[11px] text-gray-800 tracking-wide">
          {t('rightPanel.propertiesPanel')}
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
          {t('rightPanel.selectLayer')}
        </div>
      </aside>
    );
  }

  const isTextLayer = activeLayer.type === 'text';
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
                <LayoutSection layer={activeLayer} isTextLayer={isTextLayer} textLayer={textLayer} onPropChange={handlePropChange} />
                {isTextLayer && <TypographySection layer={textLayer} onPropChange={handlePropChange} />}
                <ColorFillSection layer={textLayer} onPropChange={handlePropChange} />
                <BorderStyleSection layer={textLayer} onPropChange={handlePropChange} />
                <LayerPropertiesSection layer={activeLayer} onPropChange={handlePropChange} />
              </div>
            ),
          },
        ]}
      />
    </aside>
  );
}
