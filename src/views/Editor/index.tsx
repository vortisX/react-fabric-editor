import { useEditorStore } from '../../store/useEditorStore';

import Header from './components/Header';
import LeftPanel from './components/LeftPanel';
import Workspace from './components/Workspace';
import RightPanel from './components/RightPanel';

export default function EditorView() {
  const isReady = useEditorStore((state) => state.document !== null);

  if (!isReady) {
    return <div className="h-screen flex items-center justify-center">加载中...</div>;
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