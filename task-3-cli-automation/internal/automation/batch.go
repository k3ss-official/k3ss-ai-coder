package automation

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// BatchProcessor handles batch operations across multiple files/projects
type BatchProcessor struct {
	projectPath string
}

// NewBatchProcessor creates a new batch processor instance
func NewBatchProcessor(projectPath string) *BatchProcessor {
	if projectPath == "" {
		projectPath = "."
	}
	return &BatchProcessor{projectPath: projectPath}
}

// BatchOperation represents a batch operation configuration
type BatchOperation struct {
	Name        string
	Operation   string
	Pattern     string
	Command     string
	Args        []string
	DryRun      bool
	Recursive   bool
	Exclude     []string
}

// BatchResult represents the result of a batch operation
type BatchResult struct {
	Operation    string
	FilesFound   int
	FilesProcessed int
	Errors       []BatchError
	Success      bool
}

// BatchError represents an error during batch processing
type BatchError struct {
	File  string
	Error string
}

// ExecuteBatchOperation executes a batch operation
func (b *BatchProcessor) ExecuteBatchOperation(operation *BatchOperation) (*BatchResult, error) {
	result := &BatchResult{
		Operation: operation.Name,
		Errors:    []BatchError{},
	}
	
	// Find files matching the pattern
	files, err := b.findFiles(operation.Pattern, operation.Recursive, operation.Exclude)
	if err != nil {
		return nil, fmt.Errorf("failed to find files: %w", err)
	}
	
	result.FilesFound = len(files)
	
	if operation.DryRun {
		fmt.Printf("Dry run: would process %d files\n", len(files))
		for _, file := range files {
			fmt.Printf("  - %s\n", file)
		}
		result.Success = true
		return result, nil
	}
	
	// Process each file
	for _, file := range files {
		if err := b.processFile(file, operation); err != nil {
			result.Errors = append(result.Errors, BatchError{
				File:  file,
				Error: err.Error(),
			})
		} else {
			result.FilesProcessed++
		}
	}
	
	result.Success = len(result.Errors) == 0
	return result, nil
}

// findFiles finds files matching the given pattern
func (b *BatchProcessor) findFiles(pattern string, recursive bool, exclude []string) ([]string, error) {
	var files []string
	
	if recursive {
		err := filepath.Walk(b.projectPath, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			
			if info.IsDir() {
				return nil
			}
			
			// Check if file matches pattern
			matched, err := filepath.Match(pattern, filepath.Base(path))
			if err != nil {
				return err
			}
			
			if matched && !b.isExcluded(path, exclude) {
				relPath, err := filepath.Rel(b.projectPath, path)
				if err != nil {
					return err
				}
				files = append(files, relPath)
			}
			
			return nil
		})
		return files, err
	} else {
		// Non-recursive search
		matches, err := filepath.Glob(filepath.Join(b.projectPath, pattern))
		if err != nil {
			return nil, err
		}
		
		for _, match := range matches {
			if !b.isExcluded(match, exclude) {
				relPath, err := filepath.Rel(b.projectPath, match)
				if err != nil {
					continue
				}
				files = append(files, relPath)
			}
		}
		
		return files, nil
	}
}

// isExcluded checks if a file should be excluded
func (b *BatchProcessor) isExcluded(file string, exclude []string) bool {
	for _, pattern := range exclude {
		matched, err := filepath.Match(pattern, filepath.Base(file))
		if err == nil && matched {
			return true
		}
		
		// Check if file is in excluded directory
		if strings.Contains(file, pattern) {
			return true
		}
	}
	return false
}

// processFile processes a single file with the given operation
func (b *BatchProcessor) processFile(file string, operation *BatchOperation) error {
	switch operation.Operation {
	case "add-tests":
		return b.addTests(file)
	case "format":
		return b.formatFile(file)
	case "lint-fix":
		return b.lintFix(file)
	case "update-imports":
		return b.updateImports(file)
	case "add-comments":
		return b.addComments(file)
	default:
		return fmt.Errorf("unknown operation: %s", operation.Operation)
	}
}

// addTests generates tests for a file
func (b *BatchProcessor) addTests(file string) error {
	fmt.Printf("Adding tests for %s\n", file)
	
	// Extract file info
	ext := filepath.Ext(file)
	base := strings.TrimSuffix(file, ext)
	
	// Determine test file name
	var testFile string
	switch ext {
	case ".js", ".ts":
		testFile = base + ".test" + ext
	case ".go":
		testFile = base + "_test.go"
	case ".py":
		testFile = "test_" + filepath.Base(base) + ".py"
	default:
		return fmt.Errorf("unsupported file type: %s", ext)
	}
	
	// Check if test file already exists
	testPath := filepath.Join(b.projectPath, testFile)
	if _, err := os.Stat(testPath); err == nil {
		return fmt.Errorf("test file already exists: %s", testFile)
	}
	
	// Generate basic test template
	testContent := b.generateTestTemplate(file, ext)
	
	// Write test file
	return os.WriteFile(testPath, []byte(testContent), 0644)
}

// generateTestTemplate generates a basic test template
func (b *BatchProcessor) generateTestTemplate(file, ext string) string {
	base := filepath.Base(strings.TrimSuffix(file, ext))
	
	switch ext {
	case ".js":
		return fmt.Sprintf(`const %s = require('./%s');

describe('%s', () => {
  test('should work correctly', () => {
    // TODO: Add test implementation
    expect(true).toBe(true);
  });
});
`, base, base, base)
	
	case ".ts":
		return fmt.Sprintf(`import { %s } from './%s';

describe('%s', () => {
  test('should work correctly', () => {
    // TODO: Add test implementation
    expect(true).toBe(true);
  });
});
`, base, base, base)
	
	case ".go":
		return fmt.Sprintf(`package main

import "testing"

func Test%s(t *testing.T) {
	// TODO: Add test implementation
	t.Log("Test not implemented")
}
`, strings.Title(base))
	
	case ".py":
		return fmt.Sprintf(`import unittest
from %s import *

class Test%s(unittest.TestCase):
    def test_example(self):
        # TODO: Add test implementation
        self.assertTrue(True)

if __name__ == '__main__':
    unittest.main()
`, base, strings.Title(base))
	
	default:
		return "# TODO: Add tests"
	}
}

// formatFile formats a file using appropriate formatter
func (b *BatchProcessor) formatFile(file string) error {
	fmt.Printf("Formatting %s\n", file)
	
	ext := filepath.Ext(file)
	switch ext {
	case ".js", ".ts", ".json":
		// Use prettier
		return b.runCommand("npx", []string{"prettier", "--write", file})
	case ".go":
		// Use gofmt
		return b.runCommand("gofmt", []string{"-w", file})
	case ".py":
		// Use black
		return b.runCommand("black", []string{file})
	default:
		return fmt.Errorf("no formatter available for %s", ext)
	}
}

// lintFix runs linter with auto-fix for a file
func (b *BatchProcessor) lintFix(file string) error {
	fmt.Printf("Linting %s\n", file)
	
	ext := filepath.Ext(file)
	switch ext {
	case ".js", ".ts":
		return b.runCommand("npx", []string{"eslint", "--fix", file})
	case ".go":
		return b.runCommand("golint", []string{file})
	case ".py":
		return b.runCommand("flake8", []string{file})
	default:
		return fmt.Errorf("no linter available for %s", ext)
	}
}

// updateImports updates import statements in a file
func (b *BatchProcessor) updateImports(file string) error {
	fmt.Printf("Updating imports in %s\n", file)
	
	ext := filepath.Ext(file)
	switch ext {
	case ".go":
		return b.runCommand("goimports", []string{"-w", file})
	case ".py":
		return b.runCommand("isort", []string{file})
	default:
		return fmt.Errorf("import updating not supported for %s", ext)
	}
}

// addComments adds documentation comments to a file
func (b *BatchProcessor) addComments(file string) error {
	fmt.Printf("Adding comments to %s\n", file)
	
	// TODO: Implement AI-powered comment generation
	// This would analyze the code and add appropriate documentation
	
	return fmt.Errorf("comment generation not yet implemented")
}

// runCommand executes a command for file processing
func (b *BatchProcessor) runCommand(command string, args []string) error {
	// TODO: Implement command execution
	// This is a placeholder for the actual command execution
	fmt.Printf("Running: %s %s\n", command, strings.Join(args, " "))
	return nil
}

