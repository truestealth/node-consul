import * as errors from "./errors.js";
import * as utils from "./utils.js";

function applyCas(consul, req, opts) {
  if (!opts.hasOwnProperty("cas")) return;

  if (
    !["number", "string", "bigint"].includes(typeof opts.cas) ||
    (typeof opts.cas === "number" && !Number.isSafeInteger(opts.cas)) ||
    (typeof opts.cas === "string" && !/^\d+$/.test(opts.cas))
  ) {
    throw consul._err(errors.Validation("cas must be a uint64 index"), req);
  }

  const index = BigInt(opts.cas);
  if (index < 0n || index > 0xffffffffffffffffn) {
    throw consul._err(errors.Validation("cas must be a uint64 index"), req);
  }

  req.query.cas = opts.cas;
}

class Config {
  constructor(consul) {
    this.consul = consul;
  }

  async get(opts) {
    opts = utils.defaults(utils.normalizeKeys(opts), this.consul._defaults);

    const req = {
      name: "config.get",
      path: "/config/{kind}/{name}",
      params: { kind: opts.kind, name: opts.name },
    };

    if (typeof opts.kind !== "string" || !opts.kind) {
      throw this.consul._err(errors.Validation("kind required"), req);
    }
    if (typeof opts.name !== "string" || !opts.name) {
      throw this.consul._err(errors.Validation("name required"), req);
    }

    utils.options(req, opts);

    return await this.consul._get(req, function (request, next) {
      if (request.res && request.res.statusCode === 404) {
        return next(false, utils.responseResult(request));
      }
      utils.body(request, next);
    });
  }

  async set(opts) {
    opts = utils.defaults(utils.normalizeKeys(opts), this.consul._defaults);

    const req = {
      name: "config.set",
      path: "/config",
      query: {},
      type: "json",
      body: opts.entry,
    };

    if (
      !opts.entry ||
      typeof opts.entry !== "object" ||
      Array.isArray(opts.entry)
    ) {
      throw this.consul._err(errors.Validation("entry required"), req);
    }
    if (typeof opts.entry.Kind !== "string" || !opts.entry.Kind) {
      throw this.consul._err(errors.Validation("entry.Kind required"), req);
    }
    if (typeof opts.entry.Name !== "string" || !opts.entry.Name) {
      throw this.consul._err(errors.Validation("entry.Name required"), req);
    }

    applyCas(this.consul, req, opts);
    utils.options(req, opts);

    return await this.consul._put(req, utils.body);
  }

  async list(opts) {
    if (typeof opts === "string") opts = { kind: opts };
    opts = utils.defaults(utils.normalizeKeys(opts), this.consul._defaults);

    const req = {
      name: "config.list",
      path: "/config/{kind}",
      params: { kind: opts.kind },
    };

    if (typeof opts.kind !== "string" || !opts.kind) {
      throw this.consul._err(errors.Validation("kind required"), req);
    }

    utils.options(req, opts);

    return await this.consul._get(req, utils.body);
  }

  async del(opts) {
    opts = utils.defaults(utils.normalizeKeys(opts), this.consul._defaults);

    const req = {
      name: "config.del",
      path: "/config/{kind}/{name}",
      params: { kind: opts.kind, name: opts.name },
      query: {},
    };

    if (typeof opts.kind !== "string" || !opts.kind) {
      throw this.consul._err(errors.Validation("kind required"), req);
    }
    if (typeof opts.name !== "string" || !opts.name) {
      throw this.consul._err(errors.Validation("name required"), req);
    }

    applyCas(this.consul, req, opts);
    utils.options(req, opts);

    return await this.consul._delete(req, function (request, next) {
      if (request.err || opts.hasOwnProperty("cas")) {
        return utils.body(request, next);
      }
      next(false, utils.responseResult(request, true));
    });
  }

  delete(opts) {
    return this.del(opts);
  }
}

export { Config };
