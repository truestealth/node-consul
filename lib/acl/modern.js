import * as errors from "../errors.js";
import * as utils from "../utils.js";

function nullableBody(request, next) {
  if (request.res && request.res.statusCode === 404) {
    return next(false, utils.responseResult(request));
  }
  utils.body(request, next);
}

class AclResource {
  constructor(consul, name, path, listPath, identifier = "id") {
    this.consul = consul;
    this._name = name;
    this._path = "/acl/" + path;
    this._listPath = "/acl/" + listPath;
    this._identifier = identifier;
    this._requiredFields = [];
    this._createFields = [];
    this._filters = {};
  }

  _prepare(opts, operation) {
    if (typeof opts === "string") opts = { [this._identifier]: opts };
    opts = utils.defaults(utils.normalizeKeys(opts), this.consul._defaults);
    const req = {
      name: "acl." + this._name + "." + operation,
      path: this._path,
      query: {},
    };
    utils.options(req, opts);
    return { req, opts };
  }

  _identify(req, opts, byName = false) {
    const key = byName ? "name" : this._identifier;
    if (typeof opts[key] !== "string" || !opts[key]) {
      throw this.consul._err(errors.Validation(key + " required"), req);
    }
    if (byName && opts.id !== undefined) {
      throw this.consul._err(errors.Validation("use either id or name"), req);
    }
    req.path += (byName ? "/name/" : "/") + "{" + key + "}";
    req.params = { [key]: opts[key] };
  }

  async _write(options, update) {
    const { req, opts } = this._prepare(options, update ? "update" : "create");
    if (update) this._identify(req, opts);
    if (
      !opts.entry ||
      typeof opts.entry !== "object" ||
      Array.isArray(opts.entry)
    ) {
      throw this.consul._err(errors.Validation("entry required"), req);
    }
    const fields = update
      ? this._requiredFields
      : this._requiredFields.concat(this._createFields);
    for (const field of fields) {
      if (typeof opts.entry[field] !== "string" || !opts.entry[field]) {
        throw this.consul._err(
          errors.Validation("entry." + field + " required"),
          req,
        );
      }
    }
    req.type = "json";
    req.body = opts.entry;
    return await this.consul._put(req, utils.body);
  }

  create(opts) {
    return this._write(opts, false);
  }

  update(opts) {
    return this._write(opts, true);
  }

  async get(options) {
    const { req, opts } = this._prepare(options, "get");
    const byName =
      (this._name === "policy" || this._name === "role") &&
      opts.name !== undefined;
    this._identify(req, opts, byName);
    if (this._name === "token" && opts.expanded !== undefined) {
      if (typeof opts.expanded !== "boolean") {
        throw this.consul._err(
          errors.Validation("expanded must be a boolean"),
          req,
        );
      }
      // Consul включает expanded по наличию параметра, даже при значении false.
      if (opts.expanded) req.query.expanded = "true";
    }
    return await this.consul._get(req, nullableBody);
  }

  async list(options) {
    const { req, opts } = this._prepare(options, "list");
    req.path = this._listPath;
    for (const [option, query] of Object.entries(this._filters)) {
      if (opts[option] !== undefined) req.query[query] = opts[option];
    }
    return await this.consul._get(req, utils.body);
  }

  async del(options) {
    const { req, opts } = this._prepare(options, "del");
    this._identify(req, opts);
    return await this.consul._delete(req, utils.body);
  }
}

class AclToken extends AclResource {
  constructor(consul) {
    super(consul, "token", "token", "tokens");
    this._filters = {
      policy: "policy",
      role: "role",
      servicename: "servicename",
      authmethod: "authmethod",
      authmethodnamespace: "authmethod-ns",
    };
  }

  async self(options) {
    const { req } = this._prepare(options, "self");
    req.path += "/self";
    return await this.consul._get(req, nullableBody);
  }

  async clone(options) {
    const { req, opts } = this._prepare(options, "clone");
    this._identify(req, opts);
    req.path += "/clone";
    req.type = "json";
    req.body = {};
    if (opts.description !== undefined) req.body.Description = opts.description;
    return await this.consul._put(req, utils.body);
  }
}

class AclPolicy extends AclResource {
  constructor(consul) {
    super(consul, "policy", "policy", "policies");
    this._requiredFields = ["Name"];
  }
}

class AclRole extends AclResource {
  constructor(consul) {
    super(consul, "role", "role", "roles");
    this._requiredFields = ["Name"];
    this._filters = { policy: "policy" };
  }
}

class AclAuthMethod extends AclResource {
  constructor(consul) {
    super(consul, "authMethod", "auth-method", "auth-methods", "name");
    this._createFields = ["Name", "Type"];
  }
}

class AclBindingRule extends AclResource {
  constructor(consul) {
    super(consul, "bindingRule", "binding-rule", "binding-rules");
    this._requiredFields = ["BindType", "BindName"];
    this._createFields = ["AuthMethod"];
    this._filters = { authmethod: "authmethod" };
  }
}

export { AclToken, AclPolicy, AclRole, AclAuthMethod, AclBindingRule };
