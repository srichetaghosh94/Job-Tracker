package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"
)

const maxBodyBytes = 1 << 20 // 1 MiB

// API wires the HTTP routes to a Store.
type API struct {
	store *Store
}

func NewAPI(store *Store) *API { return &API{store: store} }

// Routes returns the HTTP handler for the whole API.
//
//	GET    /api/applications        list all
//	POST   /api/applications        create
//	PUT    /api/applications/{id}   replace
//	DELETE /api/applications/{id}   delete
//	GET    /api/health              liveness check
func (a *API) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", a.health)
	mux.HandleFunc("GET /api/applications", a.list)
	mux.HandleFunc("POST /api/applications", a.create)
	mux.HandleFunc("PUT /api/applications/{id}", a.update)
	mux.HandleFunc("DELETE /api/applications/{id}", a.remove)
	return logRequests(mux)
}

func (a *API) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (a *API) list(w http.ResponseWriter, _ *http.Request) {
	// List never returns nil, so an empty store encodes as [] and not null.
	writeJSON(w, http.StatusOK, a.store.List())
}

func (a *API) create(w http.ResponseWriter, r *http.Request) {
	in, ok := decodeInput(w, r)
	if !ok {
		return
	}
	app, err := a.store.Create(in)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, app)
}

func (a *API) update(w http.ResponseWriter, r *http.Request) {
	in, ok := decodeInput(w, r)
	if !ok {
		return
	}
	app, err := a.store.Update(r.PathValue("id"), in)
	if err != nil {
		writeStoreError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, app)
}

func (a *API) remove(w http.ResponseWriter, r *http.Request) {
	if err := a.store.Delete(r.PathValue("id")); err != nil {
		writeStoreError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// decodeInput reads the JSON request body. On failure it has already written
// the error response and returns false.
func decodeInput(w http.ResponseWriter, r *http.Request) (ApplicationInput, bool) {
	var in ApplicationInput
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			writeError(w, http.StatusRequestEntityTooLarge, "The request is too large.")
		} else {
			writeError(w, http.StatusBadRequest, "The request body must be valid JSON.")
		}
		return in, false
	}
	return in, true
}

func writeStoreError(w http.ResponseWriter, err error) {
	switch {
	case isValidationError(err):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, ErrNotFound):
		writeError(w, http.StatusNotFound, "That application no longer exists.")
	default:
		log.Printf("store error: %v", err)
		writeError(w, http.StatusInternalServerError,
			"Couldn't save your changes. Check the server log for details.")
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write response: %v", err)
	}
}

// writeError sends the error shape the frontend expects: { "error": "message" }.
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		log.Printf("%s %s %d %s", r.Method, r.URL.Path, rec.status, time.Since(start).Round(time.Microsecond))
	})
}
