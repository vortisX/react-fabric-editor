import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../store/useEditorStore';

import { Header } from './components/Header';
import { LeftPanel } from './components/LeftPanel';
import { Workspace } from './components/Workspace/index';
import { RightPanel } from './components/RightPanel';

/** 编辑器页面主视图，组合头部、左侧栏、工作区和右侧属性面板。 */
export const EditorView = () => {
  const { t } = useTranslation();
  const isReady = useEditorStore((state) => state.document !== null);

  if (!isReady) {
    // 文档未准备好时先展示轻量加载态，避免空白页面闪烁。
    return <div className="h-screen flex items-center justify-center">{t('editor.loading')}</div>;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#e5e5e5] overflow-hidden text-[12px]">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        <Workspace />
        <RightPanel />
      </div>
    </div>
  );
}
