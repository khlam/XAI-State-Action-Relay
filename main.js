// Modules to control application life and create native browser window
import { app, BrowserWindow, ipcMain } from 'electron'
import { initConfig, saveToConfig } from './src/config'
import path from 'path'

const request = require('request')
const fs = require('fs-extra')
const randomstring = require('randomstring')
const base64 = require('base-64')
const chokidar = require('chokidar')
const waitOn = require('wait-on');
const convert = require('xml-js');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
export let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({ width: 500, height: 150, /*icon: 'assets/500x500.png',*/ 'web-preferences': { 'direct-write': false, 'subpixel-font-scaling': false } })

  // and load the index.html of the app.
  mainWindow.loadFile('dist/src-react/index.html')

  // Open the DevTools.
  if (process.env.ENV === 'dev') {
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.setMenu(null) // disable menu
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


function uploadReplay(configObj, replay) {
  return new Promise((resolve, reject) => {
    request.post('https://sc2replaystats.com/upload_replay.php', {
      formData: {
        'token': randomstring.generate(32),
        'upload_method': 'test_upload',
          'hashkey': base64.decode(configObj.hash),
          'timestamp': Math.round(+new Date() / 1000),
          'Filedata': {
              value: fs.readFileSync(replay),
              options: {
                  filename: path.basename(replay)
              }
          }
      }
    }), (err) => {
      console.log("Upload err: ",err)
      return reject()
    }
    return resolve()
  })
}


function convertXMLtoJSON(bankPath) {
  let json = {}
  let options = {
    compact: true
  }
  return new Promise((resolve, reject) => {
    let xml = fs.readFileSync(bankPath)
    xml = JSON.parse(convert.xml2json(xml, options))

    json = {
      'wave':                   xml['Bank']['Section'][0]['Key']['Value']['_attributes']['int'],
      'decisionPoint':          xml['Bank']['Section'][1]['Key']['Value']['_attributes']['int'],
    }   

    // Get Signals
    for(let j = 0; j < xml['Bank']['Section'][2]['Key'].length; j++) {
        json[xml['Bank']['Section'][2]['Key'][j]['_attributes']['name']] = xml['Bank']['Section'][2]['Key'][j]['Value']['_attributes']['fixed']
    }

    // Get Building counts
    for(let j = 0; j < xml['Bank']['Section'][3]['Key'].length; j++) {
      let temp = xml['Bank']['Section'][3]['Key'][j]['Value']['_attributes']['int']
      if (temp === undefined) {
        temp = xml['Bank']['Section'][3]['Key'][j]['Value']['_attributes']['fixed']
      }
      json[xml['Bank']['Section'][3]['Key'][j]['_attributes']['name']] = temp
    }
  
    // Get States
    for(let j = 0; j < xml['Bank']['Section'][4]['Key'].length; j++) {
      json[xml['Bank']['Section'][4]['Key'][j]['_attributes']['name']] = xml['Bank']['Section'][4]['Key'][j]['Value']['_attributes']['fixed']
    }

    // Get Units
    for(let j = 0; j < xml['Bank']['Section'][5]['Key'].length; j++) {
      json[xml['Bank']['Section'][5]['Key'][j]['_attributes']['name']] = xml['Bank']['Section'][5]['Key'][j]['Value']['_attributes']['int']
    }

    // Get Reward
    for(let j = 0; j < xml['Bank']['Section'][6]['Key'].length; j++) {
      json[xml['Bank']['Section'][6]['Key'][j]['_attributes']['name']] = xml['Bank']['Section'][6]['Key'][j]['Value']['_attributes']['fixed']
    }

    return resolve(json)
  })
}

function initBankWatcher (configObj) {
    const stateBankPath = path.join(configObj.BankPath, 'state.SC2Bank') // Only look for changes in state.SC2Bank
    const watcher = chokidar.watch(stateBankPath, { // Watches bankpath for XML change
      ignored: /(^|[/\\])\../,
      persistent: true,
      depth: 0
    })
    let jsonBank
    watcher
      .on('add', function (path) {
        console.log('New Bank: ', path)

        let opts = {
          resources: [path],
          delay: 1000, // initial delay in ms, default 0
          interval: 100, // poll interval in ms, default 250ms
          timeout: 30000, // timeout in ms, default Infinity
          window: 750, // stabilization time in ms, default 750ms
        };

        waitOn(opts, function (err) {
          if (err) { return handleError(err); }
            jsonBank = convertXMLtoJSON(path)
            console.log(jsonBank)
          })
      })

      .on('error', function (error) {
        console.log('ERROR: ', error)
      })
    return watcher
  }

// --- Initialization Start---
let configObj
let BankWatcher
initConfig().then(value => {
  configObj = value // Sets config settings
  return configObj
}).then(val => {
  BankWatcher = initBankWatcher(configObj)
})
//  --- Initialization End---


ipcMain.on('onModConfig', (e, newConfig) => {
  configObj = newConfig
  saveToConfig(newConfig)
})

// need to wait for react to finishing building Dom
ipcMain.on('windowDoneLoading', () => {
  mainWindow.webContents.send('modConfig', configObj)
})