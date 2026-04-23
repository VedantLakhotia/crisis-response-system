import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { HotelProvider } from './context/HotelContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HotelProvider>
      <App />
    </HotelProvider>
  </StrictMode>,
)

