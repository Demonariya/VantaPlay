import { describe, expect, it } from "vitest";
import type { MediaItem } from "../types";
import {
  searchItems,
  selectContinueWatching,
  selectRecent,
  sortItems,
} from "./selectors";

function item(over: Partial<MediaItem> & { id: string; name: string }): MediaItem {
  return {
    kind: "video",
    src: "",
    duration: 100,
    addedAt: 0,
    ...over,
  };
}

const items = [
  item({ id: "a", name: "Alpha Movie", addedAt: 300, position: 40, lastPlayedAt: 900 }),
  item({ id: "b", name: "Beta Song", kind: "audio", addedAt: 200, position: 98, lastPlayedAt: 800 }),
  item({ id: "c", name: "Gamma Clip", addedAt: 100 }),
  item({ id: "d", name: "Alpha Sequel", addedAt: 400, position: 3, lastPlayedAt: 700 }),
];

describe("selectContinueWatching", () => {
  it("keeps partially watched, drops finished and barely started", () => {
    const res = selectContinueWatching(items);
    expect(res.map((i) => i.id)).toEqual(["a"]);
  });
});

describe("selectRecent", () => {
  it("orders by addedAt desc", () => {
    expect(selectRecent(items).map((i) => i.id)).toEqual(["d", "a", "b", "c"]);
  });
});

describe("searchItems", () => {
  it("matches case-insensitively", () => {
    expect(searchItems(items, "alpha").map((i) => i.id)).toEqual(["a", "d"]);
    expect(searchItems(items, "").length).toBe(4);
  });
});

describe("sortItems", () => {
  it("sorts by name", () => {
    expect(sortItems(items, "name").map((i) => i.id)).toEqual(["a", "d", "b", "c"]);
  });
  it("sorts by added", () => {
    expect(sortItems(items, "added").map((i) => i.id)).toEqual(["d", "a", "b", "c"]);
  });
});
