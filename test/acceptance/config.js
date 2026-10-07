import { randomUUID } from "node:crypto";
import should from "should";
import * as helper from "./helper.js";

helper.describe("Config", function () {
  before(async function () {
    await helper.before(this);
    this.name = "consul-smoke-config-" + randomUUID();
  });

  after(async function () {
    await helper.after(this);
  });

  beforeEach(async function () {
    this.entry = {
      Kind: "service-defaults",
      Name: this.name,
      Protocol: "http",
    };
    should(await this.c1.config.set({ entry: this.entry, cas: 0 })).equal(true);
  });

  afterEach(async function () {
    await this.c1.config.del({ kind: "service-intentions", name: this.name });
    await this.c1.config.del({ kind: "service-defaults", name: this.name });
  });

  it("should read and list configuration entries", async function () {
    const entry = await this.c1.config.get({
      kind: "service-defaults",
      name: this.name,
    });
    should(entry).containEql(this.entry);
    should(entry.ModifyIndex).be.above(0);

    const entries = await this.c1.config.list("service-defaults");
    should(entries.some((item) => item.Name === this.name)).equal(true);
  });

  it("should preserve create-only and conditional write/delete semantics", async function () {
    const options = { kind: "service-defaults", name: this.name };
    const original = await this.c1.config.get(options);
    const updatedEntry = { ...this.entry, Protocol: "tcp" };

    should(await this.c1.config.set({ entry: updatedEntry, cas: 0 })).equal(
      false,
    );
    should(
      await this.c1.config.set({
        entry: updatedEntry,
        cas: original.ModifyIndex + 1,
      }),
    ).equal(false);
    should(
      await this.c1.config.set({
        entry: updatedEntry,
        cas: original.ModifyIndex,
      }),
    ).equal(true);

    should(await this.c1.config.delete({ ...options, cas: 0 })).equal(false);
    should(
      await this.c1.config.del({ ...options, cas: original.ModifyIndex }),
    ).equal(false);
    const updated = await this.c1.config.get(options);
    should(updated.Protocol).equal("tcp");
    should(
      await this.c1.config.del({ ...options, cas: updated.ModifyIndex }),
    ).equal(true);
    should(await this.c1.config.get(options)).equal(undefined);
  });

  it("should unblock configuration reads after an update", async function () {
    const original = await this.c1.config.get({
      kind: "service-defaults",
      name: this.name,
    });
    const reading = this.c1.config.get({
      kind: "service-defaults",
      name: this.name,
      index: original.ModifyIndex,
      wait: "10s",
      timeout: "15s",
    });

    await this.c1.config.set({ entry: { ...this.entry, Protocol: "tcp" } });
    should((await reading).Protocol).equal("tcp");
  });

  it("should manage L4 and L7 intentions through Config Entries", async function () {
    const intentions = {
      Kind: "service-intentions",
      Name: this.name,
      Sources: [
        { Name: "consul-smoke-source-admin", Action: "allow" },
        {
          Name: "consul-smoke-source-frontend",
          Permissions: [
            {
              Action: "allow",
              HTTP: { PathPrefix: "/api/", Methods: ["GET"] },
            },
          ],
        },
      ],
    };
    should(await this.c1.config.set({ entry: intentions, cas: 0 })).equal(true);

    const options = { kind: "service-intentions", name: this.name };
    const stored = await this.c1.config.get(options);
    should(stored.Sources).containDeep(intentions.Sources);
    const entries = await this.c1.config.list("service-intentions");
    should(entries.some((item) => item.Name === this.name)).equal(true);

    const updated = {
      ...intentions,
      Sources: [{ Name: "consul-smoke-source-admin", Action: "deny" }],
    };
    should(
      await this.c1.config.set({ entry: updated, cas: stored.ModifyIndex }),
    ).equal(true);
    should((await this.c1.config.get(options)).Sources).containDeep(
      updated.Sources,
    );
    should(await this.c1.config.del(options)).equal(true);
    should(await this.c1.config.get(options)).equal(undefined);
  });
});
