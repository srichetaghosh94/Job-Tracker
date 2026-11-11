// Command jobtracker serves the job application REST API and stores the data in a JSON file.
package main

import (
	"context"
	"errors"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"
)

func main() {
	addr := flag.String("addr", envOr("ADDR", "127.0.0.1:8080"),
		"address to listen on (env ADDR)")
	dataFile := flag.String("data", envOr("DATA_FILE", filepath.Join("data", "applications.json")),
		"path of the JSON data file (env DATA_FILE)")
	flag.Parse()

	store, err := OpenStore(*dataFile)
	if err != nil {
		log.Fatalf("cannot open data file: %v", err)
	}

	srv := &http.Server{
		Addr:              *addr,
		Handler:           NewAPI(store).Routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	abs, err := filepath.Abs(*dataFile)
	if err != nil {
		abs = *dataFile
	}
	log.Printf("Job tracker API listening on http://%s", *addr)
	log.Printf("Data file: %s (%d applications loaded)", abs, len(store.List()))

	serverErr := make(chan error, 1)
	go func() { serverErr <- srv.ListenAndServe() }()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case err := <-serverErr:
		if !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server stopped: %v", err)
		}
	case <-ctx.Done():
		log.Println("Shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			log.Printf("shutdown: %v", err)
		}
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
