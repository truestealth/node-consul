import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
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
    assert.equal(await this.c1.config.set({ entry: this.entry, cas: 0 }), true);
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
    assert.partialDeepStrictEqual(entry, this.entry);
    assert.ok(entry.ModifyIndex > 0);

    const entries = await this.c1.config.list("service-defaults");
    assert.equal(
      entries.some((item) => item.Name === this.name),
      true,
    );
  });

  it("should preserve create-only and conditional write/delete semantics", async function () {
    const options = { kind: "service-defaults", name: this.name };
    const original = await this.c1.config.get(options);
    const updatedEntry = { ...this.entry, Protocol: "tcp" };

    assert.equal(
      await this.c1.config.set({ entry: updatedEntry, cas: 0 }),
      false,
    );
    assert.equal(
      await this.c1.config.set({
        entry: updatedEntry,
        cas: original.ModifyIndex + 1,
      }),
      false,
    );
    assert.equal(
      await this.c1.config.set({
        entry: updatedEntry,
        cas: original.ModifyIndex,
      }),
      true,
    );

    assert.equal(await this.c1.config.delete({ ...options, cas: 0 }), false);
    assert.equal(
      await this.c1.config.del({ ...options, cas: original.ModifyIndex }),
      false,
    );
    const updated = await this.c1.config.get(options);
    assert.equal(updated.Protocol, "tcp");
    assert.equal(
      await this.c1.config.del({ ...options, cas: updated.ModifyIndex }),
      true,
    );
    assert.equal(await this.c1.config.get(options), undefined);
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
    assert.equal((await reading).Protocol, "tcp");
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
    assert.equal(await this.c1.config.set({ entry: intentions, cas: 0 }), true);

    const options = { kind: "service-intentions", name: this.name };
    const stored = await this.c1.config.get(options);
    for (const source of intentions.Sources) {
      assert.partialDeepStrictEqual(
        stored.Sources.find((item) => item.Name === source.Name),
        source,
      );
    }
    const entries = await this.c1.config.list("service-intentions");
    assert.equal(
      entries.some((item) => item.Name === this.name),
      true,
    );

    const updated = {
      ...intentions,
      Sources: [{ Name: "consul-smoke-source-admin", Action: "deny" }],
    };
    assert.equal(
      await this.c1.config.set({ entry: updated, cas: stored.ModifyIndex }),
      true,
    );
    const updatedSources = (await this.c1.config.get(options)).Sources;
    for (const source of updated.Sources) {
      assert.partialDeepStrictEqual(
        updatedSources.find((item) => item.Name === source.Name),
        source,
      );
    }
    assert.equal(await this.c1.config.del(options), true);
    assert.equal(await this.c1.config.get(options), undefined);
  });
});
