package git

import (
	"bufio"
	"fmt"
	"os/exec"
	"strings"
)

// GitService handles git operations and AI integration
type GitService struct {
	repoPath string
}

// NewGitService creates a new git service instance
func NewGitService(repoPath string) *GitService {
	if repoPath == "" {
		repoPath = "."
	}
	return &GitService{repoPath: repoPath}
}

// GetDiff returns the git diff for the specified range
func (g *GitService) GetDiff(diffRange string) (string, error) {
	var cmd *exec.Cmd
	if diffRange == "" {
		// Get staged changes
		cmd = exec.Command("git", "diff", "--cached")
	} else {
		cmd = exec.Command("git", "diff", diffRange)
	}
	
	cmd.Dir = g.repoPath
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get git diff: %w", err)
	}
	
	return string(output), nil
}

// GetStatus returns the current git status
func (g *GitService) GetStatus() (string, error) {
	cmd := exec.Command("git", "status", "--porcelain")
	cmd.Dir = g.repoPath
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get git status: %w", err)
	}
	
	return string(output), nil
}

// GetBranches returns list of branches
func (g *GitService) GetBranches() ([]string, error) {
	cmd := exec.Command("git", "branch", "-a")
	cmd.Dir = g.repoPath
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get branches: %w", err)
	}
	
	var branches []string
	scanner := bufio.NewScanner(strings.NewReader(string(output)))
	for scanner.Scan() {
		branch := strings.TrimSpace(scanner.Text())
		if branch != "" && !strings.HasPrefix(branch, "*") {
			branches = append(branches, branch)
		}
	}
	
	return branches, nil
}

// GetCurrentBranch returns the current branch name
func (g *GitService) GetCurrentBranch() (string, error) {
	cmd := exec.Command("git", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = g.repoPath
	output, err := cmd.Output()
	if err != nil {
		return "", fmt.Errorf("failed to get current branch: %w", err)
	}
	
	return strings.TrimSpace(string(output)), nil
}

// GetCommitHistory returns recent commit history
func (g *GitService) GetCommitHistory(count int) ([]CommitInfo, error) {
	cmd := exec.Command("git", "log", fmt.Sprintf("-%d", count), "--pretty=format:%H|%an|%ae|%s|%ad", "--date=iso")
	cmd.Dir = g.repoPath
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to get commit history: %w", err)
	}
	
	var commits []CommitInfo
	scanner := bufio.NewScanner(strings.NewReader(string(output)))
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.Split(line, "|")
		if len(parts) >= 5 {
			commits = append(commits, CommitInfo{
				Hash:    parts[0],
				Author:  parts[1],
				Email:   parts[2],
				Message: parts[3],
				Date:    parts[4],
			})
		}
	}
	
	return commits, nil
}

// CommitInfo represents commit information
type CommitInfo struct {
	Hash    string
	Author  string
	Email   string
	Message string
	Date    string
}

// IsGitRepo checks if the current directory is a git repository
func (g *GitService) IsGitRepo() bool {
	cmd := exec.Command("git", "rev-parse", "--git-dir")
	cmd.Dir = g.repoPath
	err := cmd.Run()
	return err == nil
}

// AddFiles adds files to git staging area
func (g *GitService) AddFiles(files []string) error {
	args := append([]string{"add"}, files...)
	cmd := exec.Command("git", args...)
	cmd.Dir = g.repoPath
	return cmd.Run()
}

// Commit creates a commit with the given message
func (g *GitService) Commit(message string) error {
	cmd := exec.Command("git", "commit", "-m", message)
	cmd.Dir = g.repoPath
	return cmd.Run()
}

// HasStagedChanges checks if there are staged changes
func (g *GitService) HasStagedChanges() (bool, error) {
	cmd := exec.Command("git", "diff", "--cached", "--quiet")
	cmd.Dir = g.repoPath
	err := cmd.Run()
	// git diff --quiet returns 1 if there are differences, 0 if no differences
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			return exitError.ExitCode() == 1, nil
		}
		return false, err
	}
	return false, nil
}

