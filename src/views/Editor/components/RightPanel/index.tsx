import { useTranslation } from 'react-i18next';
import { Tabs } from '../../../../components/ui';
import { useEditorStore } from '../../../../store/useEditorStore';
import { handlePropChange } from './Layer.handlers';
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
  const activeLayerId = useEditorStore((state) => state.activeLayerId);
  const document = useEditorStore((state) => state.document);
  const { t } = useTranslation();

  const activeLayer = document?.pages[0]?.layers.find(
    (layer) => layer.id === activeLayerId,
  );

  const onPropChange = (key: any, value: any) => {
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
