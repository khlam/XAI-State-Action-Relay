import React, { Component } from 'react'
const {shell} = require('electron')
const {dialog} = require('electron').remote


export class Settings extends Component {
    constructor (props) {
        super(props)
    }
    
    onModConfig() {
        const { config } = this.props
        config.BankPath = document.getElementById("BankPath").value
        this.props.onModConfig(config)
    }

    onChooseFolder(){
        const { config } = this.props
        const path = dialog.showOpenDialog({ properties: ['openDirectory'], defaultPath: config.BankPath })
        if (path !== undefined) {
          settings.addonDir = path[0]
          this.props.onNewSettings(settings)
        }
        return
    }

    render () {
        const { config, dialog } = this.props
        return (
            <div>
                <div className="row">Bank Directory</div>
                <div className="row">
                        <input id="BankPath" type="text" onClick={this.onChooseFolder.bind(this)} defaultValue={config.BankPath}></input>
                        <button onClick={this.onModConfig.bind(this)}>Save</button>
                </div>
                <div className="row" className="debug">
                    <center>{dialog.data}</center>
                </div>
                <div className="row">
                    <center><a href="#" onClick={() => shell.openExternal('https://github.com/khlam/XAI-State-Action-Relay')}>Source</a> - <a href="#" onClick={() => shell.openExternal('https://github.com/khlam/XAI-State-Action-Relay/blob/master/README.md')}>Instructions</a></center>
                    <center> Created 2019 by <a href="#" onClick={() => shell.openExternal('https://github.com/khlam')}>@khlam</a> for <a href="#" onClick={() => shell.openExternal('https://github.com/osu-xai')}>@osu-xai</a> </center>
                </div>
            </div>
        )
    }
}
