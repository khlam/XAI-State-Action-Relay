// Modules to control application life and create native browser window
import { app, BrowserWindow, ipcMain } from 'electron'
import { initConfig, saveToConfig } from './src/config'
import fetch from 'electron-fetch'
import path from 'path'

const request = require('request')
const fs = require('fs-extra')
const chokidar = require('chokidar')
const waitOn = require('wait-on');
const convert = require('xml-js');
var _ = require('lodash');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
export let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({ width: 420, height: 210, /*icon: 'assets/500x500.png',*/ 'web-preferences': { 'direct-write': false, 'subpixel-font-scaling': false } })

  // and load the index.html of the app.
  mainWindow.loadFile('dist/src-react/index.html')
  mainWindow.setResizable(false)
  // Open the DevTools.
  if (process.env.ENV === 'dev') {
    //mainWindow.webContents.openDevTools()
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
    console.log("Uploading new state to Google Sheets DB")
    request.post('https://script.google.com/macros/s/AKfycby1BvXRK7Cr6G_FbgIYZERXL9onihxmyxdWBVwikURxhUUZwdSP/exec', {
      formData: {
          'state': JSONBank,
      }
    }), (err) => {
      console.log("Upload err: ",err)
      return reject()
    }
    console.log("State Upload success.")
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
        console.log('Bank Change: ', path)

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
              currentStateJSON = newBank
              if ((parseInt(newBank['wave']) + 1) === parseInt(newBank['DecisionPoint'])) {
                console.log(`State Change: \t Wave ${newBank['wave']} \t Decision Point ${newBank['DecisionPoint']}`)
                jsonBank = JSON.stringify(newBank)
                console.log(jsonBank)
                uploadState(jsonBank)
              }
            })
          })
      })

      .on('error', function (error) {
        console.log('ERROR: ', error)
      })
    return watcher
}

function saveNewActionToBank(JSONAction) {
  console.log("Writing new action to bank file") 
  let data = `<?xml version="1.0" encoding="utf-8"?>
<Bank version="1">
    <Section name="action">
        <Key name="ImmortalsTop">
            <Value int="${JSONAction['ImmortalsTop']}"/>
        </Key>
        <Key name="DecisionPoint">
            <Value int="${JSONAction['DecisionPoint']}"/>
        </Key>
        <Key name="ImmortalsBottom">
            <Value int="${JSONAction['ImmortalsBottom']}"/>
        </Key>
        <Key name="MarinesBottom">
            <Value int="${JSONAction['MarinesBottom']}"/>
        </Key>
        <Key name="Pylons">
            <Value int="${JSONAction['Pylons']}"/>
        </Key>
        <Key name="BanelingsBottom">
            <Value int="${JSONAction['BanelingsBottom']}"/>
        </Key>
        <Key name="MarinesTop">
            <Value int="${JSONAction['MarinesTop']}"/>
        </Key>
        <Key name="BanelingsTop">
            <Value int="${JSONAction['BanelingsTop']}"/>
        </Key>
    </Section>
</Bank>`
  fs.writeFile(path.join(configObj.BankPath, 'action.SC2Bank'), data, (err) => { 
      if (err) throw err; 
  }) 
}

function newAction() {
  console.log(`Checking for new action to match current Decision Point (${currentStateJSON['DecisionPoint']})`)
  fetch("https://spreadsheets.google.com/feeds/list/1K76pT8RHJGJX396WAYpaMk-bYzozSjb_HK7_CQPnpvo/2/public/basic?alt=json")
  .then((res) =>{ return res.json() })
  .then((out) => {
      let newActionJSON = JSON.parse(out['feed']['entry'][0]['title']['$t'])
      let currentActionJSON
      if (currentStateJSON['DecisionPoint'] === newActionJSON['DecisionPoint']) {
        convertXMLtoJSON(path.join(configObj.BankPath, 'action.SC2Bank')).then( res => {
          currentActionJSON = res
          if (_.isEqual(currentActionJSON, newActionJSON) === false){
            console.log(`Action Decision Point matches current state, and it is not the same as the current action bank file. ${currentStateJSON['DecisionPoint']}/${newActionJSON['DecisionPoint']}`)
            saveNewActionToBank(newActionJSON)
          }
        })
      }
  })
}

// --- Initialization Start---
let configObj
let BankWatcher
let currentStateJSON 

initConfig().then(value => {
  configObj = value // Sets config settings
  return configObj
}).then(val => {
  convertXMLtoJSON(path.join(configObj.BankPath, 'state.SC2Bank')).then(res => {
    currentStateJSON = res
  })
  BankWatcher = initBankWatcher(configObj)
})
//  --- Initialization End---

// poll action JSON URL every 3 seconds
let intervalID = setInterval(newAction, 3000);


ipcMain.on('onModConfig', (e, newConfig) => {
  configObj = newConfig
  saveToConfig(newConfig)
  BankWatcher = initBankWatcher(configObj)
})

// need to wait for react to finishing building Dom
ipcMain.on('windowDoneLoading', () => {
  mainWindow.webContents.send('modConfig', configObj)
})