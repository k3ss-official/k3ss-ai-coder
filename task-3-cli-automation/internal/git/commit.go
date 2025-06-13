package git

import (
	"fmt"
	"path/filepath"
	"strings"
)

// CommitMessageGenerator generates AI-powered commit messages
type CommitMessageGenerator struct {
	gitService *GitService
}

// NewCommitMessageGenerator creates a new commit message generator
func NewCommitMessageGenerator(gitService *GitService) *CommitMessageGenerator {
	return &CommitMessageGenerator{gitService: gitService}
}

// GenerateCommitMessage generates a commit message based on staged changes
func (c *CommitMessageGenerator) GenerateCommitMessage(style string) (string, error) {
	// Get the diff of staged changes
	diff, err := c.gitService.GetDiff("")
	if err != nil {
		return "", fmt.Errorf("failed to get diff: %w", err)
	}
	
	if diff == "" {
		return "", fmt.Errorf("no staged changes found")
	}
	
	// Analyze the diff and generate message
	return c.analyzeAndGenerateMessage(diff, style)
}

// analyzeAndGenerateMessage analyzes the diff and generates appropriate commit message
func (c *CommitMessageGenerator) analyzeAndGenerateMessage(diff, style string) (string, error) {
	analysis := c.analyzeDiff(diff)
	
	switch style {
	case "conventional":
		return c.generateConventionalMessage(analysis), nil
	case "descriptive":
		return c.generateDescriptiveMessage(analysis), nil
	case "concise":
		return c.generateConciseMessage(analysis), nil
	default:
		return c.generateConventionalMessage(analysis), nil
	}
}

// DiffAnalysis represents the analysis of a git diff
type DiffAnalysis struct {
	FilesAdded    []string
	FilesModified []string
	FilesDeleted  []string
	LinesAdded    int
	LinesRemoved  int
	ChangeType    string
	Scope         string
	Description   string
}

// analyzeDiff analyzes the git diff to understand the changes
func (c *CommitMessageGenerator) analyzeDiff(diff string) *DiffAnalysis {
	analysis := &DiffAnalysis{
		FilesAdded:    []string{},
		FilesModified: []string{},
		FilesDeleted:  []string{},
	}
	
	lines := strings.Split(diff, "\n")
	
	for _, line := range lines {
		if strings.HasPrefix(line, "diff --git") {
			// Extract file path
			parts := strings.Fields(line)
			if len(parts) >= 4 {
				filePath := strings.TrimPrefix(parts[3], "b/")
				analysis.FilesModified = append(analysis.FilesModified, filePath)
			}
		} else if strings.HasPrefix(line, "new file mode") {
			// File was added
			if len(analysis.FilesModified) > 0 {
				lastFile := analysis.FilesModified[len(analysis.FilesModified)-1]
				analysis.FilesAdded = append(analysis.FilesAdded, lastFile)
				// Remove from modified list
				analysis.FilesModified = analysis.FilesModified[:len(analysis.FilesModified)-1]
			}
		} else if strings.HasPrefix(line, "deleted file mode") {
			// File was deleted
			if len(analysis.FilesModified) > 0 {
				lastFile := analysis.FilesModified[len(analysis.FilesModified)-1]
				analysis.FilesDeleted = append(analysis.FilesDeleted, lastFile)
				// Remove from modified list
				analysis.FilesModified = analysis.FilesModified[:len(analysis.FilesModified)-1]
			}
		} else if strings.HasPrefix(line, "+") && !strings.HasPrefix(line, "+++") {
			analysis.LinesAdded++
		} else if strings.HasPrefix(line, "-") && !strings.HasPrefix(line, "---") {
			analysis.LinesRemoved++
		}
	}
	
	// Determine change type and scope
	analysis.ChangeType = c.determineChangeType(analysis)
	analysis.Scope = c.determineScope(analysis)
	analysis.Description = c.generateDescription(analysis)
	
	return analysis
}

// determineChangeType determines the type of change based on analysis
func (c *CommitMessageGenerator) determineChangeType(analysis *DiffAnalysis) string {
	if len(analysis.FilesAdded) > 0 {
		return "feat"
	}
	if len(analysis.FilesDeleted) > 0 {
		return "remove"
	}
	if analysis.LinesAdded > analysis.LinesRemoved*2 {
		return "feat"
	}
	if analysis.LinesRemoved > analysis.LinesAdded*2 {
		return "refactor"
	}
	
	// Check file types for more specific categorization
	for _, file := range analysis.FilesModified {
		if strings.Contains(file, "test") {
			return "test"
		}
		if strings.Contains(file, "doc") || strings.HasSuffix(file, ".md") {
			return "docs"
		}
		if strings.Contains(file, "config") || strings.HasSuffix(file, ".json") || strings.HasSuffix(file, ".yaml") {
			return "config"
		}
	}
	
	return "fix"
}

// determineScope determines the scope of changes
func (c *CommitMessageGenerator) determineScope(analysis *DiffAnalysis) string {
	if len(analysis.FilesModified) == 1 {
		file := analysis.FilesModified[0]
		parts := strings.Split(file, "/")
		if len(parts) > 1 {
			return parts[0]
		}
		return strings.TrimSuffix(file, filepath.Ext(file))
	}
	
	// Find common directory
	if len(analysis.FilesModified) > 1 {
		commonDir := findCommonDirectory(analysis.FilesModified)
		if commonDir != "" {
			return commonDir
		}
	}
	
	return ""
}

// generateDescription generates a description of the changes
func (c *CommitMessageGenerator) generateDescription(analysis *DiffAnalysis) string {
	if len(analysis.FilesAdded) > 0 {
		if len(analysis.FilesAdded) == 1 {
			return fmt.Sprintf("add %s", analysis.FilesAdded[0])
		}
		return fmt.Sprintf("add %d new files", len(analysis.FilesAdded))
	}
	
	if len(analysis.FilesDeleted) > 0 {
		if len(analysis.FilesDeleted) == 1 {
			return fmt.Sprintf("remove %s", analysis.FilesDeleted[0])
		}
		return fmt.Sprintf("remove %d files", len(analysis.FilesDeleted))
	}
	
	if len(analysis.FilesModified) == 1 {
		return fmt.Sprintf("update %s", analysis.FilesModified[0])
	}
	
	return fmt.Sprintf("update %d files", len(analysis.FilesModified))
}

// generateConventionalMessage generates a conventional commit message
func (c *CommitMessageGenerator) generateConventionalMessage(analysis *DiffAnalysis) string {
	var message strings.Builder
	
	message.WriteString(analysis.ChangeType)
	
	if analysis.Scope != "" {
		message.WriteString(fmt.Sprintf("(%s)", analysis.Scope))
	}
	
	message.WriteString(": ")
	message.WriteString(analysis.Description)
	
	return message.String()
}

// generateDescriptiveMessage generates a descriptive commit message
func (c *CommitMessageGenerator) generateDescriptiveMessage(analysis *DiffAnalysis) string {
	var message strings.Builder
	
	if len(analysis.FilesAdded) > 0 {
		message.WriteString("Add ")
		message.WriteString(strings.Join(analysis.FilesAdded, ", "))
	} else if len(analysis.FilesDeleted) > 0 {
		message.WriteString("Remove ")
		message.WriteString(strings.Join(analysis.FilesDeleted, ", "))
	} else {
		message.WriteString("Update ")
		if len(analysis.FilesModified) <= 3 {
			message.WriteString(strings.Join(analysis.FilesModified, ", "))
		} else {
			message.WriteString(fmt.Sprintf("%d files", len(analysis.FilesModified)))
		}
	}
	
	if analysis.LinesAdded > 0 || analysis.LinesRemoved > 0 {
		message.WriteString(fmt.Sprintf(" (+%d -%d lines)", analysis.LinesAdded, analysis.LinesRemoved))
	}
	
	return message.String()
}

// generateConciseMessage generates a concise commit message
func (c *CommitMessageGenerator) generateConciseMessage(analysis *DiffAnalysis) string {
	if len(analysis.FilesAdded) > 0 {
		return fmt.Sprintf("Add %d files", len(analysis.FilesAdded))
	}
	if len(analysis.FilesDeleted) > 0 {
		return fmt.Sprintf("Remove %d files", len(analysis.FilesDeleted))
	}
	return fmt.Sprintf("Update %d files", len(analysis.FilesModified))
}

// Helper function to find common directory
func findCommonDirectory(files []string) string {
	if len(files) == 0 {
		return ""
	}
	
	// Split first file path
	firstParts := strings.Split(files[0], "/")
	
	// Find common prefix
	for i := 0; i < len(firstParts); i++ {
		prefix := strings.Join(firstParts[:i+1], "/")
		
		// Check if all files start with this prefix
		allMatch := true
		for _, file := range files[1:] {
			if !strings.HasPrefix(file, prefix) {
				allMatch = false
				break
			}
		}
		
		if !allMatch {
			if i == 0 {
				return ""
			}
			return strings.Join(firstParts[:i], "/")
		}
	}
	
		return strings.Join(firstParts, "/")
}
