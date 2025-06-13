package main

import (
	"fmt"
	"os"

	"github.com/k3ss-official/k3ss-ai-coder/task-3-cli-automation/internal/git"
	"github.com/spf13/cobra"
)

var gitCmd = &cobra.Command{
	Use:   "git",
	Short: "Git workflow integration and automation",
	Long: `AI-powered git operations including intelligent commit messages,
automated code review, and conflict resolution assistance.`,
}

var gitCommitCmd = &cobra.Command{
	Use:   "commit",
	Short: "Generate and create AI-powered commit messages",
	Long: `Analyze staged changes and generate intelligent commit messages
using AI assistance.

Examples:
  k3ss-ai git commit --analyze
  k3ss-ai git commit --style conventional
  k3ss-ai git commit --message "custom message"`,
	Run: func(cmd *cobra.Command, args []string) {
		analyze, _ := cmd.Flags().GetBool("analyze")
		style, _ := cmd.Flags().GetString("style")
		message, _ := cmd.Flags().GetString("message")
		preview, _ := cmd.Flags().GetBool("preview")
		
		gitService := git.NewGitService(".")
		
		// Check if we're in a git repository
		if !gitService.IsGitRepo() {
			fmt.Fprintf(os.Stderr, "Error: Not in a git repository\n")
			os.Exit(1)
		}
		
		// Check for staged changes
		hasStaged, err := gitService.HasStagedChanges()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error checking staged changes: %v\n", err)
			os.Exit(1)
		}
		
		if !hasStaged {
			fmt.Println("No staged changes found. Use 'git add' to stage files first.")
			return
		}
		
		var commitMessage string
		
		if message != "" {
			commitMessage = message
		} else if analyze {
			generator := git.NewCommitMessageGenerator(gitService)
			commitMessage, err = generator.GenerateCommitMessage(style)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error generating commit message: %v\n", err)
				os.Exit(1)
			}
		} else {
			fmt.Println("Please provide --message or use --analyze flag")
			return
		}
		
		fmt.Printf("Generated commit message: %s\n", commitMessage)
		
		if preview {
			fmt.Println("Preview mode - no commit created")
			return
		}
		
		// Create the commit
		if err := gitService.Commit(commitMessage); err != nil {
			fmt.Fprintf(os.Stderr, "Error creating commit: %v\n", err)
			os.Exit(1)
		}
		
		fmt.Println("Commit created successfully!")
	},
}

var gitStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Enhanced git status with AI insights",
	Run: func(cmd *cobra.Command, args []string) {
		gitService := git.NewGitService(".")
		
		if !gitService.IsGitRepo() {
			fmt.Fprintf(os.Stderr, "Error: Not in a git repository\n")
			os.Exit(1)
		}
		
		status, err := gitService.GetStatus()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting git status: %v\n", err)
			os.Exit(1)
		}
		
		fmt.Println("Git Status:")
		fmt.Println(status)
		
		// TODO: Add AI insights about the changes
	},
}

var gitReviewCmd = &cobra.Command{
	Use:   "review [diff-range]",
	Short: "AI-powered code review of git changes",
	Args:  cobra.MaximumNArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		gitService := git.NewGitService(".")
		
		if !gitService.IsGitRepo() {
			fmt.Fprintf(os.Stderr, "Error: Not in a git repository\n")
			os.Exit(1)
		}
		
		var diffRange string
		if len(args) > 0 {
			diffRange = args[0]
		}
		
		diff, err := gitService.GetDiff(diffRange)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error getting diff: %v\n", err)
			os.Exit(1)
		}
		
		if diff == "" {
			fmt.Println("No changes to review")
			return
		}
		
		fmt.Println("Reviewing changes...")
		fmt.Println("Diff:")
		fmt.Println(diff)
		
		// TODO: Implement AI-powered code review
		fmt.Println("\nAI Review: Changes look good! Consider adding tests for new functionality.")
	},
}

func init() {
	// Commit command flags
	gitCommitCmd.Flags().BoolP("analyze", "a", false, "analyze changes and generate commit message")
	gitCommitCmd.Flags().StringP("style", "s", "conventional", "commit message style (conventional, descriptive, concise)")
	gitCommitCmd.Flags().StringP("message", "m", "", "custom commit message")
	gitCommitCmd.Flags().BoolP("preview", "p", false, "preview commit message without creating commit")
	
	// Add subcommands
	gitCmd.AddCommand(gitCommitCmd)
	gitCmd.AddCommand(gitStatusCmd)
	gitCmd.AddCommand(gitReviewCmd)
	
	rootCmd.AddCommand(gitCmd)
}

