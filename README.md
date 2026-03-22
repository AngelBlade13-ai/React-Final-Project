# Suno Blog Scaffold

Suno Blog Scaffold is a full-stack music archive built with React, Vite, Express, and MongoDB. It combines public release browsing, immersive collection worlds, protected admin management, and public user accounts with comments.

## Project Structure

```text
project-root/
|-- backend/
|   |-- src/
|   `-- package.json
|-- frontend/
|   |-- src/
|   `-- package.json
|-- README.md
`-- .gitignore
```

## Key Features

- Admin authentication with JWT-protected admin routes
- Public user registration, login, logout, and account editing
- CRUD API for posts, collections, about content, and comments
- MongoDB persistence for posts, collections, site content, users, and comments
- Public comments with edit and delete controls for the comment author
- Themed collection and release pages with responsive layout
- Dynamic page titles and a custom threshold favicon

## Setup

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment variables

Copy the root `.env.example` values into your own local environment files.

Required backend values:

- `PORT`
- `CLIENT_URL`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`
- `MONGODB_URI`
- `MONGODB_DB_NAME`

Frontend API base URL:

- `VITE_API_URL`

### 3. Start MongoDB

Example local Docker command:

```bash
docker run --name suno-mongo -p 27017:27017 -d mongo:8
```

### 4. Start the backend

```bash
cd backend
npm run dev
```

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

## Verification

```bash
cd backend
npm run verify

cd ../frontend
npm run verify
```

On first backend startup, the API seeds MongoDB from the legacy JSON source if the database is empty.

## Usage

### Public user flow

1. Open `/account`
2. Create an account with display name, email, and password
3. Sign in and open any release page
4. Add, edit, or delete your own comments
5. Use the account page to update your display name or password

### Admin flow

1. Open `/admin/login`
2. Sign in with the configured admin credentials
3. Access the protected `/admin` dashboard
4. Create, edit, and delete posts and collections
5. Update About page content

### Hidden admin access

The public navigation does not show a permanent admin login link.

Admin access can be reached in either of these ways:

1. Visit `/admin/login` directly
2. Click the site mark in the public header 5 times quickly to reveal `Admin Access`

## Authentication

The project includes two authentication flows:

- Admin authentication for protected dashboard pages
- Public user authentication for account management and comments

Security measures currently in code:

- hashed user passwords with `bcryptjs`
- JWT-based session tokens
- `helmet` security headers
- rate limiting on login and comment write routes
- ownership checks on comment edits and deletes

## API Documentation

### Admin authentication

`POST /api/admin/login`

Example request:

```json
{
  "email": "admin@example.com",
  "password": "Admin123!"
}
```

Example response:

```json
{
  "token": "jwt-token",
  "admin": {
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### Public user registration

`POST /api/auth/register`

Example request:

```json
{
  "displayName": "AngelBlade13",
  "email": "user@example.com",
  "password": "StrongPass123"
}
```

Example response:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "displayName": "AngelBlade13",
    "role": "user",
    "status": "active"
  }
}
```

### Posts CRUD

- `GET /api/posts`
- `GET /api/posts/:slug`
- `POST /api/admin/posts`
- `PUT /api/admin/posts/:id`
- `DELETE /api/admin/posts/:id`

Create request example:

```json
{
  "title": "Signal in the Static",
  "excerpt": "A transmission from the threshold.",
  "content": "Full release description",
  "published": true,
  "collectionSlugs": ["fractureverse"]
}
```

Create response example:

```json
{
  "post": {
    "id": "post-id",
    "title": "Signal in the Static",
    "slug": "signal-in-the-static",
    "published": true
  }
}
```

### Collections CRUD

- `GET /api/collections`
- `GET /api/collections/:slug`
- `POST /api/admin/collections`
- `PUT /api/admin/collections/:id`
- `DELETE /api/admin/collections/:id`

Create request example:

```json
{
  "title": "Fractureverse",
  "description": "A broken world of recursive signals.",
  "theme": "fractureverse"
}
```

Create response example:

```json
{
  "collection": {
    "id": "collection-id",
    "title": "Fractureverse",
    "slug": "fractureverse"
  }
}
```

### Comment CRUD

- `GET /api/posts/:slug/comments`
- `POST /api/posts/:slug/comments`
- `PUT /api/comments/:id`
- `DELETE /api/comments/:id`

Create request example:

```json
{
  "body": "This release feels like a threshold crossing."
}
```

Create response example:

```json
{
  "comment": {
    "id": "comment-id",
    "postSlug": "signal-in-the-static",
    "body": "This release feels like a threshold crossing."
  }
}
```

### About content update

- `GET /api/about`
- `GET /api/admin/site-content`
- `PUT /api/admin/site-content/about`

Update request example:

```json
{
  "heroTitle": "Inside the archive",
  "heroText": "A journal of releases, worlds, and fragments."
}
```

Update response example:

```json
{
  "about": {
    "heroTitle": "Inside the archive",
    "heroText": "A journal of releases, worlds, and fragments."
  }
}
```

## Validation and UI Notes

- account forms validate required fields, email format, and password length
- comment forms require minimum text length
- delete actions use confirmation prompts
- success and error states are shown inline on account and comment actions
- layouts are responsive across mobile and desktop breakpoints

## Repository Notes

- `.gitignore` excludes `node_modules`, build output, and `.env`
- `.env.example` lists the required configuration variables
- commit history uses feature-focused commit messages on separate branches

## Deployment

Live frontend:

- https://react-final-project-seven-sigma.vercel.app

Live backend:

- https://react-final-project-cnk7.onrender.com

API base:

- https://react-final-project-cnk7.onrender.com/api
