const test = require("node:test");
const assert = require("node:assert/strict");
const {
  __test: {
    annotateCatalogFindingsWithMemory,
    buildCatalogFindingFingerprint,
    getGuidedPathCandidatePosts,
    hasUsableReviewResult,
    isAcceptableExcerpt,
    hasStructuredReleaseNote,
    isStrongExcerptPatch,
    isStrongContentPatch,
    normalizeAssistantFindingDecisions,
    normalizeFindingReviewResult,
    normalizeNewGuidedPathSuggestionResult,
    normalizePostSuggestionResult,
    summarizePostForAssistant,
    titleFitsSuggestedMembership
  }
} = require("../../src/services/localAiService");

test("isStrongExcerptPatch rejects weak paraphrases and accepts stronger card copy", () => {
  const currentDraft = {
    excerpt:
      "A reflective song about loss and memory, told in soft, introspective language as the narrator tries to stay close to what grief keeps changing."
  };

  assert.equal(isAcceptableExcerpt(currentDraft.excerpt), true);
  assert.equal(
    isStrongExcerptPatch(currentDraft.excerpt, currentDraft),
    false
  );
  assert.equal(
    isStrongExcerptPatch(
      "A grief-laced memory piece that turns private collapse into precise public-facing copy about what still lingers after the loss, and why the memory refuses to let the speaker go.",
      currentDraft
    ),
    true
  );
});

test("isStrongContentPatch only accepts structured materially improved release notes", () => {
  const currentDraft = {
    content:
      "**Universe:** Original / Personal\n**Theme:** Quiet grief.\n**Notes:** Sparse piano and a soft vocal."
  };

  assert.equal(hasStructuredReleaseNote(currentDraft.content), false);
  assert.equal(
    isStrongContentPatch(currentDraft.content, currentDraft),
    false
  );
  assert.equal(
    isStrongContentPatch(
      "**Universe:** Original / Personal\n**Characters:** Personal narrator\n**POV:** Solo confession\n**Version:** Working Version\n**Theme:** A quiet grief piece about memory that refuses to disappear after loss.\n**Mood:** Intimate, restrained, and fragile.\n**Source:** Suno\n**Notes:** Sparse piano, close mic female vocal, and low ambient texture that keeps the performance feeling private rather than cinematic.",
      currentDraft
    ),
    true
  );
});

test("normalizePostSuggestionResult filters weak excerpt and content patches", () => {
  const currentDraft = {
    excerpt:
      "A reflective song about loss and memory, told in soft, introspective language as the narrator tries to stay close to what grief keeps changing.",
    content:
      "**Universe:** Original / Personal\n**Theme:** Quiet grief.\n**Notes:** Sparse piano and a soft vocal."
  };

  const result = normalizePostSuggestionResult(
    {
      fieldAssessments: [
        { field: "excerpt", status: "improve", reason: "Needs stronger copy." },
        { field: "content", status: "improve", reason: "Needs more structure." }
      ],
      suggestedPatch: {
        excerpt:
          "A reflective song about loss and memory, told in soft, introspective language.",
        content:
          "Quiet grief song with piano and soft voice."
      },
      rationale: ["Tried to improve both fields."]
    },
    [],
    currentDraft
  );

  assert.deepEqual(result.suggestedPatch, {});
});

test("normalizePostSuggestionResult filters reordered metadata that repeats current values", () => {
  const currentDraft = {
    subCategory: "identity",
    worldLayer: "eldoria",
    releaseStatus: "canon",
    themeTags: ["identity", "resilience", "memory"],
    collectionSlugs: ["eldoria", "original-personal"]
  };

  const result = normalizePostSuggestionResult(
    {
      fieldAssessments: [
        { field: "subCategory", status: "improve", reason: "Needs work." },
        { field: "worldLayer", status: "improve", reason: "Needs work." },
        { field: "releaseStatus", status: "improve", reason: "Needs work." },
        { field: "themeTags", status: "improve", reason: "Needs work." },
        {
          field: "collectionSlugs",
          status: "improve",
          reason: "Needs work."
        }
      ],
      suggestedPatch: {
        subCategory: " identity ",
        worldLayer: "Eldoria",
        releaseStatus: "CANON",
        themeTags: ["memory", "identity", "resilience", "memory"],
        collectionSlugs: ["original-personal", "eldoria"]
      }
    },
    [{ slug: "eldoria" }, { slug: "original-personal" }],
    currentDraft
  );

  assert.deepEqual(result.suggestedPatch, {});
});

test("hasUsableReviewResult rejects fully empty catalog reviews", () => {
  assert.equal(
    hasUsableReviewResult({
      summary: "",
      risks: [],
      suggestedActions: [],
      findings: []
    }),
    false
  );

  assert.equal(
    hasUsableReviewResult({
      summary: "Catalog is broadly coherent.",
      risks: [],
      suggestedActions: []
    }),
    true
  );

  assert.equal(
    hasUsableReviewResult({
      summary: "",
      risks: [],
      suggestedActions: [],
      findings: [
        {
          severity: "warning",
          targetType: "post",
          targetSlug: "test-post",
          field: "themeTags",
          issue: "Missing tags.",
          recommendedAction: "Add theme tags."
        }
      ]
    }),
    true
  );
});

test("hasUsableReviewResult counts findings as usable review content", () => {
  assert.equal(
    hasUsableReviewResult({
      findings: [
        {
          severity: "warning",
          targetType: "path",
          targetSlug: "start-here",
          field: "postSlugs",
          issue: "Membership is too narrow.",
          recommendedAction: "Review the candidate set."
        }
      ]
    }),
    true
  );
});

test("catalog review memory suppresses rejected post findings until target changes", () => {
  const finding = {
    severity: "warning",
    targetType: "post",
    targetSlug: "crown-of-dreams-original-version",
    field: "themeTags",
    issue: "Post lacks princess-related theme tags.",
    recommendedAction: "Add princess and magical theme tags."
  };
  const store = {
    posts: [
      {
        slug: "crown-of-dreams-original-version",
        excerpt: "A clear identity allegory.",
        content: "**Universe:** Original / Personal",
        collectionSlugs: ["original-personal"],
        releaseStatus: "canon",
        subCategory: "princess-motif",
        themeTags: ["trans-identity", "allegory"],
        worldLayer: "allegorical"
      }
    ],
    siteContent: {}
  };
  const firstPass = annotateCatalogFindingsWithMemory(
    { findings: [finding] },
    store
  );
  const decision = {
    fingerprint: buildCatalogFindingFingerprint(finding),
    status: "rejected",
    reasonCode: "already-coherent",
    targetType: finding.targetType,
    targetSlug: finding.targetSlug,
    field: finding.field,
    issue: finding.issue,
    recommendedAction: finding.recommendedAction,
    targetStateHash: firstPass.findings[0].targetStateHash,
    summary: "Current tags are coherent."
  };
  const suppressed = annotateCatalogFindingsWithMemory(
    { findings: [finding] },
    {
      ...store,
      siteContent: {
        assistantFindingDecisions: [decision]
      }
    }
  );
  const changed = annotateCatalogFindingsWithMemory(
    { findings: [finding] },
    {
      ...store,
      posts: [
        {
          ...store.posts[0],
          themeTags: ["trans-identity", "allegory", "princess"]
        }
      ],
      siteContent: {
        assistantFindingDecisions: [decision]
      }
    }
  );

  assert.equal(firstPass.findings.length, 1);
  assert.equal(suppressed.findings.length, 0);
  assert.equal(suppressed.suppressedFindingCount, 1);
  assert.equal(changed.findings.length, 1);
});

test("normalizeFindingReviewResult rejects accepted verdicts without usable patches", () => {
  const result = normalizeFindingReviewResult(
    {
      verdict: "accepted",
      reasonCode: "material-improvement",
      fieldAssessments: [
        {
          field: "themeTags",
          status: "improve",
          reason: "Needs a theme tag."
        }
      ],
      suggestedPatch: {
        themeTags: ["identity"]
      }
    },
    [],
    {
      themeTags: ["identity"]
    }
  );

  assert.equal(result.verdict, "rejected");
  assert.deepEqual(result.suggestedPatch, {});
});

test("normalizeAssistantFindingDecisions keeps known decision fields only", () => {
  const [decision] = normalizeAssistantFindingDecisions([
    {
      fingerprint: "catalog-finding:post:one:themeTags:tags",
      status: "Rejected",
      reasonCode: "already-coherent",
      targetType: "post",
      targetSlug: "one",
      patchFields: ["themeTags", ""],
      unknown: true
    }
  ]);

  assert.equal(decision.status, "rejected");
  assert.equal(decision.reasonCode, "already-coherent");
  assert.deepEqual(decision.patchFields, ["themeTags"]);
  assert.equal("unknown" in decision, false);
});

test("summarizePostForAssistant includes excerpt and content preview for catalog review context", () => {
  const result = summarizePostForAssistant({
    slug: "crown-of-dreams-original-version",
    title: "Crown of Dreams",
    excerpt:
      "A melancholic allegorical piece about identity and fragile self-recognition.",
    content:
      "**Universe:** Original / Personal\n\n**Theme:** A princess-motif allegory about trans identity and dreamlike selfhood.",
    collectionSlugs: ["original-personal"],
    subCategory: "princess-motif",
    worldLayer: "allegorical",
    themeTags: ["trans-identity", "allegory", "gender-identity"]
  });

  assert.match(result.excerpt, /melancholic allegorical piece/i);
  assert.match(result.contentPreview, /princess-motif allegory/i);
});

test("getGuidedPathCandidatePosts scopes homepage preset to public homepage-eligible posts", () => {
  const posts = [
    {
      slug: "homepage-canon",
      published: true,
      isPubliclyVisible: true,
      isHomepageEligible: true,
      releaseStatus: "canon",
      versionFamily: "family-a",
      createdAt: "2026-05-01T00:00:00.000Z"
    },
    {
      slug: "homepage-alternate-same-family",
      published: true,
      isPubliclyVisible: true,
      isHomepageEligible: true,
      releaseStatus: "alternate",
      versionFamily: "family-a",
      createdAt: "2026-05-02T00:00:00.000Z"
    },
    {
      slug: "homepage-second",
      published: true,
      isPubliclyVisible: true,
      isHomepageEligible: true,
      releaseStatus: "canon",
      versionFamily: "family-b",
      createdAt: "2026-05-03T00:00:00.000Z"
    },
    {
      slug: "not-homepage",
      published: true,
      isPubliclyVisible: true,
      isHomepageEligible: false,
      releaseStatus: "canon",
      versionFamily: "family-c",
      createdAt: "2026-05-04T00:00:00.000Z"
    },
    {
      slug: "working-homepage",
      published: true,
      isPubliclyVisible: true,
      isHomepageEligible: true,
      releaseStatus: "working",
      versionFamily: "family-d",
      createdAt: "2026-05-05T00:00:00.000Z"
    }
  ];

  const candidates = getGuidedPathCandidatePosts(posts, {
    slug: "start-here",
    algorithm: { preset: "homepage", maxItems: 5 }
  });

  assert.deepEqual(
    candidates.map((post) => post.slug),
    ["homepage-second", "homepage-canon"]
  );
});

test("titleFitsSuggestedMembership rejects world titles that do not match selected posts", () => {
  const posts = [
    {
      slug: "identity-song",
      collectionSlugs: ["original-personal"],
      worldLayer: ""
    },
    {
      slug: "eldoria-song",
      collectionSlugs: ["eldoria"],
      worldLayer: "eldoria"
    }
  ];

  assert.equal(
    titleFitsSuggestedMembership(
      "Eldoria / Fractureverse Threshold",
      { postSlugs: ["identity-song"] },
      posts
    ),
    false
  );

  assert.equal(
    titleFitsSuggestedMembership(
      "Eldoria Threshold",
      { postSlugs: ["eldoria-song"] },
      posts
    ),
    true
  );
});

test("normalizeNewGuidedPathSuggestionResult clears mismatched world titles", () => {
  const posts = [
    {
      slug: "identity-song",
      published: true,
      isPubliclyVisible: true,
      collectionSlugs: ["original-personal"],
      worldLayer: ""
    }
  ];

  const result = normalizeNewGuidedPathSuggestionResult(
    {
      suggestedPatch: {
        slug: "new-threshold",
        title: "Eldoria and Fractureverse Threshold",
        postSlugs: ["identity-song"]
      }
    },
    { posts, collections: [] },
    []
  );

  assert.equal(result.suggestedPatch.title, undefined);
  assert.ok(
    result.warnings.includes(
      "The assistant title did not match the suggested path membership, so it was cleared."
    )
  );
});
