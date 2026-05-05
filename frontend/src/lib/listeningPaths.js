import {
  getCanonicalCollectionSurfacePosts,
  getHomepageCuratedPosts,
  getOriginalPersonalSection,
  getPrimaryCollectionSurfacePosts,
  getPublicCollectionPosts,
  sortCuratedPosts,
  sortEldoriaPosts,
  sortFractureversePosts
} from "./site";

const PATH_DEFINITIONS = [
  {
    slug: "start-here",
    title: "Start Here",
    eyebrow: "Guided Path",
    intro: "A concise first route through the clearest public entry points before the archive starts branching into deeper worlds and alternates.",
    moodNote: "Best for first contact with the site.",
    themeHint: "",
    resolve({ posts }) {
      return getHomepageCuratedPosts(posts).slice(0, 5);
    }
  },
  {
    slug: "fractureverse",
    title: "Fractureverse",
    eyebrow: "World Path",
    intro: "Follow the fracture from its first stable anchor through collapse, divergence, and the edges where love and consequence stop agreeing with each other.",
    moodNote: "Best for sequence-first listening.",
    themeHint: "fractureverse",
    resolve({ posts, collectionsBySlug }) {
      const collection = collectionsBySlug.get("fractureverse");
      const scopedPosts = getPublicCollectionPosts(posts).filter((post) => (post.collectionSlugs || []).includes("fractureverse"));

      return collection ? sortFractureversePosts(getCanonicalCollectionSurfacePosts(scopedPosts, { collection, surface: "path" })) : [];
    }
  },
  {
    slug: "eldoria",
    title: "Eldoria",
    eyebrow: "World Path",
    intro: "Enter the chronicle in order, starting with awakening and moving deeper into role, memory, pressure, and the burden of belonging to a world that should not know you.",
    moodNote: "Best for story-first listening.",
    themeHint: "eldoria",
    resolve({ posts, collectionsBySlug }) {
      const collection = collectionsBySlug.get("eldoria");
      const scopedPosts = getPublicCollectionPosts(posts).filter((post) => (post.collectionSlugs || []).includes("eldoria"));

      return collection ? sortEldoriaPosts(getPrimaryCollectionSurfacePosts(scopedPosts, { collection, surface: "path" })) : [];
    }
  },
  {
    slug: "identity-becoming",
    title: "Identity / Becoming",
    eyebrow: "Authored Path",
    intro: "A route through the songs that feel most tied to emergence, self-recognition, and the slow process of becoming legible to yourself.",
    moodNote: "Best for personal / reflective listening.",
    themeHint: "",
    resolve({ posts }) {
      return sortCuratedPosts(
        getPublicCollectionPosts(posts).filter((post) => getOriginalPersonalSection(post)?.key === "identity"),
        { surface: "path" }
      ).slice(0, 7);
    }
  },
  {
    slug: "princess-anime",
    title: "Princess / Anime",
    eyebrow: "Authored Path",
    intro: "A brighter route through princess-symbolic, kawaii, and high-expression tracks where fantasy becomes a way of saying something real.",
    moodNote: "Best for vivid, stylized listening.",
    themeHint: "",
    resolve({ posts }) {
      return sortCuratedPosts(
        getPublicCollectionPosts(posts).filter((post) => {
          const sectionKey = getOriginalPersonalSection(post)?.key;
          return (
            sectionKey === "princess-motif" ||
            (post.collectionSlugs || []).some((slug) => ["kawaii-adventure", "kawaii-magical"].includes(slug))
          );
        }),
        { surface: "path" }
      ).slice(0, 7);
    }
  },
  {
    slug: "villain-catastrophe",
    title: "Villain / Catastrophe",
    eyebrow: "Authored Path",
    intro: "A harsher route through villain voices, necessary monsters, and the songs where damage, power, or collapse take center stage.",
    moodNote: "Best for darker, confrontational listening.",
    themeHint: "",
    resolve({ posts }) {
      return sortCuratedPosts(
        getPublicCollectionPosts(posts).filter((post) => {
          const sectionKey = getOriginalPersonalSection(post)?.key;
          return (
            sectionKey === "villain" ||
            String(post.worldLayer || "") === "villain" ||
            (post.themeTags || []).includes("villain") ||
            (post.collectionSlugs || []).some((slug) =>
              ["villain-anthology", "villain-monologues", "villain-monologues-necessary-monsters", "necessary-monsters"].includes(slug)
            )
          );
        }),
        { surface: "path" }
      ).slice(0, 7);
    }
  }
];

function dedupeBySlug(posts = []) {
  const seen = new Set();

  return posts.filter((post) => {
    const slug = String(post?.slug || "").trim();

    if (!slug || seen.has(slug)) {
      return false;
    }

    seen.add(slug);
    return true;
  });
}

function buildCollectionMap(collections = []) {
  return new Map(collections.map((collection) => [collection.slug, collection]));
}

export function resolveGuidedListeningPaths(posts = [], collections = []) {
  const collectionsBySlug = buildCollectionMap(collections);

  return PATH_DEFINITIONS.map((definition) => {
    const resolvedPosts = dedupeBySlug(definition.resolve({ posts, collectionsBySlug }));

    return {
      ...definition,
      posts: resolvedPosts,
      count: resolvedPosts.length
    };
  }).filter((path) => path.posts.length > 0);
}

export function resolveGuidedListeningPath(pathSlug, posts = [], collections = []) {
  return resolveGuidedListeningPaths(posts, collections).find((path) => path.slug === pathSlug) || null;
}
