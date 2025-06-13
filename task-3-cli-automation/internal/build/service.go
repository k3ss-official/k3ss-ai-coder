package build

import (
	"fmt"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// BuildService handles build system operations and analysis
type BuildService struct {
	projectPath string
	buildCmd    string
}

// NewBuildService creates a new build service instance
func NewBuildService(projectPath, buildCmd string) *BuildService {
	if projectPath == "" {
		projectPath = "."
	}
	if buildCmd == "" {
		buildCmd = "npm run build"
	}
	return &BuildService{
		projectPath: projectPath,
		buildCmd:    buildCmd,
	}
}

// BuildResult represents the result of a build operation
type BuildResult struct {
	Success      bool
	Duration     time.Duration
	Output       string
	ErrorOutput  string
	ExitCode     int
	Timestamp    time.Time
}

// ExecuteBuild runs the build command and captures results
func (b *BuildService) ExecuteBuild() (*BuildResult, error) {
	startTime := time.Now()
	
	// Parse build command
	cmdParts := strings.Fields(b.buildCmd)
	if len(cmdParts) == 0 {
		return nil, fmt.Errorf("empty build command")
	}
	
	cmd := exec.Command(cmdParts[0], cmdParts[1:]...)
	cmd.Dir = b.projectPath
	
	// Capture both stdout and stderr
	output, err := cmd.CombinedOutput()
	duration := time.Since(startTime)
	
	result := &BuildResult{
		Duration:    duration,
		Output:      string(output),
		Timestamp:   startTime,
	}
	
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitError.ExitCode()
			result.ErrorOutput = string(output)
		} else {
			return nil, fmt.Errorf("failed to execute build command: %w", err)
		}
	} else {
		result.Success = true
	}
	
	return result, nil
}

// AnalyzeBuildFailure analyzes build failure and suggests fixes
func (b *BuildService) AnalyzeBuildFailure(result *BuildResult) *BuildAnalysis {
	analysis := &BuildAnalysis{
		BuildResult: result,
		Issues:      []BuildIssue{},
		Suggestions: []string{},
	}
	
	if result.Success {
		analysis.Summary = "Build completed successfully"
		return analysis
	}
	
	// Analyze error output
	lines := strings.Split(result.ErrorOutput, "\n")
	for i, line := range lines {
		issue := b.analyzeErrorLine(line, i)
		if issue != nil {
			analysis.Issues = append(analysis.Issues, *issue)
		}
	}
	
	// Generate suggestions based on issues
	analysis.Suggestions = b.generateSuggestions(analysis.Issues)
	analysis.Summary = fmt.Sprintf("Build failed with %d issues", len(analysis.Issues))
	
	return analysis
}

// BuildAnalysis represents the analysis of a build result
type BuildAnalysis struct {
	BuildResult *BuildResult
	Summary     string
	Issues      []BuildIssue
	Suggestions []string
}

// BuildIssue represents a specific build issue
type BuildIssue struct {
	Type        string
	Message     string
	File        string
	Line        int
	Column      int
	Severity    string
	Category    string
}

// analyzeErrorLine analyzes a single error line and extracts issue information
func (b *BuildService) analyzeErrorLine(line string, lineNum int) *BuildIssue {
	line = strings.TrimSpace(line)
	if line == "" {
		return nil
	}
	
	issue := &BuildIssue{
		Message: line,
		Line:    lineNum,
	}
	
	// TypeScript/JavaScript errors
	if strings.Contains(line, "TS") && strings.Contains(line, "error") {
		issue.Type = "typescript"
		issue.Severity = "error"
		issue.Category = "compilation"
		
		// Extract file and line number
		if parts := strings.Split(line, ":"); len(parts) >= 2 {
			issue.File = parts[0]
		}
	}
	
	// ESLint errors
	if strings.Contains(line, "eslint") {
		issue.Type = "eslint"
		issue.Severity = "warning"
		issue.Category = "linting"
	}
	
	// Module not found errors
	if strings.Contains(line, "Module not found") || strings.Contains(line, "Cannot resolve") {
		issue.Type = "dependency"
		issue.Severity = "error"
		issue.Category = "dependency"
	}
	
	// Syntax errors
	if strings.Contains(line, "SyntaxError") || strings.Contains(line, "Unexpected token") {
		issue.Type = "syntax"
		issue.Severity = "error"
		issue.Category = "syntax"
	}
	
	// Memory errors
	if strings.Contains(line, "out of memory") || strings.Contains(line, "ENOMEM") {
		issue.Type = "memory"
		issue.Severity = "error"
		issue.Category = "resource"
	}
	
	// Permission errors
	if strings.Contains(line, "EACCES") || strings.Contains(line, "permission denied") {
		issue.Type = "permission"
		issue.Severity = "error"
		issue.Category = "system"
	}
	
	return issue
}

// generateSuggestions generates fix suggestions based on build issues
func (b *BuildService) generateSuggestions(issues []BuildIssue) []string {
	suggestions := []string{}
	suggestionMap := make(map[string]bool)
	
	for _, issue := range issues {
		var suggestion string
		
		switch issue.Type {
		case "typescript":
			suggestion = "Check TypeScript configuration and ensure all types are properly defined"
		case "eslint":
			suggestion = "Run 'npm run lint:fix' to automatically fix linting issues"
		case "dependency":
			suggestion = "Run 'npm install' to ensure all dependencies are installed"
		case "syntax":
			suggestion = "Review syntax errors in the specified files and fix them"
		case "memory":
			suggestion = "Increase Node.js memory limit with --max-old-space-size=4096"
		case "permission":
			suggestion = "Check file permissions and ensure proper access rights"
		default:
			if strings.Contains(issue.Message, "not found") {
				suggestion = "Verify that all required files and dependencies exist"
			}
		}
		
		if suggestion != "" && !suggestionMap[suggestion] {
			suggestions = append(suggestions, suggestion)
			suggestionMap[suggestion] = true
		}
	}
	
	return suggestions
}

// GetBuildMetrics analyzes build performance metrics
func (b *BuildService) GetBuildMetrics(result *BuildResult) *BuildMetrics {
	metrics := &BuildMetrics{
		Duration:     result.Duration,
		Success:      result.Success,
		Timestamp:    result.Timestamp,
	}
	
	// Analyze output for performance metrics
	lines := strings.Split(result.Output, "\n")
	for _, line := range lines {
		// Webpack bundle size
		if strings.Contains(line, "chunk") && strings.Contains(line, "KiB") {
			// Extract bundle size information
			metrics.BundleSize = b.extractBundleSize(line)
		}
		
		// Build time breakdown
		if strings.Contains(line, "ms") {
			metrics.BuildSteps = append(metrics.BuildSteps, line)
		}
	}
	
	return metrics
}

// BuildMetrics represents build performance metrics
type BuildMetrics struct {
	Duration    time.Duration
	Success     bool
	Timestamp   time.Time
	BundleSize  string
	BuildSteps  []string
}

// extractBundleSize extracts bundle size from webpack output
func (b *BuildService) extractBundleSize(line string) string {
	// Simple extraction - in real implementation, use regex
	if idx := strings.Index(line, "KiB"); idx != -1 {
		start := strings.LastIndex(line[:idx], " ")
		if start != -1 {
			return strings.TrimSpace(line[start:idx+3])
		}
	}
	return ""
}

// DetectBuildSystem detects the build system used in the project
func (b *BuildService) DetectBuildSystem() string {
	// Check for package.json (Node.js/npm)
	if b.fileExists("package.json") {
		return "npm"
	}
	
	// Check for Makefile
	if b.fileExists("Makefile") {
		return "make"
	}
	
	// Check for Cargo.toml (Rust)
	if b.fileExists("Cargo.toml") {
		return "cargo"
	}
	
	// Check for go.mod (Go)
	if b.fileExists("go.mod") {
		return "go"
	}
	
	// Check for pom.xml (Maven)
	if b.fileExists("pom.xml") {
		return "maven"
	}
	
	// Check for build.gradle (Gradle)
	if b.fileExists("build.gradle") || b.fileExists("build.gradle.kts") {
		return "gradle"
	}
	
	return "unknown"
}

// fileExists checks if a file exists in the project directory
func (b *BuildService) fileExists(filename string) bool {
	path := filepath.Join(b.projectPath, filename)
	_, err := exec.Command("test", "-f", path).Output()
	return err == nil
}

