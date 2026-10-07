import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import * as helper from "./helper.js";

helper.describe("Catalog", function () {
  before(async function () {
    await helper.before(this);

    this.service = {
      name: "service-" + randomUUID(),
      tag: "tag-" + randomUUID(),
    };

    await this.c1.agent.service.register({
      name: this.service.name,
      tags: [this.service.tag],
    });

    await helper.retry(async () => {
      const data = await this.c1.catalog.services();

      if (!data || !data.hasOwnProperty(this.service.name)) {
        throw new Error("Service not created: " + this.service.name);
      }
    });
  });

  after(async function () {
    await helper.after(this);
  });

  describe("datacenters", function () {
    it("should return all known datacenters", async function () {
      const data = await this.c1.catalog.datacenters();
      assert.deepEqual(data, ["dc1"]);
    });
  });

  describe("node", function () {
    describe("list", function () {
      it("should return all nodes in the current dc", async function () {
        const data = await this.c1.catalog.node.list();
        assert.partialDeepStrictEqual(data[0], {
          Node: "node1",
          Address: "127.0.0.1",
        });
      });

      it("should return all nodes in specified dc", async function () {
        const data = await this.c1.catalog.nodes("dc1");
        assert.partialDeepStrictEqual(data[0], {
          Node: "node1",
          Address: "127.0.0.1",
        });
      });
    });

    describe("services", function () {
      it("should return all services for a given node", async function () {
        const data = await this.c1.catalog.node.services("node1");

        assert.ok(data != null);
        assert.ok(data.Services != null);
        assert.ok(data.Services[this.service.name] != null);
        assert.ok(
          ["ID", "Service", "Tags"].every(
            (key) => key in data.Services[this.service.name],
          ),
        );
        assert.deepEqual(
          data.Services[this.service.name].Service,
          this.service.name,
        );
        assert.deepEqual(data.Services[this.service.name].Tags, [
          this.service.tag,
        ]);
      });
    });
  });

  describe("service", function () {
    describe("list", function () {
      it("should return all services in the current dc", async function () {
        const data = await this.c1.catalog.service.list();
        const services = { consul: [] };
        services[this.service.name] = [this.service.tag];
        assert.deepEqual(data, services);
      });
    });

    describe("nodes", function () {
      it("should return all nodes for a given service", async function () {
        const data = await this.c1.catalog.service.nodes(this.service.name);
        assert.ok(data instanceof Array);

        const nodes = data.map((n) => {
          return n.Node;
        });
        assert.deepEqual(nodes, ["node1"]);
      });
    });
  });
});
