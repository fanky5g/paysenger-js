import "promise/polyfill";
import "whatwg-fetch";

const parseResponse = (response, callback) => {
  const headers = response.headers;
  const contentType = headers.get("Content-Type").toLowerCase().replace("; charset=utf-8", "");
  const unknownContentType = new Error("unknown response type");

  if (contentType) {
    if (contentType.toLowerCase() === "application/json") {
      response.json().then(result => {
        callback(null, result);
      }, (err) => {
        callback(err);
      });
    } else if (contentType.toLowerCase() === "text/html" || contentType.toLowerCase() === "text/plain") {
      response.text().then(result => {
        callback(null, result);
      }, (err) => {
        callback(err);
      });
    } else {
      console.log(contentType);
      callback(unknownContentType);
    }
  } else {
    callback(unknownContentType)
  }
};

export default (method = "POST", path, body, options, callback) => {
  options.headers = options.headers || {};

  return fetch(path, {
    method,
    // credentials: "include",
    credentials: "omit",
    mode: "cors",
    body: body ? JSON.stringify(body): null,
    headers: new Headers({
      "Content-Type": "application/json",
      ...(options.headers || {}),
    }),
  }).then(response => {
    if (response.ok) {
      parseResponse(response, callback);
    } else {
      parseResponse(response, (err, res) => {
        if (err) {
          callback(err);
          return;
        }

        callback(new Error(JSON.stringify(res)));
      });
      // callback(new Error("Request failed with statuscode " + response.status));
    }
  }).catch(err => callback(err));
};