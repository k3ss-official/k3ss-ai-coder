package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "k3ss-ai",
	Short: "K3SS AI Coder - Ultimate AI Code Assistant CLI",
	Long: `K3SS AI Coder CLI provides powerful command-line access to AI-powered 
development tools including code generation, analysis, git integration, 
build system automation, and workflow optimization.`,
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Println("K3SS AI Coder CLI - Ultimate AI Code Assistant")
		fmt.Println("Use 'k3ss-ai --help' for available commands")
	},
}

func init() {
	// Add global flags
	rootCmd.PersistentFlags().StringP("config", "c", "", "config file (default is $HOME/.k3ss-ai.yaml)")
	rootCmd.PersistentFlags().BoolP("verbose", "v", false, "verbose output")
	rootCmd.PersistentFlags().BoolP("debug", "d", false, "debug mode")
}

func main() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

