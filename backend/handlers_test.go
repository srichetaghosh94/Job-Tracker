package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
)

func newTestServer(t *testing.T) (*httptest.Server, string) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "applications.json")
	store, err := OpenStore(path)
	if err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewServer(NewAPI(store).Routes())
	t.Cleanup(srv.Close)
	return srv, path
}

func do(t *testing.T, method, url, body string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(method, url, strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { res.Body.Close() })
	return res
}

func decode[T any](t *testing.T, res *http.Response) T {
	t.Helper()
	var v T
	if err := json.NewDecoder(res.Body).Decode(&v); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return v
}

const validBody = `{
  "company": "Schwarz Digits",
  "jobTitle": "Software Engineer",
  "applicationDate": "2026-11-03",
  "status": "applied",
  "jobUrl": "https://example.com/job",
  "interviewDate": "",
  "notes": "hello"
}`

func TestEmptyListIsJSONArray(t *testing.T) {
	srv, _ := newTestServer(t)
	res := do(t, "GET", srv.URL+"/api/applications", "")
	if res.StatusCode != http.StatusOK {
		t.Fatalf("status %d", res.StatusCode)
	}
	var raw json.RawMessage
	if err := json.NewDecoder(res.Body).Decode(&raw); err != nil {
		t.Fatal(err)
	}
	if strings.TrimSpace(string(raw)) != "[]" {
		t.Errorf("body = %s, want []", raw)
	}
}

func TestCRUDFlow(t *testing.T) {
	srv, _ := newTestServer(t)
	base := srv.URL + "/api/applications"

	// Create
	res := do(t, "POST", base, validBody)
	if res.StatusCode != http.StatusCreated {
		t.Fatalf("create status %d", res.StatusCode)
	}
	if ct := res.Header.Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("content type %q", ct)
	}
	created := decode[Application](t, res)
	if created.ID == "" || created.Company != "Schwarz Digits" {
		t.Fatalf("unexpected created application: %+v", created)
	}

	// List
	list := decode[[]Application](t, do(t, "GET", base, ""))
	if len(list) != 1 || list[0] != created {
		t.Fatalf("list = %+v", list)
	}

	// Update
	update := strings.Replace(validBody, `"status": "applied"`, `"status": "interview"`, 1)
	update = strings.Replace(update, `"interviewDate": ""`, `"interviewDate": "2026-11-18T14:00"`, 1)
	res = do(t, "PUT", base+"/"+created.ID, update)
	if res.StatusCode != http.StatusOK {
		t.Fatalf("update status %d", res.StatusCode)
	}
	updated := decode[Application](t, res)
	if updated.ID != created.ID || updated.Status != "interview" || updated.InterviewDate != "2026-11-18T14:00" {
		t.Fatalf("unexpected updated application: %+v", updated)
	}

	// Delete
	res = do(t, "DELETE", base+"/"+created.ID, "")
	if res.StatusCode != http.StatusNoContent {
		t.Fatalf("delete status %d", res.StatusCode)
	}
	if list := decode[[]Application](t, do(t, "GET", base, "")); len(list) != 0 {
		t.Fatalf("list after delete = %+v", list)
	}
}

func TestUpdateIgnoresIDInBody(t *testing.T) {
	srv, _ := newTestServer(t)
	base := srv.URL + "/api/applications"
	created := decode[Application](t, do(t, "POST", base, validBody))

	body := strings.Replace(validBody, "{", `{"id": "someone-elses-id",`, 1)
	updated := decode[Application](t, do(t, "PUT", base+"/"+created.ID, body))
	if updated.ID != created.ID {
		t.Errorf("id changed to %q", updated.ID)
	}
}

func TestErrorResponses(t *testing.T) {
	srv, _ := newTestServer(t)
	base := srv.URL + "/api/applications"

	tests := []struct {
		name       string
		method     string
		url        string
		body       string
		wantStatus int
		wantError  string
	}{
		{"invalid JSON", "POST", base, "{nope", 400, "valid JSON"},
		{"missing company", "POST", base, `{"jobTitle":"x","status":"wishlist"}`, 400, "company"},
		{"bad status", "POST", base, `{"company":"a","jobTitle":"x","status":"??"}`, 400, "status"},
		{"bad url", "POST", base, `{"company":"a","jobTitle":"x","status":"wishlist","jobUrl":"ftp://x"}`, 400, "http://"},
		{"update unknown id", "PUT", base + "/missing", validBody, 404, "no longer exists"},
		{"update invalid body", "PUT", base + "/missing", "{nope", 400, "valid JSON"},
		{"delete unknown id", "DELETE", base + "/missing", "", 404, "no longer exists"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res := do(t, tt.method, tt.url, tt.body)
			if res.StatusCode != tt.wantStatus {
				t.Fatalf("status %d, want %d", res.StatusCode, tt.wantStatus)
			}
			e := decode[map[string]string](t, res)
			if !strings.Contains(e["error"], tt.wantError) {
				t.Errorf(`error %q should contain %q`, e["error"], tt.wantError)
			}
		})
	}
}

func TestOversizedBodyIsRejected(t *testing.T) {
	srv, _ := newTestServer(t)
	huge := `{"company":"a","jobTitle":"b","status":"wishlist","notes":"` + strings.Repeat("x", 2<<20) + `"}`
	res := do(t, "POST", srv.URL+"/api/applications", huge)
	if res.StatusCode != http.StatusRequestEntityTooLarge {
		t.Errorf("status %d, want 413", res.StatusCode)
	}
}

func TestUnsupportedMethod(t *testing.T) {
	srv, _ := newTestServer(t)
	res := do(t, "PATCH", srv.URL+"/api/applications", "{}")
	if res.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("status %d, want 405", res.StatusCode)
	}
}

func TestHealth(t *testing.T) {
	srv, _ := newTestServer(t)
	res := do(t, "GET", srv.URL+"/api/health", "")
	if res.StatusCode != http.StatusOK {
		t.Errorf("status %d", res.StatusCode)
	}
}

// The seed file shipped in data/ must load and pass the same validation as new input.
func TestSeedDataIsValid(t *testing.T) {
	store, err := OpenStore(filepath.Join("data", "applications.json"))
	if err != nil {
		t.Fatalf("seed file does not load: %v", err)
	}
	apps := store.List()
	if len(apps) != 3 {
		t.Errorf("seed has %d applications, want 3", len(apps))
	}
	seen := map[string]bool{}
	for _, a := range apps {
		if a.ID == "" || seen[a.ID] {
			t.Errorf("missing or duplicate id for %q", a.Company)
		}
		seen[a.ID] = true
		if _, err := a.ApplicationInput.Normalize(); err != nil {
			t.Errorf("%s fails validation: %v", a.Company, err)
		}
	}
}
