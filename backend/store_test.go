package main

import (
	"errors"
	"os"
	"path/filepath"
	"sync"
	"testing"
)

func newTestStore(t *testing.T) (*Store, string) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "data", "applications.json")
	s, err := OpenStore(path)
	if err != nil {
		t.Fatalf("OpenStore: %v", err)
	}
	return s, path
}

func TestOpenStoreMissingFileStartsEmpty(t *testing.T) {
	s, path := newTestStore(t)
	if got := s.List(); got == nil || len(got) != 0 {
		t.Errorf("List() = %#v, want empty non-nil slice", got)
	}
	if _, err := os.Stat(path); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("opening must not create the file, stat err = %v", err)
	}
}

func TestOpenStoreEmptyFileStartsEmpty(t *testing.T) {
	path := filepath.Join(t.TempDir(), "applications.json")
	if err := os.WriteFile(path, nil, 0o644); err != nil {
		t.Fatal(err)
	}
	s, err := OpenStore(path)
	if err != nil {
		t.Fatalf("OpenStore: %v", err)
	}
	if len(s.List()) != 0 {
		t.Errorf("expected no applications")
	}
}

func TestOpenStoreRefusesCorruptFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "applications.json")
	if err := os.WriteFile(path, []byte("{not json"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := OpenStore(path); err == nil {
		t.Fatal("expected an error for a corrupt file")
	}
	// The corrupt file must be left untouched.
	data, _ := os.ReadFile(path)
	if string(data) != "{not json" {
		t.Errorf("corrupt file was modified: %q", data)
	}
}

func TestCreateAssignsIDAndPersists(t *testing.T) {
	s, path := newTestStore(t)

	app, err := s.Create(validInput())
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if len(app.ID) != 32 {
		t.Errorf("id %q should be 32 hex characters", app.ID)
	}

	reopened, err := OpenStore(path)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	got := reopened.List()
	if len(got) != 1 || got[0] != app {
		t.Errorf("after reopen got %+v, want [%+v]", got, app)
	}
}

func TestCreateGivesUniqueIDs(t *testing.T) {
	s, _ := newTestStore(t)
	a, _ := s.Create(validInput())
	b, _ := s.Create(validInput())
	if a.ID == b.ID {
		t.Errorf("ids must be unique, both %q", a.ID)
	}
}

func TestCreateRejectsInvalidInputWithoutSaving(t *testing.T) {
	s, path := newTestStore(t)
	in := validInput()
	in.Company = ""
	if _, err := s.Create(in); !isValidationError(err) {
		t.Fatalf("expected a ValidationError, got %v", err)
	}
	if len(s.List()) != 0 {
		t.Error("invalid input must not be stored")
	}
	if _, err := os.Stat(path); !errors.Is(err, os.ErrNotExist) {
		t.Error("invalid input must not write the file")
	}
}

func TestUpdateReplacesFields(t *testing.T) {
	s, path := newTestStore(t)
	app, _ := s.Create(validInput())

	in := validInput()
	in.Status = StatusOffer
	in.Notes = "Offer received"
	updated, err := s.Update(app.ID, in)
	if err != nil {
		t.Fatalf("Update: %v", err)
	}
	if updated.ID != app.ID || updated.Status != StatusOffer {
		t.Errorf("unexpected result %+v", updated)
	}

	reopened, _ := OpenStore(path)
	if got := reopened.List(); len(got) != 1 || got[0].Notes != "Offer received" {
		t.Errorf("update not persisted: %+v", got)
	}
}

func TestUpdateAndDeleteUnknownID(t *testing.T) {
	s, _ := newTestStore(t)
	if _, err := s.Update("nope", validInput()); !errors.Is(err, ErrNotFound) {
		t.Errorf("Update err = %v, want ErrNotFound", err)
	}
	if err := s.Delete("nope"); !errors.Is(err, ErrNotFound) {
		t.Errorf("Delete err = %v, want ErrNotFound", err)
	}
}

func TestDeleteRemovesAndPersists(t *testing.T) {
	s, path := newTestStore(t)
	a, _ := s.Create(validInput())
	b, _ := s.Create(validInput())

	if err := s.Delete(a.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	reopened, _ := OpenStore(path)
	got := reopened.List()
	if len(got) != 1 || got[0].ID != b.ID {
		t.Errorf("after delete got %+v, want only %s", got, b.ID)
	}
}

func TestListReturnsACopy(t *testing.T) {
	s, _ := newTestStore(t)
	s.Create(validInput())
	list := s.List()
	list[0].Company = "Changed outside the store"
	if s.List()[0].Company == "Changed outside the store" {
		t.Error("List must return a copy")
	}
}

func TestFailedSaveKeepsMemoryUnchanged(t *testing.T) {
	dir := t.TempDir()
	// A directory where the data file should be makes the final rename fail.
	path := filepath.Join(dir, "applications.json")
	if err := os.Mkdir(path, 0o755); err != nil {
		t.Fatal(err)
	}
	s := &Store{path: path, items: []Application{}}

	if _, err := s.Create(validInput()); err == nil {
		t.Fatal("expected the save to fail")
	}
	if len(s.List()) != 0 {
		t.Error("a failed save must not change the in-memory list")
	}
	leftovers, _ := filepath.Glob(filepath.Join(dir, ".applications-*.tmp"))
	if len(leftovers) != 0 {
		t.Errorf("temp files left behind: %v", leftovers)
	}
}

func TestConcurrentCreates(t *testing.T) {
	s, path := newTestStore(t)
	const n = 25

	var wg sync.WaitGroup
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if _, err := s.Create(validInput()); err != nil {
				t.Errorf("Create: %v", err)
			}
		}()
	}
	wg.Wait()

	if got := len(s.List()); got != n {
		t.Errorf("in memory: %d applications, want %d", got, n)
	}
	reopened, err := OpenStore(path)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	if got := len(reopened.List()); got != n {
		t.Errorf("on disk: %d applications, want %d", got, n)
	}
}
