import { useEffect, useState } from "react";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function App() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPosts() {
      try {
        const response = await fetch(`${apiBaseUrl}/posts`);
        const data = await response.json();
        setPosts(data.posts || []);
      } catch (error) {
        console.error("Failed to load posts", error);
      } finally {
        setLoading(false);
      }
    }

    loadPosts();
  }, []);

  return (
    <div className="page-shell">
      <header className="hero">
        <p className="eyebrow">Fresh Start</p>
        <h1>Suno Sessions Blog</h1>
        <p className="hero-copy">
          A clean blog-style home for your Suno music posts, release notes, embedded videos, and track stories.
        </p>
      </header>

      <main className="content-grid">
        <section className="intro-card">
          <h2>Scaffold Direction</h2>
          <p>
            This is a lightweight starter. From here, you can add post CRUD, login, protected admin pages, and video
            uploads branch by branch with clean commit history.
          </p>
        </section>

        <section>
          <div className="section-head">
            <h2>Recent Posts</h2>
            <span>{loading ? "Loading..." : `${posts.length} posts`}</span>
          </div>

          <div className="post-grid">
            {posts.map((post) => (
              <article className="post-card" key={post.id}>
                <img alt={post.title} src={post.coverImage} />
                <div className="post-body">
                  <p className="meta">
                    {post.category} | {post.publishedAt}
                  </p>
                  <h3>{post.title}</h3>
                  <p>{post.summary}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
