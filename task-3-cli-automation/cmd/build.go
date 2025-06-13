package main

import (
	"fmt"
	"os"

	"github.com/k3ss-official/k3ss-ai-coder/task-3-cli-automation/internal/build"
	"github.com/k3ss-official/k3ss-ai-coder/task-3-cli-automation/internal/pipeline"
	"github.com/spf13/cobra"
)

var buildCmd = &cobra.Command{
	Use:   "build",
	Short: "Build system integration and analysis",
	Long: `AI-powered build system integration with error analysis,
performance monitoring, and optimization suggestions.`,
}

var buildRunCmd = &cobra.Command{
	Use:   "run",
	Short: "Execute build with AI analysis",
	Run: func(cmd *cobra.Command, args []string) {
		command, _ := cmd.Flags().GetString("command")
		analyze, _ := cmd.Flags().GetBool("analyze")
		fix, _ := cmd.Flags().GetBool("fix")
		
		buildService := build.NewBuildService(".", command)
		
		fmt.Printf("Running build command: %s\n", command)
		result, err := buildService.ExecuteBuild()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error executing build: %v\n", err)
			os.Exit(1)
		}
		
		fmt.Printf("Build completed in %v\n", result.Duration)
		
		if result.Success {
			fmt.Println("✅ Build successful!")
			
			// Show performance metrics
			metrics := buildService.GetBuildMetrics(result)
			if metrics.BundleSize != "" {
				fmt.Printf("Bundle size: %s\n", metrics.BundleSize)
			}
		} else {
			fmt.Printf("❌ Build failed (exit code: %d)\n", result.ExitCode)
			
			if analyze {
				fmt.Println("\n🔍 Analyzing build failure...")
				analysis := buildService.AnalyzeBuildFailure(result)
				
				fmt.Printf("Summary: %s\n", analysis.Summary)
				
				if len(analysis.Issues) > 0 {
					fmt.Println("\nIssues found:")
					for i, issue := range analysis.Issues {
						fmt.Printf("%d. [%s] %s\n", i+1, issue.Type, issue.Message)
					}
				}
				
				if len(analysis.Suggestions) > 0 {
					fmt.Println("\n💡 Suggestions:")
					for i, suggestion := range analysis.Suggestions {
						fmt.Printf("%d. %s\n", i+1, suggestion)
					}
				}
				
				if fix {
					fmt.Println("\n🔧 Attempting automatic fixes...")
					// TODO: Implement automatic fixes
					fmt.Println("Automatic fixes not yet implemented")
				}
			}
		}
	},
}

var buildAnalyzeCmd = &cobra.Command{
	Use:   "analyze",
	Short: "Analyze build system and performance",
	Run: func(cmd *cobra.Command, args []string) {
		buildService := build.NewBuildService(".", "")
		
		fmt.Println("🔍 Analyzing build system...")
		
		// Detect build system
		buildSystem := buildService.DetectBuildSystem()
		fmt.Printf("Detected build system: %s\n", buildSystem)
		
		// TODO: Add more analysis features
		fmt.Println("Build system analysis completed")
	},
}

var pipelineCmd = &cobra.Command{
	Use:   "pipeline",
	Short: "CI/CD pipeline integration and optimization",
	Long: `Manage and optimize CI/CD pipelines with AI assistance.`,
}

var pipelineDetectCmd = &cobra.Command{
	Use:   "detect",
	Short: "Detect CI/CD pipeline configuration",
	Run: func(cmd *cobra.Command, args []string) {
		pipelineService := pipeline.NewPipelineService(".")
		
		fmt.Println("🔍 Detecting CI/CD pipeline...")
		
		config, err := pipelineService.DetectPipeline()
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error detecting pipeline: %v\n", err)
			os.Exit(1)
		}
		
		fmt.Printf("Platform: %s\n", config.Platform)
		if config.ConfigFile != "" {
			fmt.Printf("Config file: %s\n", config.ConfigFile)
		}
		
		if config.Platform != "none" {
			suggestions := pipelineService.OptimizePipeline(config)
			if len(suggestions) > 0 {
				fmt.Println("\n💡 Optimization suggestions:")
				for i, suggestion := range suggestions {
					fmt.Printf("%d. %s\n", i+1, suggestion)
				}
			}
		} else {
			fmt.Println("No CI/CD pipeline detected. Consider setting up automated builds.")
		}
	},
}

var pipelineGenerateCmd = &cobra.Command{
	Use:   "generate [platform]",
	Short: "Generate CI/CD pipeline configuration",
	Args:  cobra.ExactArgs(1),
	Run: func(cmd *cobra.Command, args []string) {
		platform := args[0]
		
		pipelineService := pipeline.NewPipelineService(".")
		
		// Define default jobs
		jobs := []pipeline.PipelineJob{
			{
				Name:  "test",
				Steps: []string{"npm install", "npm test"},
			},
			{
				Name:    "build",
				Steps:   []string{"npm run build"},
				Depends: []string{"test"},
			},
			{
				Name:    "deploy",
				Steps:   []string{"npm run deploy"},
				Depends: []string{"build"},
			},
		}
		
		fmt.Printf("Generating %s pipeline configuration...\n", platform)
		
		config, err := pipelineService.GeneratePipelineConfig(platform, jobs)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error generating pipeline: %v\n", err)
			os.Exit(1)
		}
		
		fmt.Println("\nGenerated configuration:")
		fmt.Println("------------------------")
		fmt.Println(config)
	},
}

func init() {
	// Build command flags
	buildRunCmd.Flags().StringP("command", "c", "npm run build", "build command to execute")
	buildRunCmd.Flags().BoolP("analyze", "a", true, "analyze build results")
	buildRunCmd.Flags().BoolP("fix", "f", false, "attempt automatic fixes")
	
	// Add build subcommands
	buildCmd.AddCommand(buildRunCmd)
	buildCmd.AddCommand(buildAnalyzeCmd)
	
	// Add pipeline subcommands
	pipelineCmd.AddCommand(pipelineDetectCmd)
	pipelineCmd.AddCommand(pipelineGenerateCmd)
	
	// Add to root command
	rootCmd.AddCommand(buildCmd)
	rootCmd.AddCommand(pipelineCmd)
}

