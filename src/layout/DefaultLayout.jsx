import React from 'react'
import { AppBanner, AppContent, AppSidebar, AppFooter, AppHeader, WebSocketManager } from '../components/index'

const DefaultLayout = () => {
  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />
        <div className="body flex-grow-1">
          <AppContent />
        </div>
        <AppFooter />
      </div>
      <WebSocketManager />
    </div>
  )
}

export default DefaultLayout
