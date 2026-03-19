import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../../store/useEditorStore';
import { Button, Tooltip, Select } from '../../../components/ui';
import { UndoIcon, RedoIcon, PlayIcon } from '../../../components/ui/Icons';
import { LANGUAGES } from '../../../locales';

export const Header = () => {
  const { t, i18n } = useTranslation();
  const title = useEditorStore((state) => state.document?.title);
  const canUndo = useEditorStore((state) => state.history.past.length > 0);
  const canRedo = useEditorStore((state) => state.history.future.length > 0);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('designx-lang', lang);
  };

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 justify-between shrink-0 z-20">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 bg-blue-600 text-white rounded flex items-center justify-center font-bold text-sm shadow-sm cursor-pointer">
          D
        </div>
        <span className="font-semibold text-gray-700 text-sm tracking-wide">{title}</span>
      </div>

      <div className="flex gap-2 items-center">
        <Tooltip title={t('header.undo')} placement="bottom">
          <Button variant="text" icon={<UndoIcon />} onClick={undo} disabled={!canUndo} />
        </Tooltip>
        <Tooltip title={t('header.redo')} placement="bottom">
          <Button variant="text" icon={<RedoIcon />} onClick={redo} disabled={!canRedo} />
        </Tooltip>
        
        <div className="w-px h-4 bg-gray-300 mx-3"></div>
        
        <Button icon={<PlayIcon />}>{t('header.preview')}</Button>
        <Button variant="primary">{t('header.export')}</Button>

        <div className="w-px h-4 bg-gray-300 mx-3"></div>

        <Select
          className="w-24"
          value={i18n.language}
          onChange={handleLanguageChange}
          options={LANGUAGES.map((l) => ({ value: l.code, label: l.label }))}
        />
      </div>
    </header>
  );
}
