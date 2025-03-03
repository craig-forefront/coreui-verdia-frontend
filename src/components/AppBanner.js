import React from 'react'
import { connect } from 'react-redux'

const AppBanner = ({ position, bannerText, bannerColor }) => {
  const style = {
    position: 'sticky',
    height: '20px',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '0px',
    padding: '0px',
    ...(position === 'top' ? { top: 0 } : { bottom: 0 }),
  }

  return (
    <div className={`d-flex w-100 text-white center ${bannerColor}`} style={style}>
      {bannerText}
    </div>
  )
}

const mapStateToProps = (state) => ({
  bannerText: state.banner.bannerText,
  bannerColor: state.banner.bannerColor,
})

export default connect(mapStateToProps)(AppBanner)
