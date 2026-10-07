import papi from "papi";

import { Acl } from "./acl.js";
import { Agent } from "./agent.js";
import { Catalog } from "./catalog.js";
import { Event } from "./event.js";
import { Health } from "./health.js";
import { Kv } from "./kv.js";
import { Query } from "./query.js";
import { Session } from "./session.js";
import { Status } from "./status.js";
import { Watch } from "./watch.js";
import { Transaction } from "./transaction.js";
import * as utils from "./utils.js";

class Consul extends papi.Client {
  constructor(opts) {
    opts = utils.defaults({}, opts);

    if (!opts.baseUrl) {
      opts.baseUrl =
        (opts.secure ? "https:" : "http:") +
        "//" +
        (opts.host || "127.0.0.1") +
        ":" +
        (opts.port || 8500) +
        "/v1";
    }
    opts.name = "consul";
    opts.type = "json";

    let agent;
    if (!opts.agent) {
      agent = utils.getAgent(opts.baseUrl);
      if (agent) {
        opts.agent = agent;
      }
    }

    let defaults;
    if (opts.defaults) {
      defaults = utils.defaultCommonOptions(opts.defaults);
    }
    delete opts.defaults;

    super(opts);

    if (defaults) this._defaults = defaults;

    this.acl = new Consul.Acl(this);
    this.agent = new Consul.Agent(this);
    this.catalog = new Consul.Catalog(this);
    this.event = new Consul.Event(this);
    this.health = new Consul.Health(this);
    this.kv = new Consul.Kv(this);
    this.query = new Consul.Query(this);
    this.session = new Consul.Session(this);
    this.status = new Consul.Status(this);
    this.transaction = new Consul.Transaction(this);
  }

  destroy() {
    if (this._opts.agent && this._opts.agent.destroy) {
      this._opts.agent.destroy();
    }
  }

  watch(opts) {
    return new Consul.Watch(this, opts);
  }

  static parseQueryMeta(res) {
    return utils.parseQueryMeta(res);
  }
}

Consul.Acl = Acl;
Consul.Agent = Agent;
Consul.Catalog = Catalog;
Consul.Event = Event;
Consul.Health = Health;
Consul.Kv = Kv;
Consul.Query = Query;
Consul.Session = Session;
Consul.Status = Status;
Consul.Transaction = Transaction;
Consul.Watch = Watch;

export { Consul };
