package main

import (
	"errors"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"
)

// Status values. They must match STATUSES in frontend/src/types.ts.
const (
	StatusWishlist  = "wishlist"
	StatusApplied   = "applied"
	StatusInterview = "interview"
	StatusOffer     = "offer"
	StatusRejected  = "rejected"
	StatusWithdrawn = "withdrawn"
)

var validStatuses = map[string]bool{
	StatusWishlist:  true,
	StatusApplied:   true,
	StatusInterview: true,
	StatusOffer:     true,
	StatusRejected:  true,
	StatusWithdrawn: true,
}

const (
	dateLayout     = "2006-01-02"
	dateTimeLayout = "2006-01-02T15:04"

	maxShortText = 200
	maxURLLength = 2000
	maxNotes     = 10000
)

// ApplicationInput is what a client sends to create or update an application.
// The server owns the id, so it is not part of the input.
type ApplicationInput struct {
	Company  string `json:"company"`
	JobTitle string `json:"jobTitle"`
	// ApplicationDate is "YYYY-MM-DD". It may be empty only while the status is wishlist.
	ApplicationDate string `json:"applicationDate"`
	Status          string `json:"status"`
	// JobURL is an http(s) URL, or empty.
	JobURL string `json:"jobUrl"`
	// InterviewDate is "YYYY-MM-DDTHH:mm" in local time, or empty.
	InterviewDate string `json:"interviewDate"`
	Notes         string `json:"notes"`
}

// Application is one stored job application. Its JSON shape is the API contract
// and is identical to the Application type in frontend/src/types.ts.
type Application struct {
	ID string `json:"id"`
	ApplicationInput
}

// ValidationError carries a message that is safe to show to the user.
type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }

func invalid(msg string) error { return &ValidationError{Message: msg} }

// isValidationError reports whether err is a ValidationError.
func isValidationError(err error) bool {
	var v *ValidationError
	return errors.As(err, &v)
}

// Normalize trims whitespace and checks every field. It returns the cleaned
// input, or a *ValidationError describing the first problem found.
func (in ApplicationInput) Normalize() (ApplicationInput, error) {
	in.Company = strings.TrimSpace(in.Company)
	in.JobTitle = strings.TrimSpace(in.JobTitle)
	in.ApplicationDate = strings.TrimSpace(in.ApplicationDate)
	in.Status = strings.TrimSpace(in.Status)
	in.JobURL = strings.TrimSpace(in.JobURL)
	in.InterviewDate = strings.TrimSpace(in.InterviewDate)
	in.Notes = strings.TrimSpace(in.Notes)

	if in.Company == "" {
		return in, invalid("Enter the company name.")
	}
	if utf8.RuneCountInString(in.Company) > maxShortText {
		return in, invalid("The company name is too long.")
	}
	if in.JobTitle == "" {
		return in, invalid("Enter the job title.")
	}
	if utf8.RuneCountInString(in.JobTitle) > maxShortText {
		return in, invalid("The job title is too long.")
	}

	if !validStatuses[in.Status] {
		return in, invalid("Choose a status: wishlist, applied, interview, offer, rejected or withdrawn.")
	}

	if in.ApplicationDate == "" {
		if in.Status != StatusWishlist {
			return in, invalid("Enter the date you applied.")
		}
	} else if _, err := time.Parse(dateLayout, in.ApplicationDate); err != nil {
		return in, invalid("The application date must look like 2026-11-14.")
	}

	if in.InterviewDate != "" {
		if _, err := time.Parse(dateTimeLayout, in.InterviewDate); err != nil {
			return in, invalid("The interview date must look like 2026-11-14T10:30.")
		}
	}

	if in.JobURL != "" {
		if len(in.JobURL) > maxURLLength {
			return in, invalid("The job posting link is too long.")
		}
		u, err := url.Parse(in.JobURL)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
			return in, invalid("The job posting link must start with http:// or https://.")
		}
	}

	if utf8.RuneCountInString(in.Notes) > maxNotes {
		return in, invalid("The notes are too long.")
	}

	return in, nil
}
