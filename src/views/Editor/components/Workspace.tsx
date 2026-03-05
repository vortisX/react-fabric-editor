import { useEditorStore } from '../../../store/useEditorStore';

export default function Workspace() {
  const global = useEditorStore((state) => state.document?.global);

  if (!global) return null;

  return (
    <main className="flex-1 relative flex items-center justify-center overflow-auto">
      <div 
        className="bg-white shadow-xl relative transition-transform origin-center" 
        style={{ width: `${global.width}px`, height: `${global.height}px` }}
      >
        <canvas id="designx-canvas" className="absolute top-0 left-0 w-full h-full" />
      </div>
    </main>
  );
}