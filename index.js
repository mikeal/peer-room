const resilientSwarm = require('../resilient-swarm')
const funky = require('../funky')
const moment = require('moment')
const EventEmitter = require('events').EventEmitter
const util = require('util')
const crypto = require('crypto')
const _ = require('lodash')
const bel = require('bel')
const WebTorrent = require('webtorrent')
const torrentClient = new WebTorrent()
const dragDrop = require('drag-drop')
const twemoji = require('twemoji')
const uuid = a => a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,uuid)
const md5 = data => crypto.createHash('md5').update(data).digest('hex')
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
      if (value.text) this.emit('message', value, doc.from)
      else if (value.magnet) this.emit('magnet', value, doc.from)
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

let defaultImage = 'https://www.gravatar.com/avatar/205e460b479e2e5b48aec07710c08d5'

let previewView = funky`
<div class="card">
  <div class="image" style="height:200px;">
    <canvas id="canvas"
      width="200"
      height="200"
      class="person"
      style="background: url('${ info => info.image || defaultImage }');
            background-size:contain"
      >
    </canvas>
  </div>
  <div class="extra content">
    <a>
      <i class="user icon"></i>
    <a class="header">${ info => info.name || '' }</a>
    </a>
  </div>
</div>
`

let modalView = funky`
<div class="ui modal small hidden" style="margin-top: -198.93px;">
  <div class="header">
    <div class="label">Your Info.</div>
    <div class="ui green tiny button save-button">Save</div>
  </div>
  <div class="content">
    <div class="ui form">
      <div class="field">
        <div class="two fields">
          <div class="field">
            <input type="text" name="realname" placeholder="Your Name" value="${
              info => info.name || ''
            }">
          </div>
          <div class="field">
            <input type="email" name="email" placeholder="me@example.com" value="${
              info => info.email || ''
            }">
          </div>
        </div>
      </div>
    </div>
    <div class="ui special cards">
      ${ previewView }
    </div>
  </div>
</div>
`

var commentView = funky`
<div class="comment">
  <a class="avatar">
    <img src="${c => c.gravatar}">
  </a>
  <div class="content" docid="${c => c._id}">
    <a class="author">${c => c.name}</a>
    <div class="metadata">
      <span class="date">${c => moment(c.ts).fromNow()}</span>
    </div>
    <div class="text">
      ${c => bel('<div>' + c.text + '</div>') }
    </div>
  </div>
</div>`

var torrentView = funky`
<div class="item" id="a${ (c, t) => t.infoHash }" docid="${c => c._id}">
  <a class="ui tiny image">
    <img src="${c => c.gravatar}">
  </a>
  <div class="content">
    <a class="header">${c => c.name}</a>
     <div class="meta">${c => moment(c.ts).fromNow()}</div>
    <span class="numpeers">${ (c, t) => t.numPeers }</span> Peers
    <div class="description">
       ${ (c, t) => t.files.map((f,i) => bel`<div class="torrent-file" id=a${t.infoHash + i}></div>`)
        }
    </div>
  </div>
</div>
`

let signalHost = 'http://localhost:6688'
let roomHost = 'http://localhost:6689'
const mynode = new PeerRoom('testroom', signalHost, roomHost)
const people = {}
window.mynode = mynode

function addComment (obj) {
  obj.gravatar = obj.gravatar || people[obj.publicKey].gravatar
  let elem = commentView(obj)
  elem._obj = obj
  $('#comment-container').prepend(elem)
  twemoji.parse(document.body)
}

function addTorrent (obj, localTorrent) {
  obj.gravatar = obj.gravatar || people[obj.publicKey].gravatar
  console.log('addTorrent')

  function onTorrent (torrent) {
    console.log('Client is downloading:', torrent.infoHash)

    let elem = torrentView(obj, torrent)
    $('#comment-container').prepend(elem)

    setTimeout(() => {
      for (var i = 0; i < torrent.files.length; i++) {
        console.log(`div#a${ torrent.infoHash }${i}`)
        torrent.files[i].appendTo(`div#a${ torrent.infoHash }${i}`)
      }
    }, 1)
  }

  if (obj.torrent) {
    onTorrent(obj.torrent)
  } else {
    torrentClient.add(obj.magnet, onTorrent)
  }
}

const elemById = id => document.getElementById(id)

$('#sayit').click(() => {
  let text = elemById('commentbox').value.replace(/&nbsp;/g, ' ')
  let ts = Date.now()
  let info = readConfig()
  let publicKey = mynode.swarm.publicKey
  let name = info.name
  let gravatar = info.gravatar
  console.log({text, ts})
  mynode.write({text, ts})
  addComment({text, ts, publicKey, name, gravatar})
})

const personView = funky`
<div class="card small avatar" class="avatar" pubkey="${c => c.from}">
  <div class="image">
    <img src="${c => c.gravatar}">
  </div>
</div>
`

const peopleView = funky`
<div class="ui six cards" id="people">
  ${ _people => _people.map(personView) }
</div>
`

document.getElementById('people-list').appendChild(peopleView([]))

mynode.swarm.on('data:peer', (doc) => {
  doc.gravatar = `http://www.gravatar.com/avatar/${md5(doc.value.email)}?s=2048`
  people[doc.from] = doc
  let _people = _.orderBy(_.values(people), p => p.value.name)
  document.getElementById('people').update(_people)
})

mynode.on('message', ({text, ts}, publicKey) => {
  if (!people[publicKey]) return console.error("Don't know about this person.")
  let p = people[publicKey]
  let comment = {text, publicKey, ts, name: p.value.name, gravatar: p.gravatar}
  addComment(comment)
})

mynode.on('magnet', ({magnet, ts}, publicKey) => {
  if (!people[publicKey]) return console.error("Don't know about this person.")
  let p = people[publicKey]
  let obj = {magnet, publicKey, ts, name: p.value.name, gravatar: p.gravatar}
  addTorrent(obj)
})

function readConfig () {
  return JSON.parse(localStorage.getItem('infoCache'))
}

function config () {
  let info
  // Bring up modal to capture join info.
  let _update = () => {
    info.name = $('input[name=realname]').val()
    info.email = $('input[name=email]').val()
    info.gravatar = `http://www.gravatar.com/avatar/${md5(info.email)}?s=2048`
    $('div.card')[0].update(info)
  }
  if (localStorage.getItem('infoCache')) {
    info = readConfig()
  }
  info = info || {}
  var elem = modalView(info)
  console.log(elem)
  document.body.appendChild(elem)
  $('.ui.modal')
  .modal('show')
  .on('input', () => {
    _update()
  })
  $('div.save-button').click(function () {
    _update()
    localStorage.setItem('infoCache', JSON.stringify(info))
    mynode.swarm.setInfo(info)
    $('.ui.modal').modal('hide')
  })
}

if (localStorage.getItem('infoCache')) {
  let info = JSON.parse(localStorage.getItem('infoCache'))
  mynode.swarm.setInfo(info)
} else {
  config()
}

$('i.settings').click(config)

function onDrop (files) {
  $('#upload-modal').modal('show')
  torrentClient.seed(files, function (torrent) {
    console.log('Client is seeding:', torrent.infoHash)
    let ts = Date.now()
    let info = readConfig()
    let publicKey = mynode.swarm.publicKey
    let name = info.name
    let gravatar = info.gravatar
    let magnet = torrent.magnetURI
    mynode.write({magnet, ts})
    $('#upload-modal').modal('hide')
    addTorrent({torrent, ts, publicKey, name, gravatar})
  })
}

dragDrop('body', {
  onDrop: onDrop,
  onDragOver: () => $('#drag-modal').modal('show'),
  onDragLeave: () => $('#drag-modal').modal('hide')
})