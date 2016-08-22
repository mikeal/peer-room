const resilientSwarm = require('../resilient-swarm')

function PeerRoom (room, signalHost, roomHost) {
  let swarm = resilientSwarm(signalHost)
  swarm.joinRoom(roomHost, room)
  this.swarm = swarm
}

window.PeerRoom = PeerRoom