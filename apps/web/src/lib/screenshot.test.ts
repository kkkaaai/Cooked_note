import { describe, it, expect } from "vitest";
import { captureRegion, dataUrlToBase64 } from "./screenshot";

describe("dataUrlToBase64", () => {
  it("strips data URL prefix", () => {
    expect(dataUrlToBase64("data:image/png;base64,abc123")).toBe("abc123");
  });

  it("handles data URL with complex base64", () => {
    expect(dataUrlToBase64("data:image/png;base64,iVBORw0KGgo=")).toBe(
      "iVBORw0KGgo="
    );
  });

  it("returns input if no comma found", () => {
    expect(dataUrlToBase64("rawbase64data")).toBe("rawbase64data");
  });
});

describe("captureRegion", () => {
  it("returns null when no canvas is found", () => {
    const div = document.createElement("div");
    const result = captureRegion(div, {
      x: 0.1,
      y: 0.1,
      width: 0.5,
      height: 0.3,
    });
    expect(result).toBeNull();
  });

  it("returns null for zero-width region", () => {
    const div = document.createElement("div");
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    div.appendChild(canvas);

    const result = captureRegion(div, {
      x: 0.1,
      y: 0.1,
      width: 0,
      height: 0.3,
    });
    expect(result).toBeNull();
  });

  it("returns null for zero-height region", () => {
    const div = document.createElement("div");
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    div.appendChild(canvas);

    const result = captureRegion(div, {
      x: 0.1,
      y: 0.1,
      width: 0.5,
      height: 0,
    });
    expect(result).toBeNull();
  });

  it("returns a data URL for valid canvas and region (or null without native canvas)", () => {
    const div = document.createElement("div");
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 300;
    div.appendChild(canvas);

    const result = captureRegion(div, {
      x: 0.1,
      y: 0.1,
      width: 0.5,
      height: 0.3,
    });
    // getContext("2d") returns null in jsdom without the native canvas package,
    // so captureRegion correctly returns null. With canvas installed, it returns a data URL.
    const hasCanvasSupport =
      document.createElement("canvas").getContext("2d") !== null;
    if (hasCanvasSupport) {
      expect(result).toBeTruthy();
      expect(result!.startsWith("data:image/png")).toBe(true);
    } else {
      expect(result).toBeNull();
    }
  });
});
