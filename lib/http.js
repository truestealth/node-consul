import { EventEmitter } from "node:events";
import http from "node:http";
import https from "node:https";
import { performance } from "node:perf_hooks";
import { stringify } from "node:querystring";

import * as errors from "./errors.js";
import { parseDuration } from "./utils.js";

function abortError(message, cause) {
  const error = errors.Consul(message);
  error.name = "AbortError";
  error.code = "ABORT_ERR";
  error.isAbort = true;
  if (cause !== undefined) error.cause = cause;
  return error;
}

class HttpClient extends EventEmitter {
  constructor(options) {
    super();
    const opts = { ...options };
    if (typeof opts.baseUrl !== "string" && !(opts.baseUrl instanceof URL)) {
      throw errors.Validation("baseUrl must be a string or URL");
    }
    const url = new URL(opts.baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw errors.Validation("baseUrl must use http or https");
    }
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      throw errors.Validation("baseUrl must not end with a forward slash");
    }
    const baseUrl = {
      protocol: url.protocol,
      hostname: url.hostname.replace(/^\[|\]$/g, ""),
      path: url.pathname === "/" ? "" : url.pathname,
    };
    if (url.port) baseUrl.port = url.port;
    if (url.username || url.password) {
      baseUrl.auth =
        decodeURIComponent(url.username) +
        ":" +
        decodeURIComponent(url.password);
    }
    opts.baseUrl = baseUrl;
    opts.headers = Object.fromEntries(
      Object.entries(opts.headers || {}).map(([name, value]) => [
        name.toLowerCase(),
        value,
      ]),
    );
    this._opts = opts;
    this._requests = new Set();
    this._destroyed = false;
  }

  _err(error, options) {
    error.message =
      "consul: " +
      (options && options.name ? options.name + ": " : "") +
      error.message;
    return error;
  }

  _get(options, callback) {
    return this._request({ ...options, method: "GET" }, callback);
  }

  _put(options, callback) {
    return this._request({ ...options, method: "PUT" }, callback);
  }

  _post(options, callback) {
    return this._request({ ...options, method: "POST" }, callback);
  }

  _delete(options, callback) {
    return this._request({ ...options, method: "DELETE" }, callback);
  }

  async _request(options, callback) {
    const started = performance.now();
    const request = { opts: options, ctx: options.ctx };
    try {
      request.res = await this._send(options);
    } catch (error) {
      request.err = error;
      request.res = error.response;
    }
    let failure;
    let value;
    try {
      value = await new Promise((resolve, reject) => {
        callback(request, (error, value) => {
          if (error) return reject(this._err(error, options));
          if (value instanceof Error) return reject(value);
          resolve(value);
        });
      });
    } catch (error) {
      failure = error;
    }
    let outcome = "success";
    if (failure) {
      if (failure.isAbort) outcome = "abort";
      else if (failure.isTimeout) outcome = "timeout";
      else if (failure.isCodec) outcome = "codec-error";
      else if (failure.isResponse) outcome = "http-error";
      else if (failure.isValidation) outcome = "validation-error";
      else if (failure.code) outcome = "network-error";
      else outcome = "error";
    }
    const data = {
      name: options.name || "request",
      method: options.method,
      durationMs: performance.now() - started,
      outcome,
    };
    if (request.res) data.statusCode = request.res.statusCode;
    if (failure && failure.code) data.errorCode = failure.code;
    this.emit("log", ["consul", request.res ? "response" : "error"], data);
    if (failure) throw failure;
    return value;
  }

  _send(options) {
    if (this._destroyed) {
      throw errors.Validation("client destroyed");
    }
    const ctx = options.ctx;
    if (ctx && (ctx.canceled === true || ctx.finished === true)) {
      throw errors.Validation("ctx already canceled or finished");
    }
    const signal = options.signal;
    if (signal && !(signal instanceof AbortSignal)) {
      throw errors.Validation("signal must be an AbortSignal");
    }
    if (signal && signal.aborted) {
      throw abortError("request aborted", signal.reason);
    }
    let timeout = options.timeout ?? this._opts.timeout ?? 0;
    if (typeof timeout === "string") timeout = parseDuration(timeout);
    if (!Number.isFinite(timeout) || timeout < 0) {
      throw errors.Validation("timeout must be a nonnegative duration");
    }
    let path = options.path.replace(/\{(\w+)\}/g, (placeholder, name) => {
      if (!Object.hasOwn(options.params || {}, name)) {
        throw errors.Validation("missing param: " + name);
      }
      return encodeURIComponent(options.params[name]);
    });
    const query = stringify(options.query);
    if (query) path += "?" + query;
    const headers = { ...this._opts.headers, ...options.headers };
    let body = options.body;
    if (body !== undefined) {
      if (!Buffer.isBuffer(body)) {
        body = Buffer.from(
          options.type === "text" ? body : JSON.stringify(body),
        );
      }
      if (headers["content-type"] === undefined) {
        headers["content-type"] =
          options.type === "text"
            ? "text/plain; charset=utf-8"
            : "application/json; charset=utf-8";
      }
      headers["content-length"] = body.length;
    }
    const baseUrl = this._opts.baseUrl;
    const transport = baseUrl.protocol === "https:" ? https : http;
    return new Promise((resolve, reject) => {
      let done = false;
      let timer;
      let cancel;
      let receivedResponse;
      const req = transport.request({
        ...this._opts,
        ...baseUrl,
        method: options.method,
        path: baseUrl.path + path,
        headers,
        signal: undefined,
        timeout: 0,
      });
      const finish = (error, response) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (ctx) ctx.removeListener("cancel", cancel);
        if (signal) signal.removeEventListener("abort", cancel);
        this._requests.delete(cancel);
        if (error) {
          if (receivedResponse) error.response = receivedResponse;
          if (error.code === "ABORT_ERR") error.isAbort = true;
          reject(error);
        } else {
          resolve(response);
        }
      };
      cancel = () => {
        const error = abortError("request aborted", signal && signal.reason);
        finish(error);
        // На EOF Node может уже вернуть сокет в Agent: не отправляем Error в сокет.
        req.destroy();
      };
      this._requests.add(cancel);
      req.once("error", finish);
      if (ctx) ctx.once("cancel", cancel);
      if (signal) {
        signal.addEventListener("abort", cancel, { once: true });
        if (signal.aborted) return cancel();
      }
      if (timeout > 0) {
        timer = setTimeout(() => {
          const error = errors.Consul("request timed out (" + timeout + "ms)");
          error.code = "ETIMEDOUT";
          error.isTimeout = true;
          finish(error);
          req.destroy();
        }, timeout);
      }
      req.once("response", (response) => {
        receivedResponse = response;
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.once("error", finish);
        response.once("end", () => {
          if (done) return;
          const buffer = Buffer.concat(chunks);
          const mime = (response.headers["content-type"] || "")
            .split(";")[0]
            .trim();
          try {
            if (options.buffer) {
              response.body = buffer;
            } else if (buffer.length) {
              response.body =
                mime === "application/json" || mime.endsWith("+json")
                  ? JSON.parse(buffer.toString())
                  : mime === "text/plain"
                    ? buffer.toString()
                    : buffer;
            }
          } catch (error) {
            error.isCodec = true;
            error.response = response;
            return finish(error);
          }
          if (response.statusCode < 200 || response.statusCode >= 300) {
            const error = errors.Consul(
              typeof response.body === "string" && response.body.length < 80
                ? response.body
                : (
                    http.STATUS_CODES[response.statusCode] || "request failed"
                  ).toLowerCase(),
            );
            error.isResponse = true;
            error.statusCode = response.statusCode;
            error.response = response;
            return finish(error);
          }
          finish(undefined, response);
        });
      });
      req.end(body);
    });
  }

  destroy() {
    this._destroyed = true;
    for (const cancel of this._requests) cancel();
  }
}

export { HttpClient };
