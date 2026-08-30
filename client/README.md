# Frontend — React

This folder is the **frontend** for NexGen University.

## Tech stack

- **React** — UI components and pages
- **Vite** — fast dev server and build tool
- **React Router** — page navigation

## What it does

- Runs the website on **http://localhost:5173**
- Shows pages: Home, About Us, Apply Now, Log in
- Will talk to the Node.js backend API in later steps

## Commands

From the project root:

```bash
npm run dev:client
```

Or from this folder:

```bash
npm install
npm run dev
```

## Folder structure

```
client/
├── public/          Static files (logo, images)
├── src/
│   ├── components/  Reusable UI parts
│   ├── pages/       Full pages (Home, Login, etc.)
│   ├── App.jsx      Layout and routing
│   └── main.jsx     React entry point
└── index.html       HTML shell
```
