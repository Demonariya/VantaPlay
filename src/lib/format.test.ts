import { describe, expect, it } from "vitest";
import {
  extFromName,
  formatBytes,
  formatRelative,
  formatResolution,
  formatTime,
  isSupportedMediaFile,
  kindFromName,
  progressFraction,
} from "./format";

describe("formatTime", () => {
  it("formats seconds", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(134)).toBe("2:14");
  });
  it("formats hours", () => {
    expect(formatTime(5045)).toBe("1:24:05");
    expect(formatTime(3600)).toBe("1:00:00");
  });
  it("handles garbage", () => {
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime(-5)).toBe("0:00");
    expect(formatTime(Infinity)).toBe("0:00");
  });
});

describe("formatBytes", () => {
  it("formats sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024 * 720)).toBe("720 MB");
    expect(formatBytes(1024 ** 3 * 1.4)).toBe("1.4 GB");
  });
  it("handles missing", () => {
    expect(formatBytes(undefined)).toBe("—");
  });
});

describe("formatResolution", () => {
  it("joins dimensions", () => {
    expect(formatResolution(1920, 1080)).toBe("1920×1080");
    expect(formatResolution(undefined, 1080)).toBe("—");
  });
});

describe("formatRelative", () => {
  const now = 1_000_000_000_000;
  it("formats relative times", () => {
    expect(formatRelative(now - 10_000, now)).toBe("just now");
    expect(formatRelative(now - 5 * 60_000, now)).toBe("5m ago");
    expect(formatRelative(now - 3 * 3600_000, now)).toBe("3h ago");
    expect(formatRelative(now - 4 * 86400_000, now)).toBe("4d ago");
  });
});

describe("progressFraction", () => {
  it("returns null when not started or finished", () => {
    expect(progressFraction({ duration: 100 })).toBeNull();
    expect(progressFraction({ position: 0, duration: 100 })).toBeNull();
    expect(progressFraction({ position: 97, duration: 100 })).toBeNull();
  });
  it("returns fraction when partially watched", () => {
    expect(progressFraction({ position: 50, duration: 100 })).toBe(0.5);
  });
});

describe("kindFromName / isSupportedMediaFile", () => {
  it("detects audio", () => {
    expect(kindFromName("song.mp3")).toBe("audio");
    expect(kindFromName("track.FLAC")).toBe("audio");
  });
  it("defaults to video", () => {
    expect(kindFromName("movie.mkv")).toBe("video");
    expect(kindFromName("weird.xyz")).toBe("video");
  });
  it("validates extensions", () => {
    expect(isSupportedMediaFile("a.mp4")).toBe(true);
    expect(isSupportedMediaFile("a.mp3")).toBe(true);
    expect(isSupportedMediaFile("a.txt")).toBe(false);
  });
  it("extracts ext", () => {
    expect(extFromName("Movie.MKV")).toBe("mkv");
  });
});
