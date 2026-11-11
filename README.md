# Job tracker

A small app for keeping track of your job applications: where you applied, what stage each one is at, and when your next interview is.

## What it does

- Saves company, job title, application date, status, job posting link, interview date and notes
- Shows your pipeline as a stage strip (Wishlist, Applied, Interviewing, Offer, Closed) that also works as a filter
- Highlights your next upcoming interview at the top
- Search, sort, add, edit and delete applications
- Stores everything in a local JSON file, so no database is needed

## Tech stack

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Go (standard library only), REST API
- **Storage:** JSON file at `backend/data/applications.json`

## Getting started

You need [Go](https://go.dev/dl/) 1.22 or newer and [Node.js](https://nodejs.org/) 20 or newer.

Run the backend in one terminal:

```bash
cd backend
go run .
```

Run the frontend in a second terminal:

```bash
cd frontend
npm install     # first time only
npm run dev
```

Then open http://localhost:5173. Press `Ctrl+C` in a terminal to stop that server.

`frontend/.env` decides where the data comes from: `VITE_API_MODE=rest` uses the Go backend, and `VITE_API_MODE=mock` uses sample data saved in your browser only. Restart `npm run dev` after changing it.

## Your data

Every change is saved to `backend/data/applications.json` straight away. The file ships with example entries, so replace or delete them with your own. If you edit the file by hand, stop the backend first. If this repo is public, don't commit your real applications.

## Project structure

```
frontend/   React app (components, API client, styles)
backend/    Go server: handlers, validation, JSON file storage, tests
  data/     applications.json
```

## API

| Action | Request |
| --- | --- |
| List | `GET /api/applications` |
| Create | `POST /api/applications` |
| Update | `PUT /api/applications/{id}` |
| Delete | `DELETE /api/applications/{id}` |

An application has these fields: `id`, `company`, `jobTitle`, `applicationDate` (`YYYY-MM-DD`), `status` (`wishlist`, `applied`, `interview`, `offer`, `rejected` or `withdrawn`), `jobUrl`, `interviewDate` (`YYYY-MM-DDTHH:mm`) and `notes`. Errors come back as `{ "error": "message" }`.

## Tests

```bash
cd backend
go test ./...
```
