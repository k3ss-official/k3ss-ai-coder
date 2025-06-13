package config

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Config represents the application configuration
type Config struct {
	// AI Service Configuration
	AI AIConfig `yaml:"ai"`
	
	// Git Configuration
	Git GitConfig `yaml:"git"`
	
	// Build Configuration
	Build BuildConfig `yaml:"build"`
	
	// General Settings
	Settings GeneralSettings `yaml:"settings"`
}

type AIConfig struct {
	// API endpoint for AI orchestration service
	Endpoint string `yaml:"endpoint"`
	
	// API key for authentication
	APIKey string `yaml:"api_key"`
	
	// Default model to use
	Model string `yaml:"model"`
	
	// Timeout for AI requests (seconds)
	Timeout int `yaml:"timeout"`
}

type GitConfig struct {
	// Auto-generate commit messages
	AutoCommit bool `yaml:"auto_commit"`
	
	// Default commit message style
	CommitStyle string `yaml:"commit_style"`
	
	// Enable pre-commit hooks
	PreCommitHooks bool `yaml:"pre_commit_hooks"`
}

type BuildConfig struct {
	// Auto-analyze build failures
	AutoAnalyze bool `yaml:"auto_analyze"`
	
	// Build command to use
	Command string `yaml:"command"`
	
	// Performance monitoring
	MonitorPerformance bool `yaml:"monitor_performance"`
}

type GeneralSettings struct {
	// Verbose output
	Verbose bool `yaml:"verbose"`
	
	// Debug mode
	Debug bool `yaml:"debug"`
	
	// Output format preference
	OutputFormat string `yaml:"output_format"`
}

// DefaultConfig returns a configuration with sensible defaults
func DefaultConfig() *Config {
	return &Config{
		AI: AIConfig{
			Endpoint: "http://localhost:8080",
			Model:    "gpt-4",
			Timeout:  30,
		},
		Git: GitConfig{
			AutoCommit:     false,
			CommitStyle:    "conventional",
			PreCommitHooks: true,
		},
		Build: BuildConfig{
			AutoAnalyze:        true,
			Command:           "npm run build",
			MonitorPerformance: true,
		},
		Settings: GeneralSettings{
			Verbose:      false,
			Debug:        false,
			OutputFormat: "text",
		},
	}
}

// LoadConfig loads configuration from file or creates default
func LoadConfig(configPath string) (*Config, error) {
	if configPath == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("failed to get home directory: %w", err)
		}
		configPath = filepath.Join(home, ".k3ss-ai.yaml")
	}
	
	// If config file doesn't exist, create default
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		config := DefaultConfig()
		if err := SaveConfig(config, configPath); err != nil {
			return nil, fmt.Errorf("failed to create default config: %w", err)
		}
		return config, nil
	}
	
	// Load existing config
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}
	
	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}
	
	return &config, nil
}

// SaveConfig saves configuration to file
func SaveConfig(config *Config, configPath string) error {
	data, err := yaml.Marshal(config)
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}
	
	// Ensure directory exists
	dir := filepath.Dir(configPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}
	
	if err := os.WriteFile(configPath, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}
	
	return nil
}

