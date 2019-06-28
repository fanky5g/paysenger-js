import request from "./request";

export interface Momo {
  phoneNumber: string
  network: string
  voucherCode: string
};

export interface MomoRequest {
  phone_number: string
  network: string
  voucher_code: string
};

export interface Transaction {
  transactionId: string
  transactionType: string
  mock?: string
  amount: number
  callbackURL: string
  momo: Momo
};

interface TransactionRequest {
  pid: string
  request_type: string
  ticket: string
  callback_url: string
  mock?: string
  exttrid: string
  amount: number
  momo: MomoRequest
  card?: any // TODO: implement card transaction requests
};

export function runTransaction(transaction: Transaction, callback: (err?: Error, body?: any) => void) {
  // build and submit transaction
  // not validated... delegated validation to server for now

  const transactionRequest: TransactionRequest = {
    pid: this._config.project.pid,
    request_type: transaction.transactionType,
    ticket: this._config.nonce,
    callback_url: transaction.callbackURL,
    exttrid: transaction.transactionId,
    mock: transaction.mock,
    amount: transaction.amount,
    momo: {
      phone_number: transaction.momo.phoneNumber,
      network: transaction.momo.network,
      voucher_code: transaction.momo.voucherCode,
    },
  };

  const identifier = `transactions:${transaction.transactionId}`;
  this._registeredCallbacks[identifier] = callback;

  const subscription = this._client.subscribe(`transactions#${this._config.sessionId}`, (message) => {
    // message received from subscription
    console.log(message);
    const cb = this._registeredCallbacks[identifier];
    if (typeof cb === "function") {
      cb(message);
      // TODO: unsubscribe from receiving updates as transaction receives once?
    }
  });

  const action = (sub) => {
    request("POST", `https://api.paysenger.co/transactions/create`, transactionRequest, {
    headers: {Authorization: `Key ${this._config.project.key}`},
    }, (err) => {
      if (err) {
        // unsubscribe from updates to this transaction
        sub.unsubscribe();

        callback(err);
        return;
      }
    });
  };

  if (this._client.connected) {
    action(subscription);
  } else {
    // stack transaction for later processing
    this._pending.push(() => {
      action(subscription);
    });
  }
};