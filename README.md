# XAI State Action Relay

Created for [OSU XAI 2019](https://github.com/osu-xai) Tug of War 2-Lane Scenario.

## Overview
This program allows a human (Player 1) playing the Tug of War Scenario on a native Starcraft 2 client to play against a trained model (Player 2) running on a remote Linux machine.
This is accomplished by using Starcraft 2’s custom map Bank feature, which allows us to save information into a local XML file.
When a decision point is reached, the game will pause and all relevant state information about the map will be written to a file called `state.SC2Bank`.
Upon detecting new state information, XAI-State-Action-Relay shall convert the XML file into JSON and upload the result to a network location.
On a separate computer running a trained model, a host script shall poll this network location for new state information.
Upon receiving a new state, the JSON state information is parsed and fed into the agent.
The resulting action is uploaded to a network location.
Back on the client computer playing Starcraft, XAI-State-Action-Relay continuously polls a network location for a new action.
Upon detecting a new action has been issued from the agent, and verifying that the issued action matches the current game's decision point, XAI-State-Action-Relay shall convert the action into XML and write the result to a file called `action.SC2Bank`.
A subroutine in the Tug of War map shall detect a change in `action.SC2Bank`, execute the actions on behalf of Player 2, and unpause the game.
This routine repeats until the game terminates.

## How To Run
1. Download and install the [latest version](https://github.com/khlam/XAI-State-Action-Relay/releases/latest) for your operating system.
2. Launch Starcraft 2.
3. In Starcraft 2, open the Tug of War custom map by going to *Custom* > *Arcade* and searching for the map name `OSU XAI Tug Of War`.
4. After creating a new lobby by clicking `Create New Lobby`, add an AI opponent for Player 2. This will convert the map to the correct Human-vs-Agent mode. (Note that the Starcraft game AI set here is NOT using our trained model.)
5. Launch the State Action Relay (Downloaded and installed in step 1). Navigate to the Starcraft Bank directory and click "save". On Windows the path is something like `Documents\StarCraft II\Accounts\<Your Account number>\<Player handle>\Banks\<Map publisher handle>\`. Note that launching the game for the first time initilizes and creates the folders.
6. Once all appropriate paths have been set, the State Action Relay program will automatically upload new state information and pull the response from the remote agent if it's running.
