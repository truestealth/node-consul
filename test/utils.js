import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

import assert from "node:assert/strict";

import * as utils from "../lib/utils.js";

import * as helper from "./helper.js";

describe("utils", function () {
  helper.setup(this);

  describe("getAgent", function () {
    it("should work", function () {
      assert.equal(utils.getAgent(), undefined);
      assert.equal(utils.getAgent({}), undefined);

      assert.ok(utils.getAgent("http://www.example.com") instanceof http.Agent);
      assert.ok(
        utils.getAgent(new URL("http://www.example.com")) instanceof http.Agent,
      );

      assert.ok(
        utils.getAgent("https://www.example.com") instanceof https.Agent,
      );
      assert.ok(
        utils.getAgent(new URL("https://www.example.com")) instanceof
          https.Agent,
      );
    });
  });

  describe("body", function () {
    it("should work", function () {
      utils.body({ err: null, res: { body: "body" } }, (...args) => {
        assert.deepEqual(args, [false, "body"]);
      });

      utils.body({ err: "err", res: { body: "body" } }, (...args) => {
        assert.deepEqual(args, [false, "err"]);
      });
    });
  });

  describe("bodyItem", function () {
    it("should work", function () {
      utils.bodyItem({ err: null, res: { body: ["body"] } }, (...args) => {
        assert.deepEqual(args, [false, "body"]);
      });

      utils.bodyItem({ err: null, res: { body: [] } }, (...args) => {
        assert.deepEqual(args, [false, undefined]);
      });

      utils.bodyItem({ err: "err", res: { body: ["body"] } }, (...args) => {
        assert.deepEqual(args, [false, "err"]);
      });
    });
  });

  describe("empty", function () {
    it("should work", function () {
      utils.empty({ err: null, res: "res" }, (...args) => {
        assert.deepEqual(args, [false, undefined]);
      });

      utils.empty({ err: "err", res: "res" }, (...args) => {
        assert.deepEqual(args, [false, "err"]);
      });
    });
  });

  describe("normalizeKeys", function () {
    it("should work", function () {
      assert.deepEqual(utils.normalizeKeys(), {});

      const Obj = function () {
        this.onetwo = "onetwo";
        this.TWO_ONE = "twoone";
        this.Value = "value";
      };
      Obj.prototype.fail = "yes";

      const obj = new Obj();

      assert.deepEqual(utils.normalizeKeys(obj), {
        onetwo: "onetwo",
        twoone: "twoone",
        value: "value",
      });
    });
  });

  describe("defaults", function () {
    it("should work", function () {
      assert.deepEqual(utils.defaults(), {});
      assert.deepEqual(utils.defaults({}), {});
      assert.deepEqual(utils.defaults({}, {}), {});
      assert.deepEqual(utils.defaults({}, { hello: "world" }), {
        hello: "world",
      });
      assert.deepEqual(utils.defaults({ hello: "world" }, {}), {
        hello: "world",
      });
      assert.deepEqual(utils.defaults({ hello: "world" }, { hello: "test" }), {
        hello: "world",
      });
      assert.deepEqual(utils.defaults({ hello: null }, { hello: "test" }), {
        hello: null,
      });
      assert.deepEqual(
        utils.defaults({ hello: undefined }, { hello: "test" }),
        {
          hello: undefined,
        },
      );
      assert.deepEqual(
        utils.defaults(
          { one: 1 },
          { two: 2, one: "nope" },
          { three: 3, two: "nope" },
          { three: "nope" },
        ),
        { one: 1, two: 2, three: 3 },
      );
    });
  });

  describe("options", function () {
    const test = (opts, req) => {
      if (req === undefined) req = {};
      utils.options(req, opts);
      return req;
    };

    it("should work", function () {
      assert.deepEqual(test(), { headers: {}, query: {} });
      assert.deepEqual(test({}), { headers: {}, query: {} });
      assert.deepEqual(test({ stale: true }), {
        headers: {},
        query: { stale: "1" },
      });
      assert.deepEqual(
        test(
          {},
          {
            headers: { hello: "headers" },
            query: { hello: "query" },
          },
        ),
        {
          headers: { hello: "headers" },
          query: { hello: "query" },
        },
      );
      assert.deepEqual(
        test({
          dc: "dc1",
          partition: "partition1",
          wan: true,
          consistent: true,
          index: 10,
          wait: "10s",
          token: "token1",
          near: "_agent",
          "node-meta": ["a:b", "c:d"],
          filter: "Meta.env == qa",
          ctx: "ctx",
          timeout: 20,
        }),
        {
          headers: {
            "x-consul-token": "token1",
          },
          query: {
            dc: "dc1",
            partition: "partition1",
            wan: "1",
            consistent: "1",
            index: 10,
            wait: "10s",
            near: "_agent",
            "node-meta": ["a:b", "c:d"],
            filter: "Meta.env == qa",
          },
          ctx: "ctx",
          timeout: 20,
        },
      );
      assert.deepEqual(test({ timeout: "10s" }), {
        headers: {},
        query: {},
        timeout: 10000,
      });
    });

    describe("when token is undefined", function () {
      it("should not include x-consul-token header", function () {
        assert.deepEqual(test({ token: undefined }), {
          headers: {},
          query: {},
        });
      });
    });

    describe("when token is null", function () {
      it("should not include x-consul-token header", function () {
        assert.deepEqual(test({ token: null }), {
          headers: {},
          query: {},
        });
      });
    });

    describe("when token is empty string", function () {
      it("should not include x-consul-token header", function () {
        assert.deepEqual(test({ token: "" }), {
          headers: {},
          query: {},
        });
      });
    });

    describe("when token is valid value", function () {
      it("should include x-consul-token header", function () {
        assert.deepEqual(test({ token: "validToken" }), {
          headers: {
            "x-consul-token": "validToken",
          },
          query: {},
        });
      });
    });
  });

  describe("decode", function () {
    it("should work", function () {
      assert.equal(utils.decode(null), null);
      assert.equal(utils.decode(), undefined);
      assert.equal(utils.decode(""), "");
      assert.equal(utils.decode("aGVsbG8gd29ybGQ="), "hello world");
      assert.equal(utils.decode("aGVsbG8gd29ybGQ=", {}), "hello world");
      assert.deepEqual(
        utils.decode("aGVsbG8gd29ybGQ=", { buffer: true }),
        Buffer.from("hello world"),
      );
    });
  });

  describe("clone", function () {
    it("should work", function () {
      let src = { hello: "world" };
      let dst = utils.clone(src);

      assert.deepEqual(dst, { hello: "world" });
      assert.notEqual(dst, src);

      const Obj = function () {
        this.hello = "world";
      };
      Obj.prototype.fail = "yes";

      src = new Obj();
      dst = utils.clone(src);

      assert.deepEqual(dst, { hello: "world" });
      assert.notEqual(dst, src);
    });
  });

  describe("parseDuration", function () {
    it("should work", function () {
      assert.equal(utils.parseDuration(0), 0);
      assert.equal(utils.parseDuration(1000000), 1);
      assert.equal(utils.parseDuration("0"), 0);
      assert.equal(utils.parseDuration("1000000"), 1);

      assert.equal(utils.parseDuration("1ns"), 1e-6);
      assert.equal(utils.parseDuration("1us"), 1e-3);
      assert.equal(utils.parseDuration("1ms"), 1);
      assert.equal(utils.parseDuration("1s"), 1e3);
      assert.equal(utils.parseDuration("1m"), 6e4);
      assert.equal(utils.parseDuration("1h"), 3.6e6);

      assert.equal(utils.parseDuration(".5s"), 500);
      assert.equal(utils.parseDuration("0.5s"), 500);
      assert.equal(utils.parseDuration("1.s"), 1000);
      assert.equal(utils.parseDuration("1.5s"), 1500);
      assert.equal(utils.parseDuration("10.03m"), 601800);

      assert.equal(utils.parseDuration(), undefined);
      assert.equal(utils.parseDuration(""), undefined);
      assert.equal(utils.parseDuration("."), undefined);
      assert.equal(utils.parseDuration("10x"), undefined);
      assert.equal(utils.parseDuration(".ms"), undefined);
    });
  });

  describe("safeBigInt", function () {
    it("should work", function () {
      assert.equal(utils.safeBigInt(0), 0n);
      assert.equal(utils.safeBigInt(-1), -1n);
      assert.equal(utils.safeBigInt(500), 500n);
      assert.equal(utils.safeBigInt("0"), 0n);
      assert.equal(utils.safeBigInt("-1"), -1n);
      assert.equal(utils.safeBigInt("500"), 500n);

      assert.equal(utils.safeBigInt(""), undefined);
      assert.equal(utils.safeBigInt("a"), undefined);
      assert.equal(utils.safeBigInt("1.0"), undefined);
      assert.equal(utils.safeBigInt(null), undefined);
      assert.equal(utils.safeBigInt({}), undefined);
    });
  });

  describe("createCheck", function () {
    it("should work", function () {
      assert.deepEqual(
        utils.createCheck({
          ID: "id",
          name: "name",
          service_id: "service",
          http: "http://127.0.0.1:8000",
          timeout: "30s",
          interval: "60s",
          notes: "Just a note.",
          status: "passing",
          failuresbeforewarning: 1,
          failuresbeforecritical: 2,
          successBeforePassing: 3,
        }),
        {
          ID: "id",
          Name: "name",
          ServiceID: "service",
          HTTP: "http://127.0.0.1:8000",
          Timeout: "30s",
          Interval: "60s",
          Notes: "Just a note.",
          Status: "passing",
          FailuresBeforeWarning: 1,
          FailuresBeforeCritical: 2,
          SuccessBeforePassing: 3,
        },
      );

      assert.deepEqual(
        utils.createCheck({
          ID: "id",
          name: "name",
          service_id: "service",
          tcp: "localhost:22",
          tcpusetls: true,
          interval: "10s",
          notes: "SSH TCP on port 22",
          status: "passing",
          deregistercriticalserviceafter: "1h",
        }),
        {
          ID: "id",
          Name: "name",
          ServiceID: "service",
          TCP: "localhost:22",
          TCPUseTLS: true,
          Interval: "10s",
          Notes: "SSH TCP on port 22",
          Status: "passing",
          DeregisterCriticalServiceAfter: "1h",
        },
      );
    });
  });

  describe("createServiceCheck", function () {
    it("should work", function () {
      assert.deepEqual(
        utils.createServiceCheck({
          args: ["/usr/bin/true"],
          interval: "30s",
          timeout: "5s",
        }),
        {
          Args: ["/usr/bin/true"],
          Interval: "30s",
          Timeout: "5s",
        },
      );

      assert.deepEqual(
        utils.createServiceCheck({
          script: "/usr/bin/true",
          interval: "30s",
          shell: "/bin/sh",
          dockercontainerid: "123",
        }),
        {
          Script: "/usr/bin/true",
          Interval: "30s",
          Shell: "/bin/sh",
          DockerContainerID: "123",
        },
      );

      assert.deepEqual(
        utils.createServiceCheck({
          grpc: "localhost:50051",
          interval: "5s",
          tlsservername: "server",
          tlsskipverify: true,
          outputmaxsize: 4096,
        }),
        {
          GRPC: "localhost:50051",
          Interval: "5s",
          TLSSkipVerify: true,
          TLSServerName: "server",
          OutputMaxSize: 4096,
        },
      );

      assert.deepEqual(
        utils.createServiceCheck({
          http: "https://example.com/test",
          body: "{}",
          disableredirects: true,
          header: { authorization: ["one"] },
          method: "POST",
          interval: "5s",
        }),
        {
          HTTP: "https://example.com/test",
          Body: "{}",
          DisableRedirects: true,
          Header: { authorization: ["one"] },
          Method: "POST",
          Interval: "5s",
        },
      );

      assert.deepEqual(
        utils.createServiceCheck({
          h2ping: "https://example.com/test",
          interval: "5s",
        }),
        {
          H2Ping: "https://example.com/test",
          Interval: "5s",
        },
      );

      assert.deepEqual(
        utils.createServiceCheck({
          h2ping: "http://example.com/test",
          h2pingusetls: false,
          interval: "5s",
        }),
        {
          H2Ping: "http://example.com/test",
          Interval: "5s",
          H2PingUseTLS: false,
        },
      );

      assert.deepEqual(
        utils.createServiceCheck({
          grpc: "localhost:50051",
          grpcusetls: true,
          interval: "10s",
        }),
        {
          GRPC: "localhost:50051",
          GRPCUseTLS: true,
          Interval: "10s",
        },
      );

      assert.deepEqual(
        utils.createServiceCheck({
          udp: "localhost:50051",
          interval: "10s",
        }),
        {
          UDP: "localhost:50051",
          Interval: "10s",
        },
      );

      assert.deepEqual(
        utils.createServiceCheck({
          tcp: "localhost:50051",
          interval: "10s",
        }),
        {
          TCP: "localhost:50051",
          Interval: "10s",
        },
      );

      assert.deepEqual(
        utils.createServiceCheck({
          tcp: "localhost:50051",
          interval: "10s",
          tcpusetls: true,
        }),
        {
          TCP: "localhost:50051",
          Interval: "10s",
          TCPUseTLS: true,
        },
      );

      assert.deepEqual(
        utils.createServiceCheck({
          ttl: "15s",
        }),
        {
          TTL: "15s",
        },
      );

      assert.deepEqual(
        utils.createServiceCheck({
          aliasnode: "web1",
        }),
        {
          AliasNode: "web1",
        },
      );

      assert.deepEqual(
        utils.createServiceCheck({
          aliasservice: "web",
        }),
        {
          AliasService: "web",
        },
      );
    });

    it(
      "should require args, grpc, http, tcp and interval, ttl, or " +
        "aliasnode/aliasservice",
      () => {
        assert.throws(
          () => {
            utils.createCheck();
          },
          {
            message:
              "args/grpc/h2ping/http/tcp/udp and interval, ttl, or aliasnode/aliasservice",
          },
        );
      },
    );
  });

  describe("createCatalogDeregistration", function () {
    it("should work", function () {
      assert.deepEqual(
        utils.createCatalogDeregistration({
          node: "node",
          checkid: "check",
          serviceid: "service",
        }),
        {
          Node: "node",
          CheckID: "check",
          ServiceID: "service",
        },
      );
    });
    it("should work", function () {
      assert.deepEqual(utils.createCatalogDeregistration({}), {});
    });
  });

  describe("createCatalogRegistration", function () {
    it("throw on missing grpc/http/tcp", function () {
      assert.throws(
        () => {
          utils.createCatalogRegistration({
            id: "123",
            node: "node",
            nodeMeta: { "external-node": "true" },
            check: {
              node: "foo",
              checkID: "service:web1",
              serviceid: "service",
              name: "Web HTTP check",
              definition: {
                intervalduration: "5s",
              },
              notes: "http node check",
              status: "critical",
            },
            service: { id: "service" },
            address: "10.0.0.1",
            skipnodeupdate: true,
          });
        },
        { message: "at least one of http/tcp is required" },
      );
    });

    it("should work", function () {
      assert.deepEqual(
        utils.createCatalogRegistration({
          id: "123",
          node: "node",
          nodeMeta: { "external-node": "true" },
          check: {
            node: "foo",
            checkID: "service:web1",
            serviceid: "service",
            name: "Web HTTP check",
            definition: {
              http: "http://example.org/",
              intervalduration: "5s",
            },
            notes: "http node check",
            status: "critical",
          },
          service: { id: "service" },
          address: "10.0.0.1",
          skipnodeupdate: true,
        }),
        {
          ID: "123",
          Node: "node",
          NodeMeta: { "external-node": "true" },
          Check: {
            Node: "foo",
            CheckID: "service:web1",
            ServiceID: "service",
            Name: "Web HTTP check",
            Definition: {
              HTTP: "http://example.org/",
              IntervalDuration: "5s",
            },
            Notes: "http node check",
            Status: "critical",
          },
          Service: { ID: "service" },
          Address: "10.0.0.1",
          SkipNodeUpdate: true,
        },
      );
    });

    it("should work", function () {
      assert.deepEqual(
        utils.createCatalogRegistration({
          id: "123",
          node: "node",
          nodeMeta: { "node-meta": "true" },
          checks: [
            {
              name: "check2",
              definition: {
                http: "https://127.0.0.1:8000",
                tLsskipverify: true,
                tLsservername: "fqdn",
                intervalduration: "60s",
                deregistercriticalserviceafterduration: "120s",
              },
            },
            {
              name: "check3",
              definition: {
                tcp: "127.0.0.1:8000",
                intervalduration: "60s",
                timeoutduration: "10s",
              },
            },
            {},
          ],
          service: {
            id: "service",
            service: "service",
            tags: [],
            meta: { defaultContext: "/nodeapi" },
            address: "127.0.0.1",
            port: 1234,
          },
          address: "10.0.0.1",
        }),
        {
          ID: "123",
          Node: "node",
          NodeMeta: { "node-meta": "true" },
          Checks: [
            {
              Name: "check2",
              Definition: {
                HTTP: "https://127.0.0.1:8000",
                TLSSkipVerify: true,
                TLSServerName: "fqdn",
                IntervalDuration: "60s",
                DeregisterCriticalServiceAfterDuration: "120s",
              },
            },
            {
              Name: "check3",
              Definition: {
                TCP: "127.0.0.1:8000",
                IntervalDuration: "60s",
                TimeoutDuration: "10s",
              },
            },
            {},
          ],
          Service: {
            Service: "service",
            ID: "service",
            Tags: [],
            Meta: { defaultContext: "/nodeapi" },
            Address: "127.0.0.1",
            Port: 1234,
          },
          Address: "10.0.0.1",
        },
      );
    });
    assert.deepEqual(
      utils.createCatalogRegistration({
        taggedaddresses: {},
      }),
      {
        TaggedAddresses: {},
      },
    );
  });

  describe("createCatalogService", function () {
    it("should work", function () {
      assert.deepEqual(utils.createCatalogService({}), {});
    });
  });

  describe("createService", function () {
    it("should work", function () {
      assert.deepEqual(
        utils.createService({
          id: "123",
          name: "service",
          tags: ["web"],
          Meta: { defaultContext: "/nodeapi" },
          check: {
            http: "http://example.org/",
            interval: "5s",
            notes: "http service check",
            status: "critical",
          },
          address: "10.0.0.1",
          port: 80,
        }),
        {
          ID: "123",
          Name: "service",
          Tags: ["web"],
          Meta: { defaultContext: "/nodeapi" },
          Check: {
            HTTP: "http://example.org/",
            Interval: "5s",
            Notes: "http service check",
            Status: "critical",
          },
          Address: "10.0.0.1",
          Port: 80,
        },
      );

      assert.deepEqual(
        utils.createService({
          name: "service",
          check: {
            script: "true",
            interval: "5s",
          },
        }),
        {
          Name: "service",
          Check: {
            Script: "true",
            Interval: "5s",
          },
        },
      );

      assert.deepEqual(
        utils.createService({
          id: "123",
          name: "service",
          check: {
            ttl: "10s",
            notes: "ttl service check",
          },
        }),
        {
          ID: "123",
          Name: "service",
          Check: {
            TTL: "10s",
            Notes: "ttl service check",
          },
        },
      );

      assert.deepEqual(
        utils.createService({
          id: "123",
          name: "service",
          checks: [
            { ttl: "10s" },
            {
              ttl: "10s",
              name: "service-check-name-1",
              checkid: "service-check-id-1",
              notes: "service-check-notes-1",
            },
            { http: "http://127.0.0.1:8000", interval: "60s" },
          ],
        }),
        {
          ID: "123",
          Name: "service",
          Checks: [
            { TTL: "10s" },
            {
              TTL: "10s",
              Name: "service-check-name-1",
              CheckID: "service-check-id-1",
              Notes: "service-check-notes-1",
            },
            { HTTP: "http://127.0.0.1:8000", Interval: "60s" },
          ],
        },
      );

      assert.deepEqual(
        utils.createService({
          connect: {
            native: true,
          },
        }),
        {
          Connect: {
            Native: true,
          },
        },
      );

      assert.deepEqual(
        utils.createService({
          connect: {
            sidecar_service: {
              check: {
                script: "true",
                interval: "5s",
              },
            },
          },
        }),
        {
          Connect: {
            SidecarService: {
              Check: {
                Script: "true",
                Interval: "5s",
              },
            },
          },
        },
      );

      assert.deepEqual(
        utils.createService({
          connect: {
            sidecarservice: {
              proxy: {
                destinationservicename: "test",
              },
            },
          },
        }),
        {
          Connect: {
            SidecarService: {
              Proxy: {
                DestinationServiceName: "test",
              },
            },
          },
        },
      );

      assert.deepEqual(
        utils.createService({
          connect: {
            proxy: {
              destinationservicename: "test",
              destinationserviceid: "123",
              LocalServiceAddress: "127.0.0.1",
              localserviceport: 8080,
              config: {},
              upstreams: [],
              meshgateway: {},
              expose: {},
            },
          },
        }),
        {
          Connect: {
            Proxy: {
              DestinationServiceName: "test",
              DestinationServiceID: "123",
              LocalServiceAddress: "127.0.0.1",
              LocalServicePort: 8080,
              Config: {},
              Upstreams: [],
              MeshGateway: {},
              Expose: {},
            },
          },
        },
      );

      assert.deepEqual(
        utils.createService({
          taggedaddresses: {},
        }),
        {
          TaggedAddresses: {},
        },
      );

      assert.deepEqual(
        utils.createService({
          taggedaddresses: {
            lan: {},
            wan: {},
          },
        }),
        {
          TaggedAddresses: {
            lan: {},
            wan: {},
          },
        },
      );

      assert.deepEqual(
        utils.createService({
          taggedaddresses: {
            lan: {
              address: "127.0.0.1",
              port: 8080,
            },
            wan: {
              address: "10.0.0.1",
              port: 80,
            },
          },
        }),
        {
          TaggedAddresses: {
            lan: {
              Address: "127.0.0.1",
              Port: 8080,
            },
            wan: {
              Address: "10.0.0.1",
              Port: 80,
            },
          },
        },
      );
    });

    it("should not allow nested sidecars", function () {
      assert.throws(
        () => {
          utils.createService({
            connect: {
              sidecar_service: {
                connect: {
                  SidecarService: {},
                },
              },
            },
          });
        },
        { message: "sidecarservice cannot be nested" },
      );
    });

    it("should require proxy destination service name", function () {
      assert.throws(
        () => {
          utils.createService({
            proxy: {},
          });
        },
        { message: "destinationservicename required" },
      );
    });
  });

  describe("hasIndexChanged", function () {
    it("should work", function () {
      assert.equal(utils.hasIndexChanged(), false);
      assert.equal(utils.hasIndexChanged(""), false);
      assert.equal(utils.hasIndexChanged(0n), false);
      assert.equal(utils.hasIndexChanged(1n), true);
      assert.equal(utils.hasIndexChanged(1n, ""), true);
      assert.equal(utils.hasIndexChanged(10n, 1n), true);
      assert.equal(utils.hasIndexChanged(0n, 1n), false);
      assert.equal(utils.hasIndexChanged(1n, 1n), false);
      assert.equal(utils.hasIndexChanged(1n, 0n), true);
      assert.equal(utils.hasIndexChanged(2n, 1n), true);
      assert.equal(utils.hasIndexChanged(2n, 2n), false);
    });
  });
});
