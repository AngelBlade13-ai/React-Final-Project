const test = require("node:test");
const assert = require("node:assert/strict");
const {
  __test: {
    isAcceptableExcerpt,
    hasStructuredReleaseNote,
    isStrongExcerptPatch,
    isStrongContentPatch,
    normalizePostSuggestionResult
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
