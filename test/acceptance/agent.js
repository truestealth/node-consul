import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import * as constants from "../../lib/constants.js";

import * as helper from "./helper.js";

helper.describe("Agent", function () {
  before(async function () {
    await helper.before(this);
  });

  after(async function () {
    await helper.after(this);
  });

  describe("members", function () {
    it("should return members agent sees in cluster gossip pool", async function () {
      const data = await this.c1.agent.members();
      assert.ok(data instanceof Array);

      assert.deepEqual(data.length, 1);
      assert.ok(
        data
          .map((m) => {
            return m.Name;
          })
          .includes("node1"),
      );
    });
  });

  describe("self", function () {
    it("should return information about agent", async function () {
      const data = await this.c1.agent.self();
      assert.ok(data instanceof Object);
      assert.ok(["Config", "Member"].every((key) => key in data));

      assert.equal(data.Config.Server, true);
      assert.deepEqual(data.Config.Datacenter, "dc1");
      assert.deepEqual(data.Config.NodeName, "node1");

      assert.deepEqual(data.Member.Name, "node1");
      assert.deepEqual(data.Member.Addr, "127.0.0.1");
    });

    it("should work with opts", async function () {
      await this.c1.agent.self({});
    });
  });

  describe("maintenance", function () {
    it("should set node maintenance mode", async function () {
      const statusChecks = await this.c1.agent.checks();
      assert.ok(!("_node_maintenance" in statusChecks));

      await this.c1.agent.maintenance(true);

      const enableStatus = await this.c1.agent.checks();
      assert.ok("_node_maintenance" in enableStatus);
      assert.deepEqual(enableStatus._node_maintenance.Status, "critical");

      await this.c1.agent.maintenance({ enable: false });

      const disableStatus = await this.c1.agent.checks();
      assert.ok(!("_node_maintenance" in disableStatus));
    });

    it("should require valid enable", async function () {
      try {
        await this.c1.agent.maintenance({ enable: "false" });
        assert.ok(false);
      } catch (err) {
        assert.deepEqual(
          err.message,
          "consul: agent.maintenance: enable required",
        );
      }
    });
  });

  describe("join", function () {
    it("should make node2 join cluster", async function () {
      const joinAddr = "127.0.0.1";
      const joinerAddr = "127.0.0.2";

      const members = await this.c1.agent.members();
      const memberAddrs = members.map((m) => {
        return m.Addr;
      });

      assert.ok(memberAddrs.includes(joinAddr));
      assert.ok(!memberAddrs.includes(joinerAddr));

      await this.c2.agent.join({ address: joinAddr, token: "agent_master" });
    });

    it("should require address", async function () {
      try {
        await this.c1.agent.join({});
        assert.ok(false);
      } catch (err) {
        assert.deepEqual(err.message, "consul: agent.join: address required");
      }
    });
  });

  describe("forceLeave", function () {
    it("should remove node2 from the cluster", async function () {
      const ensureJoined = await this.c1.agent.members();

      const node2 = ensureJoined.find((m) => m.Name === "node2");
      assert.ok(node2 != null);
      assert.deepEqual(node2.Status, constants.AGENT_STATUS.indexOf("alive"));

      await this.c1.agent.forceLeave("node2");

      await helper.retry(async () => {
        const forceLeaveMembers = await this.c1.agent.members();
        const node = forceLeaveMembers.find((m) => m.Name === "node2");
        const leaving =
          node && node.Status === constants.AGENT_STATUS.indexOf("leaving");
        if (!leaving) throw new Error("Not leaving");
      });
    });

    it("should require node", async function () {
      try {
        await this.c1.agent.forceLeave({});
        assert.ok(false);
      } catch (err) {
        assert.deepEqual(
          err.message,
          "consul: agent.forceLeave: node required",
        );
      }
    });
  });

  describe("check", function () {
    before(function () {
      // helper function to check existence of check
      this.exists = async (id, exists) => {
        const checks = await this.c1.agent.checks();

        assert.equal(id in checks, Boolean(exists));
      };

      this.state = async (id, state) => {
        const checks = await this.c1.agent.checks();
        assert.ok(id in checks);

        const check = checks[id];
        assert.deepEqual(check.Status, state);
      };
    });

    beforeEach(async function () {
      this.name = "check-" + randomUUID();
      this.deregister = [this.name];

      const checks = await this.c1.agent.checks();

      await Promise.all(
        Object.keys(checks).map((id) => this.c1.agent.check.deregister(id)),
      );

      await this.c1.agent.check.register({ name: this.name, ttl: "10s" });
    });

    afterEach(async function () {
      await Promise.all(
        this.deregister.map((id) => this.c1.agent.check.deregister(id)),
      ).catch(() => null);
    });

    describe("list", function () {
      it("should return agent checks", async function () {
        const data = await this.c1.agent.checks(this.name);
        assert.ok(data != null);
        assert.ok(this.name in data);
      });
    });

    describe("register", function () {
      it("should create check", async function () {
        const name = "check-" + randomUUID();

        await this.exists(name, false);
        await this.deregister.push(name);
        await this.c1.agent.check.register({ name: name, ttl: "1s" });
        await this.exists(name, true);
      });
    });

    describe("deregister", function () {
      it("should remove check", async function () {
        await this.exists(this.name, true);
        await this.c1.agent.check.deregister(this.name);
        await this.exists(this.name, false);
      });
    });

    describe("pass", function () {
      it("should mark check as passing", async function () {
        await this.state(this.name, "critical");
        await this.c1.agent.check.pass(this.name);
        await this.state(this.name, "passing");
      });
    });

    describe("warn", function () {
      it("should mark check as warning", async function () {
        await this.state(this.name, "critical");
        await this.c1.agent.check.warn(this.name);
        await this.state(this.name, "warning");
      });
    });

    describe("fail", function () {
      it("should mark check as critical", async function () {
        await this.state(this.name, "critical");
        await this.c1.agent.check.fail(this.name);
        await this.state(this.name, "critical");
      });
    });
  });

  describe("service", function () {
    before(function () {
      // helper function to check existence of service
      this.exists = async (id, exists) => {
        const services = await this.c1.agent.services();

        assert.equal(id in services, Boolean(exists));
      };
    });

    beforeEach(async function () {
      this.name = "service-" + randomUUID();
      this.deregister = [this.name];

      // remove existing services
      const services = await this.c1.agent.services();

      const ids = Object.values(services)
        .filter((s) => s && s.ID !== "consul")
        .map((s) => s.ID);

      await Promise.all(ids.map((id) => this.c1.agent.service.deregister(id)));

      // add service
      await this.c1.agent.service.register(this.name);
    });

    afterEach(async function () {
      await Promise.all(
        this.deregister.map((id) => this.c1.agent.service.deregister(id)),
      ).catch(() => null);
    });

    describe("list", function () {
      it("should return agent services", async function () {
        const data = await this.c1.agent.services();
        assert.ok(data != null);
        assert.ok(this.name in data);
      });
    });

    describe("register", function () {
      it("should create service", async function () {
        const name = "service-" + randomUUID();

        await this.exists(name, false);
        await this.c1.agent.service.register(name);
        await this.exists(name, true);
      });

      it("should create service with http check", async function () {
        const name = "service-" + randomUUID();
        const notes = "simple http check";

        await this.exists(name, false);

        await this.c1.agent.service.register({
          name: name,
          check: {
            http: "http://127.0.0.1:8500",
            interval: "30s",
            notes: notes,
          },
        });

        const checks = await this.c1.agent.check.list();
        assert.ok(Object.keys(checks).length > 0);
        assert.deepEqual(checks["service:" + name].Notes, notes);
      });

      it("should create service with script check", async function () {
        const name = "service-" + randomUUID();
        const notes = "simple script check";

        await this.exists(name, false);

        await this.c1.agent.service.register({
          name: name,
          check: {
            args: ["sh", "-c", "true"],
            interval: "30s",
            timeout: "1s",
            notes: notes,
          },
        });

        const checks = await this.c1.agent.check.list();
        assert.ok(Object.keys(checks).length > 0);
        assert.deepEqual(checks["service:" + name].Notes, notes);
      });
    });

    describe("deregister", function () {
      it("should remove service", async function () {
        await this.exists(this.name, true);
        await this.c1.agent.service.deregister(this.name);
        await this.exists(this.name, false);
      });
    });

    describe("maintenance", function () {
      it("should set service maintenance mode", async function () {
        const checkId = "_service_maintenance:" + this.name;

        const checks = await this.c1.agent.checks();
        assert.ok(!(checkId in checks));

        await this.c1.agent.service.maintenance({
          id: this.name,
          enable: true,
        });

        const enableStatus = await this.c1.agent.checks();
        assert.ok(checkId in enableStatus);
        assert.deepEqual(enableStatus[checkId].Status, "critical");

        await this.c1.agent.service.maintenance({
          id: this.name,
          enable: false,
        });

        const disableStatus = this.c1.agent.checks();
        assert.ok(!(checkId in disableStatus));
      });
    });
  });
});
