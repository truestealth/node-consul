import assert from "node:assert/strict";

import * as helper from "./helper.js";

describe("Catalog", function () {
  helper.setup(this);

  describe("register", function () {
    it("should work (http) with just string", async function () {
      this.nock
        .put("/v1/catalog/register", {
          Node: "node",
          Address: "127.0.0.1",
        })
        .reply(200);

      await this.consul.catalog.register("node");
    });

    it("should error (http) on missing required fields", async function () {
      try {
        await this.consul.catalog.register({
          name: "test",
          serviceid: "service",
        });
        assert.ok(false);
      } catch (err) {
        assert.deepEqual(
          err.message,
          "consul: catalog.register: node and address required",
        );
      }
    });
  });

  describe("deregister", function () {
    it("should work (http) with just string", async function () {
      this.nock
        .put("/v1/catalog/deregister", {
          Node: "node",
        })
        .reply(200);

      await this.consul.catalog.deregister("node");
    });

    it("should error (http) on missing required fields", async function () {
      try {
        await this.consul.catalog.deregister({
          name: "test",
        });
        assert.ok(false);
      } catch (err) {
        assert.deepEqual(
          err.message,
          "consul: catalog.deregister: node required",
        );
      }
    });
  });

  describe("datacenters", function () {
    it("should work", async function () {
      this.nock.get("/v1/catalog/datacenters").reply(200, [{ ok: true }]);

      const data = await this.consul.catalog.datacenters({});
      assert.deepEqual(data, [{ ok: true }]);
    });

    it("should work with no arguments", async function () {
      this.nock.get("/v1/catalog/datacenters").reply(200, [{ ok: true }]);

      const data = await this.consul.catalog.datacenters();
      assert.deepEqual(data, [{ ok: true }]);
    });
  });

  describe("nodes", function () {
    it("should work", async function () {
      this.nock.get("/v1/catalog/nodes").reply(200, [{ ok: true }]);

      const data = await this.consul.catalog.nodes({});
      assert.deepEqual(data, [{ ok: true }]);
    });

    it("should work with just string", async function () {
      this.nock.get("/v1/catalog/nodes?dc=dc1").reply(200, [{ ok: true }]);

      const data = await this.consul.catalog.nodes("dc1");
      assert.deepEqual(data, [{ ok: true }]);
    });

    it("should work with no arguments", async function () {
      this.nock.get("/v1/catalog/nodes").reply(200, [{ ok: true }]);

      const data = await this.consul.catalog.nodes();
      assert.deepEqual(data, [{ ok: true }]);
    });
  });

  describe("node", function () {
    describe("list", function () {
      it("should work", async function () {
        this.nock.get("/v1/catalog/nodes").reply(200, [{ ok: true }]);

        const data = await this.consul.catalog.node.list({});
        assert.deepEqual(data, [{ ok: true }]);
      });

      it("should work with just string", async function () {
        this.nock.get("/v1/catalog/nodes?dc=dc1").reply(200, [{ ok: true }]);

        const data = await this.consul.catalog.node.list("dc1");
        assert.deepEqual(data, [{ ok: true }]);
      });

      it("should work with no arguments", async function () {
        this.nock.get("/v1/catalog/nodes").reply(200, [{ ok: true }]);

        const data = await this.consul.catalog.node.list();
        assert.deepEqual(data, [{ ok: true }]);
      });
    });

    describe("services", function () {
      it("should work", async function () {
        this.nock.get("/v1/catalog/node/node1").reply(200, [{ ok: true }]);

        const data = await this.consul.catalog.node.services({ node: "node1" });
        assert.deepEqual(data, [{ ok: true }]);
      });

      it("should work with just string", async function () {
        this.nock.get("/v1/catalog/node/node1").reply(200, [{ ok: true }]);

        const data = await this.consul.catalog.node.services("node1");
        assert.deepEqual(data, [{ ok: true }]);
      });

      it("should require node", async function () {
        try {
          await this.consul.catalog.node.services({});
          assert.ok(false);
        } catch (err) {
          assert.deepEqual(
            err.message,
            "consul: catalog.node.services: node required",
          );
        }
      });
    });
  });

  describe("services", function () {
    it("should work", async function () {
      this.nock.get("/v1/catalog/services").reply(200, [{ ok: true }]);

      const data = await this.consul.catalog.services({});
      assert.deepEqual(data, [{ ok: true }]);
    });

    it("should work with just string", async function () {
      this.nock.get("/v1/catalog/services?dc=dc1").reply(200, [{ ok: true }]);

      const data = await this.consul.catalog.services("dc1");
      assert.deepEqual(data, [{ ok: true }]);
    });

    it("should work with no arguments", async function () {
      this.nock.get("/v1/catalog/services").reply(200, [{ ok: true }]);

      const data = await this.consul.catalog.services();
      assert.deepEqual(data, [{ ok: true }]);
    });
  });

  describe("services", function () {
    describe("list", function () {
      it("should work", async function () {
        this.nock.get("/v1/catalog/services").reply(200, [{ ok: true }]);

        const data = await this.consul.catalog.service.list({});
        assert.deepEqual(data, [{ ok: true }]);
      });

      it("should work with just string", async function () {
        this.nock.get("/v1/catalog/services?dc=dc1").reply(200, [{ ok: true }]);

        const data = await this.consul.catalog.service.list("dc1");
        assert.deepEqual(data, [{ ok: true }]);
      });

      it("should work with no arguments", async function () {
        this.nock.get("/v1/catalog/services").reply(200, [{ ok: true }]);

        const data = await this.consul.catalog.service.list();
        assert.deepEqual(data, [{ ok: true }]);
      });
    });

    describe("nodes", function () {
      it("should work", async function () {
        this.nock
          .get("/v1/catalog/service/service1?tag=web")
          .reply(200, [{ ok: true }]);

        const data = await this.consul.catalog.service.nodes({
          service: "service1",
          tag: "web",
        });
        assert.deepEqual(data, [{ ok: true }]);
      });

      it("should work with just string", async function () {
        this.nock
          .get("/v1/catalog/service/service1")
          .reply(200, [{ ok: true }]);

        const data = await this.consul.catalog.service.nodes("service1");
        assert.deepEqual(data, [{ ok: true }]);
      });

      it("should require service", async function () {
        try {
          await this.consul.catalog.service.nodes({});
          assert.ok(false);
        } catch (err) {
          assert.deepEqual(
            err.message,
            "consul: catalog.service.nodes: service required",
          );
        }
      });
    });

    describe("connect nodes", function () {
      it("should work with just string", async function () {
        this.nock
          .get("/v1/catalog/connect/service1")
          .reply(200, [{ ok: true }]);

        const data = await this.consul.catalog.connect.nodes("service1");
        assert.deepEqual(data, [{ ok: true }]);
      });

      it("should require service", async function () {
        try {
          await this.consul.catalog.connect.nodes({});
        } catch (err) {
          assert.deepEqual(
            err.message,
            "consul: catalog.connect.nodes: service required",
          );
        }
      });
    });
  });
});
