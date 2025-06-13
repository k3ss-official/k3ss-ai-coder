package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/k3ss-official/k3ss-ai-coder/task-3-cli-automation/internal/automation"
	"github.com/spf13/cobra"
)

var workflowCmd = &cobra.Command{
	Use:   "workflow",
	Short: "Automation workflow management",
	Long: `Create, manage, and execute automation workflows for common development tasks.`,
}

var workflowCreateCmd = &cobra.Command{
	Use:   "create [name]",
	Short: "Create a new automation workflow",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		name := args[0]
		description, _ := cmd.Flags().GetString("description")
		trigger, _ := cmd.Flags().GetString("trigger")
		steps, _ := cmd.Flags().GetStringSlice("steps")
		
		automationService := automation.NewAutomationService(".")
		
		// Parse trigger
		workflowTrigger := automation.WorkflowTrigger{
			Type: trigger,
		}
		
		// Parse steps
		var workflowSteps []automation.WorkflowStep
		for i, step := range steps {
			parts := strings.Fields(step)
			if len(parts) > 0 {
				workflowSteps = append(workflowSteps, automation.WorkflowStep{
					Name:    fmt.Sprintf("Step %d", i+1),
					Command: parts[0],
					Args:    parts[1:],
				})
			}
		}
		
		err := automationService.CreateWorkflow(name, description, workflowTrigger, workflowSteps)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error creating workflow: %v\n", err)
			os.Exit(1)
		}
		
		fmt.Printf("✅ Workflow '%s' created successfully\n", name)
	},
}

var workflowListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all automation workflows",
	Run: func(cmd *cobra.Command, args []string) {
		automationService := automation.NewAutomationService(".")
		
		// Load existing workflows
		if err := automationService.LoadWorkflows(); err != nil {
			fmt.Fprintf(os.Stderr, "Error loading workflows: %v\n", err)
			os.Exit(1)
		}
		
		workflows := automationService.ListWorkflows()
		
		if len(workflows) == 0 {
			fmt.Println("No workflows found")
			return
		}
		
		fmt.Println("Available workflows:")
		for _, workflow := range workflows {
			fmt.Printf("  📋 %s - %s\n", workflow.Name, workflow.Description)
			fmt.Printf("     Trigger: %s\n", workflow.Trigger.Type)
			fmt.Printf("     Steps: %d\n", len(workflow.Steps))
			if !workflow.LastRun.IsZero() {
				fmt.Printf("     Last run: %s\n", workflow.LastRun.Format("2006-01-02 15:04:05"))
			}
			fmt.Println()
		}
	},
}

var workflowRunCmd = &cobra.Command{
	Use:   "run [name]",
	Short: "Execute an automation workflow",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		name := args[0]
		
		automationService := automation.NewAutomationService(".")
		
		// Load existing workflows
		if err := automationService.LoadWorkflows(); err != nil {
			fmt.Fprintf(os.Stderr, "Error loading workflows: %v\n", err)
			os.Exit(1)
		}
		
		result, err := automationService.ExecuteWorkflow(name)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error executing workflow: %v\n", err)
			os.Exit(1)
		}
		
		fmt.Printf("\n📊 Workflow execution completed in %v\n", result.Duration)
		
		if result.Success {
			fmt.Println("✅ All steps completed successfully")
		} else {
			fmt.Printf("❌ Workflow failed: %v\n", result.Error)
		}
		
		// Show step results
		fmt.Println("\nStep results:")
		for i, step := range result.Steps {
			status := "✅"
			if !step.Success {
				status = "❌"
			}
			fmt.Printf("  %s Step %d: %s (%v)\n", status, i+1, step.StepName, step.Duration)
			if step.Error != nil {
				fmt.Printf("    Error: %v\n", step.Error)
			}
		}
	},
}

var workflowInitCmd = &cobra.Command{
	Use:   "init",
	Short: "Initialize with prebuilt workflows",
	Run: func(cmd *cobra.Command, args []string) {
		automationService := automation.NewAutomationService(".")
		
		fmt.Println("🚀 Creating prebuilt workflows...")
		
		if err := automationService.CreatePrebuiltWorkflows(); err != nil {
			fmt.Fprintf(os.Stderr, "Error creating prebuilt workflows: %v\n", err)
			os.Exit(1)
		}
		
		fmt.Println("✅ Prebuilt workflows created:")
		fmt.Println("  - deploy-staging: Deploy application to staging")
		fmt.Println("  - quality-check: Run code quality and security checks")
	},
}

var batchCmd = &cobra.Command{
	Use:   "batch",
	Short: "Batch operations across multiple files",
	Long: `Execute operations across multiple files matching specified patterns.`,
}

var batchRunCmd = &cobra.Command{
	Use:   "run [operation]",
	Short: "Execute batch operation",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		operation := args[0]
		pattern, _ := cmd.Flags().GetString("pattern")
		recursive, _ := cmd.Flags().GetBool("recursive")
		dryRun, _ := cmd.Flags().GetBool("dry-run")
		exclude, _ := cmd.Flags().GetStringSlice("exclude")
		
		batchProcessor := automation.NewBatchProcessor(".")
		
		batchOp := &automation.BatchOperation{
			Name:      fmt.Sprintf("batch-%s", operation),
			Operation: operation,
			Pattern:   pattern,
			DryRun:    dryRun,
			Recursive: recursive,
			Exclude:   exclude,
		}
		
		fmt.Printf("🔄 Executing batch operation: %s\n", operation)
		fmt.Printf("Pattern: %s\n", pattern)
		
		result, err := batchProcessor.ExecuteBatchOperation(batchOp)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error executing batch operation: %v\n", err)
			os.Exit(1)
		}
		
		fmt.Printf("\n📊 Batch operation completed\n")
		fmt.Printf("Files found: %d\n", result.FilesFound)
		fmt.Printf("Files processed: %d\n", result.FilesProcessed)
		
		if len(result.Errors) > 0 {
			fmt.Printf("Errors: %d\n", len(result.Errors))
			for _, err := range result.Errors {
				fmt.Printf("  ❌ %s: %s\n", err.File, err.Error)
			}
		}
		
		if result.Success {
			fmt.Println("✅ Batch operation completed successfully")
		} else {
			fmt.Println("⚠️  Batch operation completed with errors")
		}
	},
}

func init() {
	// Workflow create flags
	workflowCreateCmd.Flags().StringP("description", "d", "", "workflow description")
	workflowCreateCmd.Flags().StringP("trigger", "t", "manual", "workflow trigger (manual, file_change, git_hook)")
	workflowCreateCmd.Flags().StringSliceP("steps", "s", []string{}, "workflow steps (command with args)")
	
	// Batch operation flags
	batchRunCmd.Flags().StringP("pattern", "p", "*", "file pattern to match")
	batchRunCmd.Flags().BoolP("recursive", "r", false, "search recursively")
	batchRunCmd.Flags().BoolP("dry-run", "", false, "show what would be done without executing")
	batchRunCmd.Flags().StringSliceP("exclude", "e", []string{"node_modules", ".git"}, "patterns to exclude")
	
	// Add workflow subcommands
	workflowCmd.AddCommand(workflowCreateCmd)
	workflowCmd.AddCommand(workflowListCmd)
	workflowCmd.AddCommand(workflowRunCmd)
	workflowCmd.AddCommand(workflowInitCmd)
	
	// Add batch subcommands
	batchCmd.AddCommand(batchRunCmd)
	
	// Add to root command
	rootCmd.AddCommand(workflowCmd)
	rootCmd.AddCommand(batchCmd)
}

