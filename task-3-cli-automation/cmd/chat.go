package main

import (
	"fmt"

	"github.com/spf13/cobra"
)

var chatCmd = &cobra.Command{
	Use:   "chat [message]",
	Short: "Interactive chat with AI assistant",
	Long: `Start an interactive chat session with the AI assistant or send a single message.
	
Examples:
  k3ss-ai chat "help me optimize this function"
  k3ss-ai chat --file main.go "explain this code"
  k3ss-ai chat --interactive`,
	Args: cobra.MinimumNArgs(0),
	Run: func(cmd *cobra.Command, args []string) {
		interactive, _ := cmd.Flags().GetBool("interactive")
		file, _ := cmd.Flags().GetString("file")
		
		if interactive {
			fmt.Println("Starting interactive chat session...")
			// TODO: Implement interactive chat
		} else if len(args) > 0 {
			message := args[0]
			if file != "" {
				fmt.Printf("Analyzing file %s with message: %s\n", file, message)
			} else {
				fmt.Printf("Processing message: %s\n", message)
			}
			// TODO: Send message to AI orchestration service
		} else {
			fmt.Println("Please provide a message or use --interactive flag")
		}
	},
}

func init() {
	chatCmd.Flags().BoolP("interactive", "i", false, "start interactive chat session")
	chatCmd.Flags().StringP("file", "f", "", "analyze specific file")
	chatCmd.Flags().StringP("context", "", "", "additional context for the conversation")
	rootCmd.AddCommand(chatCmd)
}

