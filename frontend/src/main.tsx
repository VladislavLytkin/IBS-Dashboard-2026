import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { AuthProvider } from './auth/AuthContext'
import { FiltersProvider } from './context/FiltersContext'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <FiltersProvider>
        <RouterProvider router={router} />
      </FiltersProvider>
    </AuthProvider>
  </React.StrictMode>,
)
