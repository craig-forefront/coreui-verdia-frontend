import React from 'react'
import { CFooter } from '@coreui/react'
import AppBanner from './AppBanner'

const AppFooter = () => {
  return (
    <CFooter position="sticky" className="px-0" 
      style={{ 
        marginBottom: 0, 
        paddingBottom: 0,
        paddingTop: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        minHeight: 'unset',
        height: 'auto',
      }} >
      <AppBanner position="bottom" />
    </CFooter>
  )
}

export default React.memo(AppFooter)
