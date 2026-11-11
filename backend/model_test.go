package main

import (
	"strings"
	"testing"
)

func validInput() ApplicationInput {
	return ApplicationInput{
		Company:         "Osapiens",
		JobTitle:        "Backend Engineer",
		ApplicationDate: "2026-10-27",
		Status:          StatusApplied,
		JobURL:          "https://example.com/jobs/1",
		InterviewDate:   "2026-11-18T14:00",
		Notes:           "Some notes",
	}
}

func TestNormalizeAcceptsValidInput(t *testing.T) {
	got, err := validInput().Normalize()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != validInput() {
		t.Errorf("valid input changed: %+v", got)
	}
}

func TestNormalizeTrimsWhitespace(t *testing.T) {
	in := validInput()
	in.Company = "  Osapiens \n"
	in.JobTitle = "\tBackend Engineer  "
	in.Notes = "  notes  "
	got, err := in.Normalize()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Company != "Osapiens" || got.JobTitle != "Backend Engineer" || got.Notes != "notes" {
		t.Errorf("not trimmed: %+v", got)
	}
}

func TestNormalizeWishlistMayHaveNoApplicationDate(t *testing.T) {
	in := validInput()
	in.Status = StatusWishlist
	in.ApplicationDate = ""
	in.InterviewDate = ""
	if _, err := in.Normalize(); err != nil {
		t.Errorf("wishlist without a date should be valid: %v", err)
	}
}

func TestNormalizeRejectsBadInput(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*ApplicationInput)
		want   string
	}{
		{"missing company", func(in *ApplicationInput) { in.Company = "   " }, "company"},
		{"missing title", func(in *ApplicationInput) { in.JobTitle = "" }, "job title"},
		{"company too long", func(in *ApplicationInput) { in.Company = strings.Repeat("a", 201) }, "company name is too long"},
		{"unknown status", func(in *ApplicationInput) { in.Status = "ghosted" }, "status"},
		{"empty status", func(in *ApplicationInput) { in.Status = "" }, "status"},
		{"missing date when applied", func(in *ApplicationInput) { in.ApplicationDate = "" }, "date you applied"},
		{"malformed date", func(in *ApplicationInput) { in.ApplicationDate = "14/11/2026" }, "application date"},
		{"impossible date", func(in *ApplicationInput) { in.ApplicationDate = "2026-02-30" }, "application date"},
		{"malformed interview", func(in *ApplicationInput) { in.InterviewDate = "2026-11-18" }, "interview date"},
		{"url without scheme", func(in *ApplicationInput) { in.JobURL = "example.com/job" }, "http://"},
		{"url with other scheme", func(in *ApplicationInput) { in.JobURL = "javascript:alert(1)" }, "http://"},
		{"url without host", func(in *ApplicationInput) { in.JobURL = "https://" }, "http://"},
		{"notes too long", func(in *ApplicationInput) { in.Notes = strings.Repeat("n", 10001) }, "notes are too long"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			in := validInput()
			tt.mutate(&in)
			_, err := in.Normalize()
			if err == nil {
				t.Fatal("expected an error, got none")
			}
			if !isValidationError(err) {
				t.Fatalf("expected a ValidationError, got %T", err)
			}
			if !strings.Contains(strings.ToLower(err.Error()), strings.ToLower(tt.want)) {
				t.Errorf("error %q should mention %q", err.Error(), tt.want)
			}
		})
	}
}
