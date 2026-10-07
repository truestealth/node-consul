import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import * as helper from "./helper.js";

helper.describe("Health", function () {
  before(async function () {
    this.service = "service-" + randomUUID();

    await helper.before(this);

    await this.c1.agent.service.register({
      name: this.service,
      check: { ttl: "60s" },
    });

    await helper.retry(async () => {
      let data = await this.c1.health.node("node1");
      if (data && Array.isArray(data)) {
        data = data.find((c) => c.ServiceName === this.service);
      }

      if (!data) throw new Error("Check not for service: " + this.service);
    });
  });

  after(async function () {
    await helper.after(this);
  });

  describe("node", function () {
    it("should return checks for given node", async function () {
      const data = await this.c1.health.node("node1");

      assert.ok(data instanceof Array);

      assert.ok(data[0] != null);

      assert.ok(["Node", "CheckID", "Status"].every((key) => key in data[0]));

      assert.deepEqual(data[0].Node, "node1");
      assert.deepEqual(data[0].CheckID, "serfHealth");
      assert.deepEqual(data[0].Status, "passing");
    });
  });

  describe("checks", function () {
    it("should return all checks for a given service", async function () {
      let data = await this.c1.health.checks(this.service);

      assert.ok(data instanceof Array);
      data = data.find((c) => c.ServiceName === this.service);

      assert.ok(data != null);

      assert.ok(["Node", "CheckID"].every((key) => key in data));

      assert.deepEqual(data.CheckID, "service:" + this.service);
    });
  });

  describe("service", function () {
    it("should return health information for given service", async function () {
      const data = await this.c1.health.service(this.service);

      assert.ok(data != null);

      assert.ok(data instanceof Array);
      assert.ok(data[0] != null);

      assert.ok(["Node", "Service", "Checks"].every((key) => key in data[0]));

      assert.partialDeepStrictEqual(data[0].Node, {
        Node: "node1",
        Address: "127.0.0.1",
      });

      assert.ok(
        ["ID", "Service", "Tags"].every((key) => key in data[0].Service),
      );

      assert.equal(data[0].Service.ID, this.service);
      assert.equal(data[0].Service.Service, this.service);

      const checks = data[0].Checks.map((c) => c.CheckID).sort();

      assert.deepEqual(checks, ["serfHealth", "service:" + this.service]);
    });
  });

  describe("state", function () {
    it("should return checks with a given state", async function () {
      const data = await this.c1.health.state("critical");
      assert.ok(data instanceof Array);
      assert.ok(data[0] != null);

      assert.ok("ServiceName" in data[0]);
      assert.deepEqual(data[0].ServiceName, this.service);

      assert.deepEqual(data.length, 1);
    });

    it("should return all checks", async function () {
      const data = await this.c1.health.state("any");
      assert.ok(data instanceof Array);
      assert.deepEqual(data.length, 2);
    });
  });
});
