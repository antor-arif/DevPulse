# DevPulse

> Internal Tech Issue & Feature Tracker — A collaborative platform for software teams to report bugs, suggest features, and coordinate resolutions.

**Live URL:** ``

---

## Features

- User registration and authentication with JWT
- Role-based access control (`contributor` / `maintainer`)
- Create, view, update, and delete issues (bug reports & feature requests)
- Filter issues by type and status; sort by newest or oldest
- Secure password hashing with bcrypt
- Fully typed TypeScript codebase with strict mode

---

## Tech Stack

| Technology | Version |
|---|---|
| Node.js | LTS 24.x |
| TypeScript | 5.x |
| Express.js | 4.x |
| PostgreSQL | NeonDB (cloud) |
| pg (native driver) | 8.x |
| bcrypt | 5.x |
| jsonwebtoken | 9.x |
| http-status-codes | 2.x |

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/antor-arif/DevPulse
cd DevPulse
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret
PORT=3000
```

### 3. Run database migration

```bash
npm run migrate
```

### 4. Start development server

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
npm start
```

---

## Database Schema

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | Primary key |
| `name` | VARCHAR(255) | Required |
| `email` | VARCHAR(255) | Unique, required |
| `password` | VARCHAR(255) | Bcrypt hashed, never returned |
| `role` | VARCHAR(20) | `contributor` or `maintainer`, default `contributor` |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-refreshed on update via trigger |

### `issues`

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | Primary key |
| `title` | VARCHAR(150) | Required, max 150 chars |
| `description` | TEXT | Required, min 20 chars |
| `type` | VARCHAR(20) | `bug` or `feature_request` |
| `status` | VARCHAR(20) | `open`, `in_progress`, `resolved` — default `open` |
| `reporter_id` | INTEGER | References `users.id` (no FK constraint) |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-refreshed on update via trigger |

---

## API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive JWT |

### Issues

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/issues` | Authenticated | Create a new issue |
| GET | `/api/issues` | Public | Get all issues (filterable) |
| GET | `/api/issues/:id` | Public | Get a single issue |
| PATCH | `/api/issues/:id` | Authenticated | Update an issue |
| DELETE | `/api/issues/:id` | Maintainer | Delete an issue |

### Query Parameters for `GET /api/issues`

| Param | Values | Default |
|---|---|---|
| `sort` | `newest`, `oldest` | `newest` |
| `type` | `bug`, `feature_request` | — |
| `status` | `open`, `in_progress`, `resolved` | — |

### Authentication Header

```
Authorization: <JWT_TOKEN>
```

---

## Request & Response Examples

### POST /api/auth/signup

```json
// Request
{ "name": "John Doe", "email": "john@example.com", "password": "pass123", "role": "contributor" }

// Response 201
{ "success": true, "message": "User registered successfully", "data": { "id": 1, ... } }
```

### POST /api/auth/login

```json
// Request
{ "email": "john@example.com", "password": "pass123" }

// Response 200
{ "success": true, "message": "Login successful", "data": { "token": "eyJ...", "user": { ... } } }
```

### POST /api/issues

```json
// Request (Authorization header required)
{ "title": "Bug title here", "description": "Detailed description (min 20 chars)", "type": "bug" }

// Response 201
{ "success": true, "message": "Issue created successfully", "data": { "id": 1, "reporter_id": 1, ... } }
```

### PATCH /api/issues/:id

```json
// Request (maintainers may also send "status")
{ "title": "Updated title", "status": "in_progress" }

// Response 200
{ "success": true, "message": "Issue updated successfully", "data": { ... } }
```

---

## Project Structure

```
src/
├── config/
│   ├── db.ts            # PostgreSQL pool
│   └── migrate.ts       # Migration runner
├── middleware/
│   ├── authenticate.ts  # JWT verification
│   └── requireRole.ts   # Role-based guard
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.routes.ts
│   │   └── auth.types.ts
│   └── issues/
│       ├── issues.controller.ts
│       ├── issues.routes.ts
│       └── issues.types.ts
├── utils/
│   ├── asyncHandler.ts  # Async error wrapper
│   └── response.ts      # Standard response 
├── app.ts               # Express app
└── server.ts            # Entry point
migrations/
└── init.sql             # Schema + triggers
```

---

## Deployment

Deploy to **Render** or **Railway** or **Vercel** :

1. Set environment variables: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`
2. Build command: `npm run build`
3. Start command: `npm start`

For **Vercel**, the included `vercel.json` handles routing via `@vercel/node`.
