import { combineReducers } from 'redux'

const configData = { "hash":"", "replayPath":"" }
const config = (state = configData, action) => {
  switch (action.type) {
    case 'modConfig':
      return action.data
    default:
      return state
  }
}

const dialogMsg = "Initilizing..."
const dialog = (state = dialogMsg, action) => {
  switch (action.type) {
    case 'newDialog':
      return action
    default:
      return state
  }
}

export const frame = combineReducers({
  config,
  dialog
})
