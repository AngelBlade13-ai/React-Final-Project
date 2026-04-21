import { describe, expect, it } from "vitest";
import {
  getPrimaryCollectionSurfacePosts,
  getReleaseStatus,
  sortCollectionsForPublicNavigation
} from "./site";

describe("sortCollectionsForPublicNavigation", () => {
  it("keeps primary collection anchors ahead of other public collections", () => {
    const collections = [
      { slug: "side-notes", title: "Side Notes", isPublicPrimary: true },
      { slug: "eldoria", title: "Eldoria", isPublicPrimary: true },
      { slug: "fractureverse", title: "Fractureverse", isPublicPrimary: true }
    ];

    expect(
      sortCollectionsForPublicNavigation(collections).map(
        (collection) => collection.slug
      )
    ).toEqual(["fractureverse", "eldoria", "side-notes"]);
  });
});

describe("getReleaseStatus", () => {
  it("falls back to canon when a release carries an unknown status", () => {
    expect(getReleaseStatus({ releaseStatus: "prototype" })).toBe("canon");
  });
});

describe("getPrimaryCollectionSurfacePosts", () => {
  it("keeps the preferred public version per family on the collection surface", () => {
    const posts = [
      {
        id: "post-1",
        slug: "signal-bloom",
        title: "Signal Bloom",
        collectionSlugs: ["standalone"],
        versionFamily: "signal-bloom",
        releaseStatus: "canon",
        isPubliclyVisible: true,
        isPrimaryVersion: true,
        createdAt: "2026-04-20T00:00:00.000Z"
      },
      {
        id: "post-2",
        slug: "signal-bloom-reimagined",
        title: "Signal Bloom Reimagined",
        collectionSlugs: ["standalone"],
        versionFamily: "signal-bloom",
        releaseStatus: "alternate",
        isPubliclyVisible: true,
        isPrimaryVersion: false,
        createdAt: "2026-04-21T00:00:00.000Z"
      }
    ];

    expect(
      getPrimaryCollectionSurfacePosts(posts).map((post) => post.slug)
    ).toEqual(["signal-bloom"]);
  });
});
