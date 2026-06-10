import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { AuthProvider } from './auth/AuthContext'
import { FiltersProvider } from './context/FiltersContext'
import { ThemeProvider } from './context/ThemeContext'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <FiltersProvider>
          <RouterProvider router={router} />
        </FiltersProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
