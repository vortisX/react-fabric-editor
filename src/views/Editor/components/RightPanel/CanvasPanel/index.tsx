import { CanvasLayoutSection } from './CanvasLayoutSection';

/** 画布面板：点击画布或工作区空白处时展示，包含画布尺寸、背景等全局属性 */
export const CanvasPanel = () => {
  return (
    <div className="overflow-y-auto h-[calc(100vh-40px)] pb-10 flex flex-col">
      <CanvasLayoutSection />
    </div>
  );
};
