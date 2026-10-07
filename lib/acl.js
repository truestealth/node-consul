import { AclLegacy } from "./acl/legacy.js";
import {
  AclToken,
  AclPolicy,
  AclRole,
  AclAuthMethod,
  AclBindingRule,
} from "./acl/modern.js";
import * as errors from "./errors.js";
import * as utils from "./utils.js";

class Acl {
  constructor(consul) {
    this.consul = consul;
    this.legacy = new Acl.Legacy(consul);
    this.token = new Acl.Token(consul);
    this.policy = new Acl.Policy(consul);
    this.role = new Acl.Role(consul);
    this.authMethod = new Acl.AuthMethod(consul);
    this.bindingRule = new Acl.BindingRule(consul);
  }

  /**
   * Creates one-time management token if not configured
   */
  async bootstrap(opts) {
    opts = utils.normalizeKeys(opts);
    opts = utils.defaults(opts, this.consul._defaults);

    const req = {
      name: "acl.bootstrap",
      path: "/acl/bootstrap",
      type: "json",
    };

    if (opts.bootstrapsecret !== undefined) {
      req.body = { BootstrapSecret: opts.bootstrapsecret };
    }

    utils.options(req, opts);

    return await this.consul._put(req, utils.body);
  }

  /**
   * Check ACL replication
   */
  async replication(opts) {
    opts = utils.normalizeKeys(opts);
    opts = utils.defaults(opts, this.consul._defaults);

    const req = {
      name: "acl.replication",
      path: "/acl/replication",
      query: {},
    };

    utils.options(req, opts);

    return await this.consul._get(req, utils.body);
  }

  async login(opts) {
    opts = utils.defaults(utils.normalizeKeys(opts), this.consul._defaults);
    const req = {
      name: "acl.login",
      path: "/acl/login",
      type: "json",
      body: { AuthMethod: opts.authmethod, BearerToken: opts.bearertoken },
    };
    for (const field of ["authmethod", "bearertoken"]) {
      if (typeof opts[field] !== "string" || !opts[field]) {
        throw this.consul._err(errors.Validation(field + " required"), req);
      }
    }
    if (opts.meta !== undefined) req.body.Meta = opts.meta;
    utils.options(req, opts);
    return await this.consul._post(req, utils.body);
  }

  async logout(opts) {
    opts = utils.defaults(utils.normalizeKeys(opts), this.consul._defaults);
    const req = { name: "acl.logout", path: "/acl/logout" };
    utils.options(req, opts);
    return await this.consul._post(req, utils.body);
  }
}

Acl.Legacy = AclLegacy;
Acl.Token = AclToken;
Acl.Policy = AclPolicy;
Acl.Role = AclRole;
Acl.AuthMethod = AclAuthMethod;
Acl.BindingRule = AclBindingRule;

export { Acl };
