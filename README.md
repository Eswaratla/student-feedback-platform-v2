# NexGen University

A university website with a clear **frontend** and **backend** split.

## Tech stack

| Part | Folder | Technology | Port |
|------|--------|------------|------|
| **Frontend** | `client/` | React + Vite | http://localhost:5173 |
| **Backend** | `server/` | Node.js + Express | http://localhost:3001 |

```
Browser  →  React (client/)  →  Node.js API (server/)
           port 5173              port 3001
```

## Project structure

```
nexgen-university/
├── client/              Frontend — React website
│   ├── src/pages/       Home, Login, About, Apply
│   └── public/          Logo and static files
├── server/              Backend — Node.js API
│   └── index.js         Express server
└── package.json         Scripts to run both apps
```

## Setup

```bash
npm run install:all
```

## Run both (frontend + backend)

```bash
npm run dev
```

- **Website (React):** http://localhost:5173
- **API (Node.js):** http://localhost:3001/api/health

## Run separately

```bash
# Frontend only (React)
npm run dev:client

# Backend only (Node.js)
npm run dev:server
```

## Build progress

| Step | Status | Description |
|------|--------|-------------|
| 1 | Done | Project setup |
| 2 | Done | Backend basics (Node.js + Express) |
| 3 | Done | Database |
| 4 | Done | API routes (login, apply) |
| 5 | Done | Frontend (React + Vite) |
| 6 | Done | First pages (Home, Login, About, Apply) |
