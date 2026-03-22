# Suno Blog Scaffold

Basic full-stack scaffold for a blog-style site that will feature your Suno songs and downloaded videos. The backend now persists posts, collections, and site content in MongoDB.

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

MongoDB:

```bash
docker run --name suno-mongo -p 27017:27017 -d mongo:8
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
- `MONGODB_URI=mongodb://127.0.0.1:27017`
- `MONGODB_DB_NAME=suno_blog`

On first backend startup, the API will seed MongoDB from the legacy JSON file path in `POSTS_FILE` if the database is empty.

Admin routes:

- `POST /api/admin/login`
- `GET /api/admin/posts`
- `POST /api/admin/posts`
- `PUT /api/admin/posts/:id`
- `DELETE /api/admin/posts/:id`
