# Suno Blog Scaffold

Basic full-stack scaffold for a blog-style site that will feature your Suno songs and downloaded videos. This branch adds admin authentication and admin-only post CRUD.

## Structure

- `backend/` Express API
- `frontend/` React + Vite app

## Run

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Admin Login

Set these in your environment or use the defaults from `.env.example`:

- `ADMIN_EMAIL=admin@example.com`
- `ADMIN_PASSWORD=Admin123!`

Admin routes:

- `POST /api/admin/login`
- `GET /api/admin/posts`
- `POST /api/admin/posts`
- `PUT /api/admin/posts/:id`
- `DELETE /api/admin/posts/:id`
