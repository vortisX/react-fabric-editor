import { useTranslation } from 'react-i18next';
import { Tabs } from '../../../../components/ui';
import { useEditorStore } from '../../../../store/useEditorStore';
import { CanvasPanel } from './CanvasPanel';
import { TextPanel } from './TextPanel';

/**
 * RightPanel 路由器：
 * - 无选中图层（点击画布/工作区空白）→ CanvasPanel（画布全局属性）
 * - 有文本图层选中（点击或新增）→ TextPanel（图层属性）
 */
export const RightPanel = () => {
  const { t } = useTranslation();
  const activeLayerId = useEditorStore((s) => s.activeLayerId);

  return (
    <aside className="w-[240px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-sm text-xs selection:bg-blue-100">
      <Tabs
        defaultActiveKey="1"
        className="w-full h-full flex flex-col"
        items={[
          {
            key: '1',
            label: <span className="text-[11px] font-medium">{t('rightPanel.propertiesConfig')}</span>,
            children: activeLayerId ? <TextPanel /> : <CanvasPanel />,
          },
        ]}
      />
    </aside>
  );
};
