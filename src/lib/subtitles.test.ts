import { describe, expect, it } from "vitest";
import { srtToVtt } from "./subtitles";

describe("srtToVtt", () => {
  it("converts timestamps and adds header", () => {
    const srt = `1\n00:00:01,000 --> 00:00:04,000\nHello world\n\n2\n00:00:05,500 --> 00:00:07,000\nSecond line`;
    const vtt = srtToVtt(srt);
    expect(vtt.startsWith("WEBVTT")).toBe(true);
    expect(vtt).toContain("00:00:01.000 --> 00:00:04.000");
    expect(vtt).toContain("Hello world");
  });
  it("passes WebVTT through", () => {
    const vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi";
    expect(srtToVtt(vtt)).toBe(vtt);
  });
  it("handles empty input", () => {
    expect(srtToVtt("")).toBe("WEBVTT\n\n");
  });
});
