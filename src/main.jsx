import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AdminApp from './admin/AdminApp.jsx'
import CollectorApp from './collector/CollectorApp.jsx'

const path = window.location.pathname
const Root = path.startsWith('/admin')     ? AdminApp
           : path.startsWith('/collector') ? CollectorApp
           : App

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
