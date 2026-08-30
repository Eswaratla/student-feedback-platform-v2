# Backend — Node.js

This folder is the **backend** for NexGen University.

## Tech stack

- **Node.js** — JavaScript runtime
- **Express** — web server and API routes

## What it does

- Runs the API on **http://localhost:3001**
- Handles login, applications, and data (to be added in later steps)
- Serves JSON endpoints under `/api/*`

## Commands

From the project root:

```bash
npm run dev:server
```

Or from this folder:

```bash
npm install
npm run dev
```

## Test it

With the server running, open:

**http://localhost:3001/api/health**

You should see a JSON response confirming the API is running.
