import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import * as helper from "./helper.js";

helper.describe("Event", function () {
  before(async function () {
    await helper.before(this);
  });

  after(async function () {
    await helper.after(this);
  });

  beforeEach(async function () {
    this.name = "event-" + randomUUID();
    this.payload = JSON.stringify({ hello: "world" });
    this.bufferPayload = Buffer.from(this.payload);

    this.event = await this.c1.event.fire(this.name, this.payload);
  });

  describe("fire", function () {
    it("should fire an event", async function () {
      const event = await this.c1.event.fire("test");
      assert.ok(
        [
          "ID",
          "Name",
          "Payload",
          "NodeFilter",
          "ServiceFilter",
          "TagFilter",
          "Version",
          "LTime",
        ].every((key) => Object.hasOwn(event, key)),
      );
      assert.equal(event.Name, "test");
    });
  });

  describe("list", function () {
    it("should return events", async function () {
      const events = await this.c1.event.list();
      assert.ok(events.length > 0);
    });

    it("should return event with given name", async function () {
      const events = await this.c1.event.list(this.name);
      assert.ok(events.length > 0);
      assert.equal(events.length, 1);
      assert.equal(events[0].ID, this.event.ID);
      assert.equal(events[0].Name, this.name);
      assert.equal(events[0].Payload, this.payload);
    });

    it("should return payload as buffer", async function () {
      const events = await this.c1.event.list({
        name: this.name,
        buffer: true,
      });
      assert.ok(events.length > 0);
      assert.deepEqual(events[0].Payload, this.bufferPayload);
    });
  });
});
