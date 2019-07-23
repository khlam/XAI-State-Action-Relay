import React, { Component } from 'react'
const {shell} = require('electron')
const base64 = require('base-64')
export class Settings extends Component {
    constructor (props) {
        super(props)
    }

    onModConfig() {
        const { config } = this.props
        config.BankPath = document.getElementById("BankPath").value
        this.props.onModConfig(config)
    }

    onOpenFP() {
        const { config } = this.props
        if (config.replayPath != ""){
            shell.openItem(config.replayPath)
        }
        return
    }

    render () {
        const { config } = this.props
        return (
            <div>
                <div className="row">
                    <table width="100%" className="settingsTable">
                        <tbody>
                            <tr>
                                <td><a href="#" onClick={this.onOpenFP.bind(this)}>Bank Directory</a></td>
                                <td><span><input id="BankPath" type="text" defaultValue={config.BankPath}></input></span></td>
                            </tr>
                        </tbody> 
                    </table>
                </div>
                <div className="row">
                    <button onClick={this.onModConfig.bind(this)}>Save</button>
                </div>
            </div>
        )
    }
}
