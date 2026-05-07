import { describe, expect, it } from "vitest";
import { resolveGuidedListeningPath } from "./listeningPaths";
import {
  getPrimaryCollectionSurfacePosts,
  getReleaseStatus,
  sortCollectionsForPublicNavigation
} from "./site";

const catalogFixture = {
  collections: [
    {
      slug: "fractureverse",
      title: "Fractureverse",
      isPublicPrimary: true
    },
    {
      slug: "villain-anthology",
      title: "Villain Anthology",
      isPublicPrimary: false
    }
  ],
  posts: [
    {
      slug: "the-one-you-used-to-be-reimagined",
      title: "The One You Used To Be Reimagined",
      collectionSlugs: ["fractureverse"],
      releaseStatus: "canon",
      isPubliclyVisible: true
    },
    {
      slug: "still-breathing-in-a-dying-world-reimagined",
      title: "Still Breathing In A Dying World Reimagined",
      collectionSlugs: ["fractureverse"],
      releaseStatus: "canon",
      isPubliclyVisible: true
    },
    {
      slug: "shattered-trust-reimagined",
      title: "Shattered Trust Reimagined",
      collectionSlugs: ["fractureverse"],
      releaseStatus: "canon",
      isPubliclyVisible: true
    },
    {
      slug: "you-were-better-before-you-saved-the-world-reimagined",
      title: "You Were Better Before You Saved The World Reimagined",
      collectionSlugs: ["fractureverse"],
      releaseStatus: "canon",
      isPubliclyVisible: true
    },
    {
      slug: "we-were-never-meant-to-survive-reimagined-duet",
      title: "We Were Never Meant To Survive Reimagined Duet",
      collectionSlugs: ["fractureverse"],
      releaseStatus: "canon",
      isPubliclyVisible: true
    },
    {
      slug: "the-hands-that-shield",
      title: "The Hands That Shield",
      collectionSlugs: ["villain-anthology"],
      subCategory: "villain",
      themeTags: ["villain"],
      worldLayer: "villain",
      releaseStatus: "canon",
      isPubliclyVisible: true,
      createdAt: "2026-05-01T00:00:00.000Z"
    },
    {
      slug: "you-wanted-a-hero",
      title: "You Wanted A Hero",
      collectionSlugs: ["villain-anthology"],
      subCategory: "villain",
      themeTags: ["villain"],
      worldLayer: "villain",
      releaseStatus: "canon",
      isPubliclyVisible: true,
      createdAt: "2026-05-02T00:00:00.000Z"
    }
  ]
};

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

describe("resolveGuidedListeningPath", () => {
  it("keeps the Fractureverse path scoped to the five main fragments", () => {
    const path = resolveGuidedListeningPath(
      "fractureverse",
      catalogFixture.posts,
      catalogFixture.collections
    );

    expect(path.posts.map((post) => post.slug)).toEqual([
      "the-one-you-used-to-be-reimagined",
      "still-breathing-in-a-dying-world-reimagined",
      "shattered-trust-reimagined",
      "you-were-better-before-you-saved-the-world-reimagined",
      "we-were-never-meant-to-survive-reimagined-duet"
    ]);
  });

  it("includes villain-tagged standalone records in the Villain / Catastrophe path", () => {
    const path = resolveGuidedListeningPath(
      "villain-catastrophe",
      catalogFixture.posts,
      catalogFixture.collections
    );
    const slugs = path.posts.map((post) => post.slug);

    expect(slugs).toContain("the-hands-that-shield");
    expect(slugs).toContain("you-wanted-a-hero");
  });

  it("lets admin-managed guided paths use explicit slug ordering", () => {
    const path = resolveGuidedListeningPath(
      "manual-test",
      catalogFixture.posts,
      catalogFixture.collections,
      {
        guidedPaths: [
          {
            slug: "manual-test",
            title: "Manual Test",
            eyebrow: "Admin Path",
            intro: "An exact path order.",
            moodNote: "Manual sequence.",
            postSlugs: ["you-wanted-a-hero", "the-hands-that-shield"]
          }
        ]
      }
    );

    expect(path.posts.map((post) => post.slug)).toEqual([
      "you-wanted-a-hero",
      "the-hands-that-shield"
    ]);
  });
});
