import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './locales'
import { App } from './App.tsx'

/** 应用入口：初始化国际化与全局样式后，把根组件挂载到 `#root`。 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
