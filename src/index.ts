/* eslint-disable */

var Centrifuge = require("centrifuge");
var SockJS = require('sockjs-client');

export interface Project {
  pid: string;
  key: string;
};

export interface Config {
  nonce: string
  project: Project
  refreshNonce: (cb: (err?:Error, nonce?: string) => void) => void,
};

export default function (config:Config) {
  const self = this;
  self._config = config || {};

  if (typeof self._config.nonce !== "string") {
    console.error("Failed to get nonce. Initial auth ticket required to start Paysenger.");
    return;
  }

  if (typeof self._config.project !== "object") {
    console.error("project is required to initialize paysenger.");
    return;
  }

  if (!Object.hasOwnProperty.call(self._config.project, "pid")) {
    console.error("pid is missing in project");
    return;
  }

  if (!Object.hasOwnProperty.call(self._config.project, "key")) {
    console.error("missing apikey in project");
    return;
  }

  if (typeof self._config.refreshNonce !== "function") {
    console.error("refreshNonce function is required.");
    return;
  }

  self._client = new Centrifuge(`wss://ps.paysenger.co/connect?ticket=${self._config.nonce}`, {
    sockjs: SockJS,
    sockjsTransports: [
      'websocket',
      'xdr-streaming',
      'xhr-streaming',
      'eventsource',
      'iframe-eventsource',
      'iframe-htmlfile',
      'xdr-polling',
      'xhr-polling',
      'iframe-xhr-polling',
      'jsonp-polling'
    ],
    subscribeEndpoint: `wss://ps.paysenger.co/connect?ticket=${self._config.nonce}`,
    onRefresh: function() {}
  });

  self._client.on('connect', function (context) {});

  self._client.on('message', function(data) {
    if (data.refreshTicket) {
      self._client._url = `wss://ps.paysenger.co/connect?ticket=${data.refreshTicket}`;
      self._client._config.subscribeEndpoint = `wss://ps.paysenger.co/connect?ticket=${data.refreshTicket}`;
      self._config.nonce = data.refreshTicket;
    }
  });

  // this.client.subscribe("transactions", function(message) {
  //   console.log(message);
  // });

  self._client.connect();

  return self;
};