package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"sync"
)

// ErrNotFound is returned when no application has the requested id.
var ErrNotFound = errors.New("application not found")

// Store keeps all applications in memory and writes every change to a JSON file.
// The file holds one JSON array of applications and can be opened and read in
// any text editor. Edit it only while the server is stopped: the server keeps
// its own copy in memory and overwrites the file on the next change.
type Store struct {
	mu    sync.RWMutex
	path  string
	items []Application
}

// OpenStore loads the file at path. A missing or empty file starts an empty list
// (the file is created on the first change). A file that exists but is not valid
// JSON is an error, so the server never overwrites data it could not read.
func OpenStore(path string) (*Store, error) {
	s := &Store{path: path, items: []Application{}}

	data, err := os.ReadFile(path)
	switch {
	case errors.Is(err, os.ErrNotExist):
		return s, nil
	case err != nil:
		return nil, fmt.Errorf("read %s: %w", path, err)
	}

	if len(data) == 0 {
		return s, nil
	}
	if err := json.Unmarshal(data, &s.items); err != nil {
		return nil, fmt.Errorf("parse %s: %w (fix or move the file, then start again)", path, err)
	}
	if s.items == nil {
		s.items = []Application{}
	}
	return s, nil
}

// List returns a copy of all applications in the order they were added.
func (s *Store) List() []Application {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return slices.Clone(s.items)
}

// Create validates the input, stores it under a new id and saves the file.
func (s *Store) Create(in ApplicationInput) (Application, error) {
	clean, err := in.Normalize()
	if err != nil {
		return Application{}, err
	}
	id, err := newID()
	if err != nil {
		return Application{}, err
	}
	app := Application{ID: id, ApplicationInput: clean}

	s.mu.Lock()
	defer s.mu.Unlock()

	next := append(slices.Clone(s.items), app)
	if err := s.save(next); err != nil {
		return Application{}, err
	}
	s.items = next
	return app, nil
}

// Update replaces the application with the given id.
func (s *Store) Update(id string, in ApplicationInput) (Application, error) {
	clean, err := in.Normalize()
	if err != nil {
		return Application{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	i := s.indexOf(id)
	if i < 0 {
		return Application{}, ErrNotFound
	}
	app := Application{ID: id, ApplicationInput: clean}

	next := slices.Clone(s.items)
	next[i] = app
	if err := s.save(next); err != nil {
		return Application{}, err
	}
	s.items = next
	return app, nil
}

// Delete removes the application with the given id.
func (s *Store) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	i := s.indexOf(id)
	if i < 0 {
		return ErrNotFound
	}
	next := slices.Delete(slices.Clone(s.items), i, i+1)
	if err := s.save(next); err != nil {
		return err
	}
	s.items = next
	return nil
}

func (s *Store) indexOf(id string) int {
	return slices.IndexFunc(s.items, func(a Application) bool { return a.ID == id })
}

// save writes items to a temporary file next to the real one and renames it into
// place, so a crash mid-write can never leave a half-written data file. The
// in-memory list is only replaced after save succeeds.
func (s *Store) save(items []Application) error {
	data, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		return fmt.Errorf("encode applications: %w", err)
	}
	data = append(data, '\n')

	dir := filepath.Dir(s.path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("create %s: %w", dir, err)
	}

	tmp, err := os.CreateTemp(dir, ".applications-*.tmp")
	if err != nil {
		return fmt.Errorf("create temp file: %w", err)
	}
	tmpName := tmp.Name()
	cleanup := func() { _ = os.Remove(tmpName) }

	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		cleanup()
		return fmt.Errorf("write temp file: %w", err)
	}
	if err := tmp.Sync(); err != nil {
		_ = tmp.Close()
		cleanup()
		return fmt.Errorf("sync temp file: %w", err)
	}
	if err := tmp.Close(); err != nil {
		cleanup()
		return fmt.Errorf("close temp file: %w", err)
	}
	if err := os.Rename(tmpName, s.path); err != nil {
		cleanup()
		return fmt.Errorf("replace %s: %w", s.path, err)
	}
	return nil
}

func newID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate id: %w", err)
	}
	return hex.EncodeToString(b), nil
}
