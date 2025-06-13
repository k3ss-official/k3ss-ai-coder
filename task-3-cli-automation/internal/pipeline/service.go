package pipeline

import (
	"fmt"
	"os/exec"
	"strings"
)

// PipelineService handles CI/CD pipeline integration
type PipelineService struct {
	projectPath string
}

// NewPipelineService creates a new pipeline service instance
func NewPipelineService(projectPath string) *PipelineService {
	if projectPath == "" {
		projectPath = "."
	}
	return &PipelineService{projectPath: projectPath}
}

// PipelineConfig represents pipeline configuration
type PipelineConfig struct {
	Platform    string
	ConfigFile  string
	Jobs        []PipelineJob
	Environment map[string]string
}

// PipelineJob represents a single job in the pipeline
type PipelineJob struct {
	Name    string
	Steps   []string
	Depends []string
}

// DetectPipeline detects the CI/CD platform and configuration
func (p *PipelineService) DetectPipeline() (*PipelineConfig, error) {
	config := &PipelineConfig{
		Environment: make(map[string]string),
	}
	
	// GitHub Actions
	if p.fileExists(".github/workflows") {
		config.Platform = "github-actions"
		config.ConfigFile = ".github/workflows"
		return config, nil
	}
	
	// GitLab CI
	if p.fileExists(".gitlab-ci.yml") {
		config.Platform = "gitlab-ci"
		config.ConfigFile = ".gitlab-ci.yml"
		return config, nil
	}
	
	// Jenkins
	if p.fileExists("Jenkinsfile") {
		config.Platform = "jenkins"
		config.ConfigFile = "Jenkinsfile"
		return config, nil
	}
	
	// Azure DevOps
	if p.fileExists("azure-pipelines.yml") {
		config.Platform = "azure-devops"
		config.ConfigFile = "azure-pipelines.yml"
		return config, nil
	}
	
	// CircleCI
	if p.fileExists(".circleci/config.yml") {
		config.Platform = "circleci"
		config.ConfigFile = ".circleci/config.yml"
		return config, nil
	}
	
	// Travis CI
	if p.fileExists(".travis.yml") {
		config.Platform = "travis-ci"
		config.ConfigFile = ".travis.yml"
		return config, nil
	}
	
	config.Platform = "none"
	return config, nil
}

// GeneratePipelineConfig generates pipeline configuration for specified platform
func (p *PipelineService) GeneratePipelineConfig(platform string, jobs []PipelineJob) (string, error) {
	switch platform {
	case "github-actions":
		return p.generateGitHubActions(jobs), nil
	case "gitlab-ci":
		return p.generateGitLabCI(jobs), nil
	case "jenkins":
		return p.generateJenkinsfile(jobs), nil
	default:
		return "", fmt.Errorf("unsupported platform: %s", platform)
	}
}

// generateGitHubActions generates GitHub Actions workflow
func (p *PipelineService) generateGitHubActions(jobs []PipelineJob) string {
	var config strings.Builder
	
	config.WriteString("name: K3SS AI Coder CI/CD\n\n")
	config.WriteString("on:\n")
	config.WriteString("  push:\n")
	config.WriteString("    branches: [ main, develop ]\n")
	config.WriteString("  pull_request:\n")
	config.WriteString("    branches: [ main ]\n\n")
	config.WriteString("jobs:\n")
	
	for _, job := range jobs {
		config.WriteString(fmt.Sprintf("  %s:\n", job.Name))
		config.WriteString("    runs-on: ubuntu-latest\n")
		
		if len(job.Depends) > 0 {
			config.WriteString(fmt.Sprintf("    needs: [%s]\n", strings.Join(job.Depends, ", ")))
		}
		
		config.WriteString("    steps:\n")
		config.WriteString("    - uses: actions/checkout@v3\n")
		config.WriteString("    - name: Setup Node.js\n")
		config.WriteString("      uses: actions/setup-node@v3\n")
		config.WriteString("      with:\n")
		config.WriteString("        node-version: '18'\n")
		
		for _, step := range job.Steps {
			config.WriteString(fmt.Sprintf("    - name: %s\n", step))
			config.WriteString(fmt.Sprintf("      run: %s\n", step))
		}
		config.WriteString("\n")
	}
	
	return config.String()
}

// generateGitLabCI generates GitLab CI configuration
func (p *PipelineService) generateGitLabCI(jobs []PipelineJob) string {
	var config strings.Builder
	
	config.WriteString("stages:\n")
	for _, job := range jobs {
		config.WriteString(fmt.Sprintf("  - %s\n", job.Name))
	}
	config.WriteString("\n")
	
	config.WriteString("image: node:18\n\n")
	
	for _, job := range jobs {
		config.WriteString(fmt.Sprintf("%s:\n", job.Name))
		config.WriteString(fmt.Sprintf("  stage: %s\n", job.Name))
		config.WriteString("  script:\n")
		
		for _, step := range job.Steps {
			config.WriteString(fmt.Sprintf("    - %s\n", step))
		}
		config.WriteString("\n")
	}
	
	return config.String()
}

// generateJenkinsfile generates Jenkinsfile
func (p *PipelineService) generateJenkinsfile(jobs []PipelineJob) string {
	var config strings.Builder
	
	config.WriteString("pipeline {\n")
	config.WriteString("    agent any\n\n")
	config.WriteString("    stages {\n")
	
	for _, job := range jobs {
		config.WriteString(fmt.Sprintf("        stage('%s') {\n", job.Name))
		config.WriteString("            steps {\n")
		
		for _, step := range job.Steps {
			config.WriteString(fmt.Sprintf("                sh '%s'\n", step))
		}
		
		config.WriteString("            }\n")
		config.WriteString("        }\n")
	}
	
	config.WriteString("    }\n")
	config.WriteString("}\n")
	
	return config.String()
}

// OptimizePipeline analyzes and suggests pipeline optimizations
func (p *PipelineService) OptimizePipeline(config *PipelineConfig) []string {
	suggestions := []string{}
	
	// Check for parallel job opportunities
	if len(config.Jobs) > 1 {
		suggestions = append(suggestions, "Consider running independent jobs in parallel to reduce build time")
	}
	
	// Check for caching opportunities
	suggestions = append(suggestions, "Add dependency caching to speed up builds")
	
	// Check for matrix builds
	suggestions = append(suggestions, "Consider matrix builds for testing multiple environments")
	
	// Check for artifact management
	suggestions = append(suggestions, "Implement artifact storage for build outputs")
	
	return suggestions
}

// ValidatePipelineConfig validates pipeline configuration
func (p *PipelineService) ValidatePipelineConfig(platform, configContent string) []string {
	issues := []string{}
	
	// Basic validation checks
	if configContent == "" {
		issues = append(issues, "Configuration is empty")
		return issues
	}
	
	switch platform {
	case "github-actions":
		if !strings.Contains(configContent, "on:") {
			issues = append(issues, "Missing trigger configuration")
		}
		if !strings.Contains(configContent, "jobs:") {
			issues = append(issues, "Missing jobs configuration")
		}
	case "gitlab-ci":
		if !strings.Contains(configContent, "stages:") {
			issues = append(issues, "Missing stages configuration")
		}
	case "jenkins":
		if !strings.Contains(configContent, "pipeline") {
			issues = append(issues, "Missing pipeline block")
		}
	}
	
	return issues
}

// fileExists checks if a file or directory exists
func (p *PipelineService) fileExists(path string) bool {
	cmd := exec.Command("test", "-e", path)
	cmd.Dir = p.projectPath
	return cmd.Run() == nil
}

