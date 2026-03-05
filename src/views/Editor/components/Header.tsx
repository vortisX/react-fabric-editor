import { useEditorStore } from '../../../store/useEditorStore';
import { Button, Tooltip } from 'antd';
import { UndoOutlined, RedoOutlined, PlaySquareOutlined } from '@ant-design/icons';

export default function Header() {
  const title = useEditorStore((state) => state.document?.title);

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 justify-between shrink-0 z-20">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center font-bold text-sm shadow-sm cursor-pointer">
          D
        </div>
        <span className="font-semibold text-gray-700 text-sm tracking-wide">{title}</span>
      </div>

      <div className="flex gap-2 items-center">
        <Tooltip title="撤销 (Ctrl+Z)" placement="bottom">
          <Button type="text" icon={<UndoOutlined />} />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Y)" placement="bottom">
          <Button type="text" icon={<RedoOutlined />} />
        </Tooltip>
        
        <div className="w-px h-4 bg-gray-300 mx-3"></div>
        
        <Button icon={<PlaySquareOutlined />}>预览</Button>
        <Button type="primary">导出作品</Button>
      </div>
    </header>
  );
}