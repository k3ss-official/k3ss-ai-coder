package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

type HealthResponse struct {
	Status    string    `json:"status"`
	Service   string    `json:"service"`
	Version   string    `json:"version"`
	Timestamp time.Time `json:"timestamp"`
	CLI       CLIInfo   `json:"cli"`
}

type CLIInfo struct {
	Available bool     `json:"available"`
	Commands  []string `json:"commands"`
	Binary    string   `json:"binary"`
}

type CommandRequest struct {
	Command string   `json:"command"`
	Args    []string `json:"args"`
	WorkDir string   `json:"workdir,omitempty"`
}

type CommandResponse struct {
	Success bool   `json:"success"`
	Output  string `json:"output"`
	Error   string `json:"error,omitempty"`
	Command string `json:"command"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	r := mux.NewRouter()

	// Health endpoint
	r.HandleFunc("/health", healthHandler).Methods("GET")
	
	// CLI command execution endpoints
	r.HandleFunc("/cli/execute", executeCommandHandler).Methods("POST")
	r.HandleFunc("/cli/commands", listCommandsHandler).Methods("GET")
	r.HandleFunc("/cli/chat", chatHandler).Methods("POST")
	r.HandleFunc("/cli/generate", generateHandler).Methods("POST")
	r.HandleFunc("/cli/analyze", analyzeHandler).Methods("POST")
	r.HandleFunc("/cli/git", gitHandler).Methods("POST")

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	handler := c.Handler(r)

	fmt.Printf("🚀 K3SS AI CLI Automation Service starting on port %s\n", port)
	fmt.Printf("🔗 Health check: http://localhost:%s/health\n", port)
	fmt.Printf("📋 CLI binary: ./k3ss-ai\n")

	log.Fatal(http.ListenAndServe(":"+port, handler))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	// Check if k3ss-ai binary is available
	cliInfo := CLIInfo{
		Binary: "./k3ss-ai",
	}

	// Test if binary exists and is executable
	if _, err := os.Stat("./k3ss-ai"); err == nil {
		cliInfo.Available = true
		
		// Get available commands
		cmd := exec.Command("./k3ss-ai", "--help")
		output, err := cmd.Output()
		if err == nil {
			lines := strings.Split(string(output), "\n")
			for _, line := range lines {
				if strings.Contains(line, "Available Commands:") {
					// Parse commands from help output
					cliInfo.Commands = []string{"chat", "generate", "analyze", "git", "build", "review", "refactor", "workflow", "batch", "pipeline"}
					break
				}
			}
		}
	}

	response := HealthResponse{
		Status:    "healthy",
		Service:   "K3SS AI CLI Automation",
		Version:   "1.0.0",
		Timestamp: time.Now(),
		CLI:       cliInfo,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func executeCommandHandler(w http.ResponseWriter, r *http.Request) {
	var req CommandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Build command
	args := append([]string{req.Command}, req.Args...)
	cmd := exec.Command("./k3ss-ai", args...)
	
	if req.WorkDir != "" {
		cmd.Dir = req.WorkDir
	}

	output, err := cmd.CombinedOutput()
	
	response := CommandResponse{
		Success: err == nil,
		Output:  string(output),
		Command: fmt.Sprintf("k3ss-ai %s", strings.Join(args, " ")),
	}

	if err != nil {
		response.Error = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func listCommandsHandler(w http.ResponseWriter, r *http.Request) {
	commands := map[string]string{
		"chat":     "Interactive chat with AI assistant",
		"generate": "Generate code, components, and project scaffolding",
		"analyze":  "Analyze code for security, performance, and quality issues",
		"git":      "Git workflow integration and automation",
		"build":    "Build system integration and analysis",
		"review":   "AI-powered code review and analysis",
		"refactor": "AI-powered code refactoring",
		"workflow": "Automation workflow management",
		"batch":    "Batch operations across multiple files",
		"pipeline": "CI/CD pipeline integration and optimization",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(commands)
}

func chatHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Message string `json:"message"`
		Context string `json:"context,omitempty"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	args := []string{"chat", req.Message}
	if req.Context != "" {
		args = append(args, "--context", req.Context)
	}

	cmd := exec.Command("./k3ss-ai", args...)
	output, err := cmd.CombinedOutput()

	response := CommandResponse{
		Success: err == nil,
		Output:  string(output),
		Command: fmt.Sprintf("k3ss-ai %s", strings.Join(args, " ")),
	}

	if err != nil {
		response.Error = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func generateHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Type        string            `json:"type"`
		Name        string            `json:"name"`
		Options     map[string]string `json:"options,omitempty"`
		Description string            `json:"description,omitempty"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	args := []string{"generate", req.Type, req.Name}
	if req.Description != "" {
		args = append(args, "--description", req.Description)
	}

	for key, value := range req.Options {
		args = append(args, "--"+key, value)
	}

	cmd := exec.Command("./k3ss-ai", args...)
	output, err := cmd.CombinedOutput()

	response := CommandResponse{
		Success: err == nil,
		Output:  string(output),
		Command: fmt.Sprintf("k3ss-ai %s", strings.Join(args, " ")),
	}

	if err != nil {
		response.Error = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func analyzeHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Path    string   `json:"path"`
		Types   []string `json:"types,omitempty"`
		Options []string `json:"options,omitempty"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	args := []string{"analyze", req.Path}
	
	for _, t := range req.Types {
		args = append(args, "--type", t)
	}
	
	args = append(args, req.Options...)

	cmd := exec.Command("./k3ss-ai", args...)
	output, err := cmd.CombinedOutput()

	response := CommandResponse{
		Success: err == nil,
		Output:  string(output),
		Command: fmt.Sprintf("k3ss-ai %s", strings.Join(args, " ")),
	}

	if err != nil {
		response.Error = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func gitHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Action  string            `json:"action"`
		Options map[string]string `json:"options,omitempty"`
		Message string            `json:"message,omitempty"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	args := []string{"git", req.Action}
	
	if req.Message != "" {
		args = append(args, "--message", req.Message)
	}

	for key, value := range req.Options {
		args = append(args, "--"+key, value)
	}

	cmd := exec.Command("./k3ss-ai", args...)
	output, err := cmd.CombinedOutput()

	response := CommandResponse{
		Success: err == nil,
		Output:  string(output),
		Command: fmt.Sprintf("k3ss-ai %s", strings.Join(args, " ")),
	}

	if err != nil {
		response.Error = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

