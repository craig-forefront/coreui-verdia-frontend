import { legacy_createStore as createStore, combineReducers } from 'redux'

// Initial state for sidebar and theme
const initialState = {
  sidebarShow: true,
  theme: 'light',
}

// Initial state for banner
const initialStateBanner = {
  bannerText: 'MY//BANNER',
  bannerColor: 'bg-success',
}

// Reducer for sidebar and theme
const changeState = (state = initialState, { type, ...rest }) => {
  switch (type) {
    case 'set':
      return { ...state, ...rest }
    default:
      return state
  }
}

// Reducer for banner
const changeStateBanner = (state = initialStateBanner, action) => {
  switch (action.type) {
    case 'SET_BANNER_TEXT':
      return { ...state, bannerText: action.payload }
    case 'SET_BANNER_COLOR':
      return { ...state, bannerColor: action.payload }
    case 'UPDATE_BANNER':
      return { ...state, ...action.payload }
    default:
      return state
  }
}

// Combine reducers
const rootReducer = combineReducers({
  app: changeState,
  banner: changeStateBanner,
})

// Create store with combined reducers
const store = createStore(rootReducer)

export default store
