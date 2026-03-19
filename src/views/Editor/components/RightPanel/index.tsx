import { useTranslation } from 'react-i18next';
import { Tabs } from '../../../../components/ui';
import { useEditorStore } from '../../../../store/useEditorStore';
import { CanvasPanel } from './CanvasPanel';
import { TextPanel } from './TextPanel';
import { ImagePanel } from './ImagePanel';

/**
 * RightPanel 路由器：
 * - 无选中图层（点击画布/工作区空白）→ CanvasPanel（画布全局属性）
 * - 有文本图层选中 → TextPanel（文本图层属性）
 * - 有图片图层选中 → ImagePanel（图片图层属性）
 */
export const RightPanel = () => {
  const { t } = useTranslation();
  // 精确订阅 activeLayer，获取完整图层对象以判断 type
  const activeLayer = useEditorStore((s) => {
    if (!s.activeLayerId || !s.document) return null;
    const page = s.document.pages.find((p) => p.pageId === s.currentPageId) ?? s.document.pages[0];
    return page?.layers.find((l) => l.id === s.activeLayerId) ?? null;
  });

  const panel = activeLayer?.type === 'image'
    ? <ImagePanel />
    : activeLayer
      ? <TextPanel />
      : <CanvasPanel />;

  return (
    <aside className="w-60 bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-sm text-xs selection:bg-blue-100">
      <Tabs
        defaultActiveKey="1"
        className="w-full h-full flex flex-col"
        items={[
          {
            key: '1',
            label: <span className="text-[11px] font-medium">{t('rightPanel.propertiesConfig')}</span>,
            children: panel,
          },
        ]}
      />
    </aside>
  );
};
