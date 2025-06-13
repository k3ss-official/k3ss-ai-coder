package automation

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// AutomationService handles workflow automation and scripting
type AutomationService struct {
	projectPath string
	workflows   map[string]*Workflow
}

// NewAutomationService creates a new automation service instance
func NewAutomationService(projectPath string) *AutomationService {
	if projectPath == "" {
		projectPath = "."
	}
	return &AutomationService{
		projectPath: projectPath,
		workflows:   make(map[string]*Workflow),
	}
}

// Workflow represents an automation workflow
type Workflow struct {
	Name        string
	Description string
	Trigger     WorkflowTrigger
	Steps       []WorkflowStep
	Environment map[string]string
	Created     time.Time
	LastRun     time.Time
}

// WorkflowTrigger defines when a workflow should run
type WorkflowTrigger struct {
	Type       string // "manual", "file_change", "git_hook", "schedule"
	Pattern    string // file pattern for file_change, cron for schedule
	Events     []string
	Conditions []string
}

// WorkflowStep represents a single step in a workflow
type WorkflowStep struct {
	Name        string
	Command     string
	Args        []string
	WorkingDir  string
	Environment map[string]string
	ContinueOnError bool
}

// WorkflowResult represents the result of workflow execution
type WorkflowResult struct {
	WorkflowName string
	Success      bool
	Duration     time.Duration
	Steps        []StepResult
	Error        error
	StartTime    time.Time
	EndTime      time.Time
}

// StepResult represents the result of a single step
type StepResult struct {
	StepName string
	Success  bool
	Output   string
	Error    error
	Duration time.Duration
}

// CreateWorkflow creates a new workflow
func (a *AutomationService) CreateWorkflow(name, description string, trigger WorkflowTrigger, steps []WorkflowStep) error {
	if _, exists := a.workflows[name]; exists {
		return fmt.Errorf("workflow '%s' already exists", name)
	}
	
	workflow := &Workflow{
		Name:        name,
		Description: description,
		Trigger:     trigger,
		Steps:       steps,
		Environment: make(map[string]string),
		Created:     time.Now(),
	}
	
	a.workflows[name] = workflow
	return a.saveWorkflow(workflow)
}

// ExecuteWorkflow executes a workflow by name
func (a *AutomationService) ExecuteWorkflow(name string) (*WorkflowResult, error) {
	workflow, exists := a.workflows[name]
	if !exists {
		return nil, fmt.Errorf("workflow '%s' not found", name)
	}
	
	result := &WorkflowResult{
		WorkflowName: name,
		StartTime:    time.Now(),
		Steps:        make([]StepResult, 0, len(workflow.Steps)),
	}
	
	fmt.Printf("🚀 Executing workflow: %s\n", name)
	
	for i, step := range workflow.Steps {
		fmt.Printf("  Step %d/%d: %s\n", i+1, len(workflow.Steps), step.Name)
		
		stepResult := a.executeStep(step)
		result.Steps = append(result.Steps, stepResult)
		
		if !stepResult.Success && !step.ContinueOnError {
			result.Success = false
			result.Error = stepResult.Error
			break
		}
	}
	
	result.EndTime = time.Now()
	result.Duration = result.EndTime.Sub(result.StartTime)
	
	if result.Error == nil {
		result.Success = true
	}
	
	workflow.LastRun = result.StartTime
	
	return result, nil
}

// executeStep executes a single workflow step
func (a *AutomationService) executeStep(step WorkflowStep) StepResult {
	startTime := time.Now()
	
	// Prepare command
	cmd := exec.Command(step.Command, step.Args...)
	
	// Set working directory
	if step.WorkingDir != "" {
		cmd.Dir = step.WorkingDir
	} else {
		cmd.Dir = a.projectPath
	}
	
	// Set environment variables
	cmd.Env = os.Environ()
	for key, value := range step.Environment {
		cmd.Env = append(cmd.Env, fmt.Sprintf("%s=%s", key, value))
	}
	
	// Execute command
	output, err := cmd.CombinedOutput()
	
	return StepResult{
		StepName: step.Name,
		Success:  err == nil,
		Output:   string(output),
		Error:    err,
		Duration: time.Since(startTime),
	}
}

// ListWorkflows returns all available workflows
func (a *AutomationService) ListWorkflows() []*Workflow {
	workflows := make([]*Workflow, 0, len(a.workflows))
	for _, workflow := range a.workflows {
		workflows = append(workflows, workflow)
	}
	return workflows
}

// GetWorkflow returns a workflow by name
func (a *AutomationService) GetWorkflow(name string) (*Workflow, error) {
	workflow, exists := a.workflows[name]
	if !exists {
		return nil, fmt.Errorf("workflow '%s' not found", name)
	}
	return workflow, nil
}

// DeleteWorkflow removes a workflow
func (a *AutomationService) DeleteWorkflow(name string) error {
	if _, exists := a.workflows[name]; !exists {
		return fmt.Errorf("workflow '%s' not found", name)
	}
	
	delete(a.workflows, name)
	
	// Remove workflow file
	workflowPath := filepath.Join(a.projectPath, ".k3ss-ai", "workflows", name+".yaml")
	return os.Remove(workflowPath)
}

// saveWorkflow saves a workflow to disk
func (a *AutomationService) saveWorkflow(workflow *Workflow) error {
	workflowDir := filepath.Join(a.projectPath, ".k3ss-ai", "workflows")
	if err := os.MkdirAll(workflowDir, 0755); err != nil {
		return fmt.Errorf("failed to create workflow directory: %w", err)
	}
	
	// TODO: Implement YAML serialization
	workflowPath := filepath.Join(workflowDir, workflow.Name+".yaml")
	content := a.serializeWorkflow(workflow)
	
	return os.WriteFile(workflowPath, []byte(content), 0644)
}

// serializeWorkflow converts workflow to YAML format
func (a *AutomationService) serializeWorkflow(workflow *Workflow) string {
	var content strings.Builder
	
	content.WriteString(fmt.Sprintf("name: %s\n", workflow.Name))
	content.WriteString(fmt.Sprintf("description: %s\n", workflow.Description))
	content.WriteString("trigger:\n")
	content.WriteString(fmt.Sprintf("  type: %s\n", workflow.Trigger.Type))
	if workflow.Trigger.Pattern != "" {
		content.WriteString(fmt.Sprintf("  pattern: %s\n", workflow.Trigger.Pattern))
	}
	
	content.WriteString("steps:\n")
	for _, step := range workflow.Steps {
		content.WriteString(fmt.Sprintf("  - name: %s\n", step.Name))
		content.WriteString(fmt.Sprintf("    command: %s\n", step.Command))
		if len(step.Args) > 0 {
			content.WriteString("    args:\n")
			for _, arg := range step.Args {
				content.WriteString(fmt.Sprintf("      - %s\n", arg))
			}
		}
		if step.ContinueOnError {
			content.WriteString("    continue_on_error: true\n")
		}
	}
	
	return content.String()
}

// LoadWorkflows loads all workflows from disk
func (a *AutomationService) LoadWorkflows() error {
	workflowDir := filepath.Join(a.projectPath, ".k3ss-ai", "workflows")
	
	// Check if workflow directory exists
	if _, err := os.Stat(workflowDir); os.IsNotExist(err) {
		return nil // No workflows to load
	}
	
	// Read workflow files
	files, err := os.ReadDir(workflowDir)
	if err != nil {
		return fmt.Errorf("failed to read workflow directory: %w", err)
	}
	
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".yaml") {
			workflowPath := filepath.Join(workflowDir, file.Name())
			if err := a.loadWorkflowFromFile(workflowPath); err != nil {
				fmt.Printf("Warning: failed to load workflow %s: %v\n", file.Name(), err)
			}
		}
	}
	
	return nil
}

// loadWorkflowFromFile loads a single workflow from file
func (a *AutomationService) loadWorkflowFromFile(path string) error {
	// TODO: Implement YAML deserialization
	// For now, create a placeholder workflow
	name := strings.TrimSuffix(filepath.Base(path), ".yaml")
	
	workflow := &Workflow{
		Name:        name,
		Description: "Loaded from file",
		Trigger:     WorkflowTrigger{Type: "manual"},
		Steps:       []WorkflowStep{},
		Environment: make(map[string]string),
		Created:     time.Now(),
	}
	
	a.workflows[name] = workflow
	return nil
}

// CreatePrebuiltWorkflows creates common automation workflows
func (a *AutomationService) CreatePrebuiltWorkflows() error {
	// Deploy staging workflow
	deployStaging := []WorkflowStep{
		{
			Name:    "Install dependencies",
			Command: "npm",
			Args:    []string{"install"},
		},
		{
			Name:    "Run tests",
			Command: "npm",
			Args:    []string{"test"},
		},
		{
			Name:    "Build application",
			Command: "npm",
			Args:    []string{"run", "build"},
		},
		{
			Name:    "Deploy to staging",
			Command: "npm",
			Args:    []string{"run", "deploy:staging"},
		},
	}
	
	if err := a.CreateWorkflow(
		"deploy-staging",
		"Deploy application to staging environment",
		WorkflowTrigger{Type: "git_hook", Events: []string{"push:main"}},
		deployStaging,
	); err != nil {
		return err
	}
	
	// Code quality check workflow
	qualityCheck := []WorkflowStep{
		{
			Name:    "Lint code",
			Command: "npm",
			Args:    []string{"run", "lint"},
		},
		{
			Name:    "Type check",
			Command: "npm",
			Args:    []string{"run", "type-check"},
		},
		{
			Name:    "Security audit",
			Command: "npm",
			Args:    []string{"audit"},
		},
	}
	
	return a.CreateWorkflow(
		"quality-check",
		"Run code quality and security checks",
		WorkflowTrigger{Type: "git_hook", Events: []string{"pre-commit"}},
		qualityCheck,
	)
}

