import React from 'react'
import { AppBanner, AppContent, AppSidebar, AppFooter, AppHeader } from '../components/index'
import WebSocketManager from '../components/WebSocketManager'

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
      {/* WebSocket manager placed outside UI components so it persists across route changes */}
      <WebSocketManager />
    </div>
  )
}

export default DefaultLayout
