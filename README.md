# Peer Room

[![Greenkeeper badge](https://badges.greenkeeper.io/mikeal/peer-room.svg)](https://greenkeeper.io/)

Peer Room is an experiment in secure web based p2p systems.

The entire application is in the browser client which is hosted as a `gh-pages`
static web application at https://mikeal.github.io/peer-room/.

## Primary Experiments

There a few primary experiments this project seeks to resolve.

* Explore the viability of encrypting messages one-to-many using browser based
encryption.
  * This could be too slow at a particular scale, but what scale is still
    unknown.
* Explore the viability of persisting messages into the network via an
  in-memory shared and replicated database.
  * Is this fast enough?
  * How long until you expire database items?
  * Is this a more performant way to send the messages through the network have
    direct RPC?

## Secondary Experiments

In addition to the above experiments this project is built on some underlying
projects and ideas that are also quite experimental.

### Decentralized offline available authentication w/ crypto

The basic idea is to have applications internally keep a list of known public
keys for services that can authenticate users (either by email or other means).

A user will interact with an authentication service and get it's key signed by
the service. That peer will keep around that publice/private key-pair and sign
the temporary key-pairs used for identifying itself on the network. This signing
chain will then be embedded in the message it sends so that consumers of that
data can authenticate that user without ever touching the network or talking to
the centralized service.

### Temporary in-memory public/private key-pairs for identification.

While it is useful to authenticate the identify of the authors of various
messages this also opens up a vector for tracking that person as they
join signal exchanges and rooms.

To get around this we create throw-away public/private key-pairs to serve
as the identification for that single connection to a given network. Once
the user has joined the network it can add signature chains to the messages
it sends if it wants to let people know its longer term identification
information.

### Resilient-Swarm

Resilient-swarm which underlies Peer Room is also highly experiment. Consult
the [README](https://github.com/mikeal/resilient-swarm/blob/master/README.md)
for a full list of those experiments but a few of them are:

  * In network signal exchanging via document replication.
  * In network relay for slower peers.

### Signal Exchange

Signal Exchange is a signal broker that relies on publicKeys as the identifying
information between two peers. This allows one node to "call* another node
without the exchange service being able to read the signal.

### Room Exchange

Room exchange is a service that holds the last X number of peers for a given
"room." The exchange requires that any peer reading the list also ad itself to
the exchange.