import { useTranslation } from 'react-i18next';
import { Tabs } from '../../../../components/ui';
import { findLayerById } from '../../../../core/layers/layerTree';
import { useEditorStore } from '../../../../store/useEditorStore';
import { CanvasPanel } from './CanvasPanel';
import { GroupPanel } from './GroupPanel';
import { TextPanel } from './TextPanel';
import { ImagePanel } from './ImagePanel';

/**
 * RightPanel 璺敱鍣細
 * - 鏃犻€変腑鍥惧眰锛堢偣鍑荤敾甯?宸ヤ綔鍖虹┖鐧斤級鈫?CanvasPanel锛堢敾甯冨叏灞€灞炴€э級
 * - 鏈夋枃鏈浘灞傞€変腑 鈫?TextPanel锛堟枃鏈浘灞傚睘鎬э級
 * - 鏈夊浘鐗囧浘灞傞€変腑 鈫?ImagePanel锛堝浘鐗囧浘灞傚睘鎬э級
 */
export const RightPanel = () => {
  const { t } = useTranslation();
  // 涓轰粈涔堣繖閲岀洿鎺ヤ粠 activeLayerId 鍙嶆煡瀹屾暣鍥惧眰锛?
  // 鍙充晶闈㈡澘闇€瑕佹牴鎹湡瀹?layer.type 璺敱鍒颁笉鍚岄潰鏉匡紝鍙闃?id 涓嶈冻浠ュ喅瀹氭覆鏌撳垎鏀€?
  const activeLayer = useEditorStore((s) => {
    if (!s.activeLayerId || !s.document) return null;
    const page = s.document.pages.find((p) => p.pageId === s.currentPageId) ?? s.document.pages[0];
    return page ? findLayerById(page.layers, s.activeLayerId) ?? null : null;
  });

  const panel = activeLayer?.type === 'image'
    ? <ImagePanel />
    : activeLayer?.type === 'text'
      ? <TextPanel />
      : activeLayer?.type === 'group'
        ? <GroupPanel />
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
