const test = require("node:test");
const assert = require("node:assert/strict");
const {
  appendSlugHistory,
  listPublicCollections,
  normalizePostInput,
  remapPostSlugReferences
} = require("../../src/services/catalogService");
const catalogData = require("../../data/posts.json");

const FRACTUREVERSE_SEQUENCE_SLUGS = [
  "the-one-you-used-to-be-reimagined",
  "still-breathing-in-a-dying-world-reimagined",
  "shattered-trust-reimagined",
  "you-were-better-before-you-saved-the-world-reimagined",
  "we-were-never-meant-to-survive-reimagined-duet"
];

test("normalizePostInput keeps valid collections and defaults invalid status to canon", () => {
  const collections = [{ slug: "eldoria" }, { slug: "standalone" }];

  const post = normalizePostInput(
    {
      title: "A New Dawn",
      collectionSlugs: ["eldoria", "missing-collection", "standalone"],
      releaseStatus: "mystery"
    },
    collections
  );

  assert.equal(post.slug, "a-new-dawn");
  assert.deepEqual(post.collectionSlugs, ["eldoria", "standalone"]);
  assert.equal(post.releaseStatus, "canon");
});

test("appendSlugHistory preserves prior slugs without duplicating the current one", () => {
  const history = appendSlugHistory(
    ["old-title", "first-name"],
    "middle-name",
    "new-title"
  );

  assert.deepEqual(history, ["old-title", "first-name", "middle-name"]);
});

test("remapPostSlugReferences updates linked post, collection, and homepage references", () => {
  const rewritten = remapPostSlugReferences(
    [
      {
        id: "post-1",
        slug: "new-slug",
        archiveMeta: null,
        supersededBySlug: ""
      },
      {
        id: "post-2",
        slug: "linked-post",
        archiveMeta: {
          linkedSlugs: ["old-slug"]
        },
        supersededBySlug: "old-slug"
      }
    ],
    [
      {
        id: "collection-1",
        featuredReleaseSlug: "old-slug"
      }
    ],
    {
      home: {
        featuredReleaseSlug: "old-slug"
      }
    },
    "old-slug",
    "new-slug",
    "post-1"
  );

  assert.deepEqual(rewritten.posts[1].archiveMeta.linkedSlugs, ["new-slug"]);
  assert.equal(rewritten.posts[1].supersededBySlug, "new-slug");
  assert.equal(rewritten.collections[0].featuredReleaseSlug, "new-slug");
  assert.equal(rewritten.siteContent.home.featuredReleaseSlug, "new-slug");
});

test("listPublicCollections keeps primary public ordering ahead of other public collections", () => {
  const store = {
    posts: [
      {
        id: "post-1",
        slug: "opening-fragment",
        published: true,
        isPubliclyVisible: true,
        collectionSlugs: ["fractureverse"]
      }
    ],
    collections: [
      {
        id: "collection-1",
        slug: "side-notes",
        title: "Side Notes",
        isPublicPrimary: true,
        featuredReleaseSlug: ""
      },
      {
        id: "collection-2",
        slug: "eldoria",
        title: "Eldoria",
        isPublicPrimary: true,
        featuredReleaseSlug: ""
      },
      {
        id: "collection-3",
        slug: "fractureverse",
        title: "Fractureverse",
        isPublicPrimary: true,
        featuredReleaseSlug: "opening-fragment"
      }
    ]
  };

  const collections = listPublicCollections(store);

  assert.deepEqual(
    collections.map((collection) => collection.slug),
    ["fractureverse", "eldoria", "side-notes"]
  );
});

test("listPublicCollections counts only releases shown on public collection surfaces", () => {
  const store = {
    posts: [
      {
        id: "post-1",
        slug: "visible-release",
        published: true,
        isPubliclyVisible: true,
        releaseStatus: "canon",
        collectionSlugs: ["original-personal"]
      },
      {
        id: "post-2",
        slug: "working-release",
        published: true,
        isPubliclyVisible: true,
        releaseStatus: "working",
        collectionSlugs: ["original-personal"]
      }
    ],
    collections: [
      {
        id: "collection-1",
        slug: "original-personal",
        title: "Original / Personal",
        isPublicPrimary: true,
        featuredReleaseSlug: "working-release"
      }
    ]
  };

  const [collection] = listPublicCollections(store);

  assert.equal(collection.releaseCount, 1);
  assert.equal(collection.featuredRelease, null);
});

test("tracked Fractureverse collection only contains the main public sequence", () => {
  const fractureverseCollection = catalogData.collections.find(
    (collection) => collection.slug === "fractureverse"
  );
  const fractureversePostSlugs = catalogData.posts
    .filter((post) => post.collectionSlugs.includes("fractureverse"))
    .map((post) => post.slug)
    .sort();

  assert.equal(
    fractureverseCollection.featuredReleaseSlug,
    "shattered-trust-reimagined"
  );
  assert.deepEqual(
    fractureversePostSlugs,
    [...FRACTUREVERSE_SEQUENCE_SLUGS].sort()
  );
});
