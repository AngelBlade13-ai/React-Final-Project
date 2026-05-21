import { useDeferredValue, useEffect, useMemo, useState } from "react";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { useAdminContext } from "../../layouts/AdminLayout";
import { apiBaseUrl } from "../../lib/site";

function userMatchesQuery(user, query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    user.displayName,
    user.email,
    user.role,
    user.status
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export default function AdminUsersPage() {
  useDocumentTitle("Admin Users");
  const { adminFetch } = useAdminContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let isCancelled = false;

    async function loadUsers() {
      try {
        setLoading(true);
        setError("");

        const response = await adminFetch(`${apiBaseUrl}/admin/users`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load users.");
        }

        if (!isCancelled) {
          setUsers(data.users || []);
        }
      } catch (apiError) {
        if (!isCancelled) {
          setError(apiError.message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      isCancelled = true;
    };
  }, [adminFetch]);

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesRole = roleFilter === "all" || user.role === roleFilter;
        const matchesStatus =
          statusFilter === "all" || user.status === statusFilter;

        return (
          matchesRole &&
          matchesStatus &&
          userMatchesQuery(user, deferredQuery)
        );
      }),
    [deferredQuery, roleFilter, statusFilter, users]
  );

  async function updateUser(user, patch) {
    try {
      setUpdatingId(user.id);
      setError("");

      const response = await adminFetch(`${apiBaseUrl}/admin/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({
          role: patch.role || user.role,
          status: patch.status || user.status
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update user.");
      }

      setUsers((current) =>
        current.map((entry) =>
          entry.id === user.id ? { ...entry, ...(data.user || {}) } : entry
        )
      );
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setUpdatingId("");
    }
  }

  async function deleteUser(user) {
    const confirmed = window.confirm(
      `Delete ${user.email}? This also removes their public comments.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingId(user.id);
      setError("");

      const response = await adminFetch(`${apiBaseUrl}/admin/users/${user.id}`, {
        method: "DELETE"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete user.");
      }

      setUsers((current) => current.filter((entry) => entry.id !== user.id));
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <main className="admin-grid">
      <section className="intro-card homepage-panel admin-intro-card">
        <p className="eyebrow">Users</p>
        <h2>Moderate public accounts without touching the database.</h2>
        <p>
          Review account status, promote trusted users, disable bad actors, or
          delete throwaway accounts and their comments.
        </p>
      </section>

      <section className="intro-card homepage-panel full-span admin-comments-toolbar">
        <label className="search-field">
          Find users
          <input
            className="explore-search-input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search display name, email, role, or status"
            type="search"
            value={query}
          />
        </label>
        <div className="filter-chip-row">
          {["all", "user", "admin"].map((role) => (
            <button
              className={`filter-chip${roleFilter === role ? " active" : ""}`}
              key={role}
              onClick={() => setRoleFilter(role)}
              type="button"
            >
              {role === "all" ? "All roles" : role}
            </button>
          ))}
          {["all", "active", "disabled"].map((status) => (
            <button
              className={`filter-chip${statusFilter === status ? " active" : ""}`}
              key={status}
              onClick={() => setStatusFilter(status)}
              type="button"
            >
              {status === "all" ? "All statuses" : status}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <section className="intro-card homepage-panel full-span">
          <p className="eyebrow">User Management Error</p>
          <h3>That account could not be updated.</h3>
          <p>{error}</p>
        </section>
      ) : null}

      <section className="full-span">
        <div className="section-head">
          <h2>Accounts</h2>
          <span>{loading ? "Loading..." : `${filteredUsers.length} users`}</span>
        </div>

        {!loading && !filteredUsers.length ? (
          <section className="intro-card homepage-panel empty-state-card">
            <p className="eyebrow">No Matches</p>
            <h3>No users match that filter.</h3>
            <p>Try a broader search or switch back to all users.</p>
          </section>
        ) : (
          <div className="comment-list admin-comment-list">
            {filteredUsers.map((user) => (
              <article className="comment-card admin-comment-card" key={user.id}>
                <div className="comment-card-head">
                  <div>
                    <h3>{user.displayName || user.email}</h3>
                    <p className="comment-meta">{user.email}</p>
                  </div>
                  <div className="user-status-stack">
                    <span className={`activity-status-pill status-${user.status}`}>
                      {user.status}
                    </span>
                    <span className="activity-status-pill">{user.role}</span>
                  </div>
                </div>
                <div className="admin-comment-meta-stack">
                  <span>{`${user.commentCount || 0} comments`}</span>
                  <span>{`${user.savedReleaseCount || 0} saved releases`}</span>
                  <span>{`${user.reactionCount || 0} reactions`}</span>
                </div>
                <div className="comment-card-actions">
                  <button
                    className="secondary-button"
                    disabled={updatingId === user.id || user.status === "active"}
                    onClick={() => updateUser(user, { status: "active" })}
                    type="button"
                  >
                    Reactivate
                  </button>
                  <button
                    className="secondary-button"
                    disabled={updatingId === user.id || user.status === "disabled"}
                    onClick={() => updateUser(user, { status: "disabled" })}
                    type="button"
                  >
                    Disable
                  </button>
                  <button
                    className="secondary-button"
                    disabled={updatingId === user.id || user.role === "admin"}
                    onClick={() => updateUser(user, { role: "admin" })}
                    type="button"
                  >
                    Make Admin
                  </button>
                  <button
                    className="secondary-button"
                    disabled={updatingId === user.id || user.role === "user"}
                    onClick={() => updateUser(user, { role: "user" })}
                    type="button"
                  >
                    Make User
                  </button>
                  <button
                    className="danger-button"
                    disabled={updatingId === user.id || user.role === "admin"}
                    onClick={() => deleteUser(user)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
