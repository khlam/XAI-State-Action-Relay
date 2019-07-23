// Modules to control application life and create native browser window
import { app, BrowserWindow, ipcMain } from 'electron'
import { initConfig, saveToConfig } from './src/config'
import path from 'path'

const request = require('request')
const fs = require('fs-extra')
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


function uploadState(JSONBank) {
  return new Promise((resolve, reject) => {
    console.log(JSONBank)
    request.post('https://script.google.com/macros/s/AKfycby1BvXRK7Cr6G_FbgIYZERXL9onihxmyxdWBVwikURxhUUZwdSP/exec', {
      formData: {
          'state': JSONBank,
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

    xml['Bank']['Section']['Key'].forEach( val => {
      let tmp = val['Value']['_attributes']['int']
      if (tmp === undefined) {
        tmp = val['Value']['_attributes']['fixed']
      }
      json[val['_attributes']['name']] = tmp
    })

    json = JSON.stringify(json)
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
      .on('change', function (path) {
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
            convertXMLtoJSON(path).then( newBank => {
              console.log(newBank)
              uploadState(newBank)
            })
          })
      })

      .on('error', function (error) {
        console.log('ERROR: ', error)
      })
    return watcher
}

function initActionBankWatcher(configObj) {
  const stateBankPath = path.join(configObj.BankPath, 'action.SC2Bank') // Only look for changes in action.SC2Bank
  const watcher = chokidar.watch(stateBankPath, { // Watches bankpath for XML change
    ignored: /(^|[/\\])\../,
    persistent: true,
    depth: 0
  })
  let jsonBank
  watcher
    .on('change', function (path) {
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
          convertXMLtoJSON(path).then( newBank => {
            console.log(newBank)
            uploadState(newBank)
          })
        })
    })

    .on('error', function (error) {
      console.log('ERROR: ', error)
    })
  return watcher
}

function saveNewState() {


  /*
  const request = net.request({
    method: 'GET',
    protocol: 'https:',
    hostname: 'github.com',
    port: 443,
    path: '/'
  })
  */

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
  BankWatcher = initBankWatcher(configObj)
})

// need to wait for react to finishing building Dom
ipcMain.on('windowDoneLoading', () => {
  mainWindow.webContents.send('modConfig', configObj)
})