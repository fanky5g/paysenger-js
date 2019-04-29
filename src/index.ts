/* eslint-disable */

import {runTransaction} from "./transaction";

var Centrifuge = require("centrifuge");
var SockJS = require('sockjs-client');

export interface Project {
  pid: string;
  key: string;
};

export interface Config {
  nonce: string
  sessionId: string
  project: Project
  refreshNonce: (cb: (err?:Error, nonce?: string) => void) => void,
};

export default function (config:Config) {
  const self = this;
  self._config = config || {};
  self._pending = [];
  self._registeredCallbacks = {};

  if (typeof self._config.nonce !== "string" || self._config.nonce === "") {
    console.error("Failed to get nonce. Initial auth ticket required to start Paysenger.");
    return;
  }

  if (typeof self._config.sessionId !== "string" || self._config.sessionId === "") {
    console.error("Session Id not provided in config");
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
    // subscribeEndpoint: `wss://ps.paysenger.co/connect?ticket=${self._config.nonce}`,
    onRefresh: function() {}
  });

  self._client.on('connect', function (context) {
    // process chained transactions
    if (Boolean(self._pending.length)) {
      self._pending.forEach((action, index) => {
        self._pending.splice(index, 1);
        action();
      });
    }
  });

  self._client.on('message', function(data) {
    if (data.refreshTicket) {
      self._client._url = `wss://ps.paysenger.co/connect?ticket=${data.refreshTicket}`;
      // self._client._config.subscribeEndpoint = `wss://ps.paysenger.co/connect?ticket=${data.refreshTicket}`;
      self._config.nonce = data.refreshTicket;
    }
  });

  self._client.connect();

  return {
    runTransaction: runTransaction.bind(self),
  };
};