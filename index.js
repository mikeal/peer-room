const resilientSwarm = require('../resilient-swarm')
const EventEmitter = require('events').EventEmitter
const util = require('util')
const uuid = a => a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,uuid)
const noopCallback = err => { if (err) console.error(err) }

function PeerRoom (room, signalHost, roomHost) {
  let swarm = resilientSwarm(signalHost)
  swarm.joinRoom(roomHost, room)
  this.swarm = swarm
  this.swarm.on('data:message', doc => {
    let mymessage = doc.value[this.swarm.publicKey]
    if (mymessage) {
      let value = this.swarm.decrypt(doc.from, mymessage)
      switch (value.type) {
        case 'buffer':
          value = new Buffer(value.value, 'hex')
          break
        case 'json':
          value = JSON.parse(value.value)
          break
        default:
          value = value.value
      }
      this.emit('message', value, doc.from)
    }
  })
}
util.inherits(PeerRoom, EventEmitter)
PeerRoom.prototype.write = function (data, cb) {
  let _value = {}
  if (!cb) cb = noopCallback
  if (Buffer.isBuffer(data)) {
    _value.type = 'buffer'
    _value.value = data.toString('hex')
  } else if (typeof data === 'string') {
    _value.type = 'string'
    _value.value = data
  } else {
    _value.type = 'json'
    _value.value = JSON.stringify(data)
  }
  _value = JSON.stringify(_value)
  this.swarm.activeKeys((err, keys) => {
    if (err) return cb(err)
    let message = {}
    keys.forEach(k => message[k] = this.swarm.encrypt(k, _value))
    var key = `message:${uuid()}`
    this.swarm.put(key, message, cb)
  })
}

window.PeerRoom = PeerRoom
