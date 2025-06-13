# K3SS AI Coder CLI - Quick Start Guide

## Installation

### Binary Installation (Recommended)
```bash
# Download the latest release
curl -L https://github.com/k3ss-official/k3ss-ai-coder/releases/latest/download/k3ss-ai-linux-amd64 -o k3ss-ai

# Make executable
chmod +x k3ss-ai

# Move to PATH
sudo mv k3ss-ai /usr/local/bin/
```

### Build from Source
```bash
# Clone the repository
git clone https://github.com/k3ss-official/k3ss-ai-coder.git
cd k3ss-ai-coder/task-3-cli-automation

# Build the CLI
go build -o k3ss-ai ./cmd/

# Install globally
sudo mv k3ss-ai /usr/local/bin/
```

## Initial Setup

### 1. Initialize Configuration
```bash
# Create default configuration
k3ss-ai config init

# View current configuration
k3ss-ai config show
```

### 2. Configure AI Service
```bash
# Set AI service endpoint
k3ss-ai config set ai.endpoint "http://localhost:8080"

# Set API key (if required)
k3ss-ai config set ai.api_key "your-api-key"
```

### 3. Initialize Workflows
```bash
# Create prebuilt automation workflows
k3ss-ai workflow init
```

## Basic Usage Examples

### Interactive Chat
```bash
# Start interactive chat session
k3ss-ai chat --interactive

# Single message with file context
k3ss-ai chat --file main.go "explain this code"

# Quick help
k3ss-ai chat "how do I optimize this function?"
```

### Code Generation
```bash
# Generate React component
k3ss-ai generate component UserProfile --framework react --typescript

# Generate API endpoints
k3ss-ai generate api user-service --methods GET,POST,PUT,DELETE

# Generate tests for existing code
k3ss-ai generate test main.go --type unit

# Scaffold new project
k3ss-ai generate scaffold react-app --name my-app --ai-enhanced
```

### Code Analysis
```bash
# Analyze code for security issues
k3ss-ai analyze code src/ --security

# Performance analysis
k3ss-ai analyze code main.go --performance

# Comprehensive analysis
k3ss-ai analyze code . --security --performance --quality --format json
```

### Code Refactoring
```bash
# Extract method refactoring
k3ss-ai refactor pattern "extract method" utils.js --target calculateTotal

# Optimize code for performance
k3ss-ai refactor optimize src/ --performance

# Rename variables
k3ss-ai refactor pattern "rename variable" main.go --target oldName --new newName
```

### Code Review
```bash
# Review git diff
k3ss-ai review diff HEAD~1..HEAD

# Review specific branch
k3ss-ai review branch feature/new-api --checklist security,performance

# Review single file
k3ss-ai review file main.go --style strict
```

## Git Integration

### Intelligent Commit Messages
```bash
# Stage changes first
git add .

# Generate and create commit with AI analysis
k3ss-ai git commit --analyze

# Preview commit message without committing
k3ss-ai git commit --analyze --preview

# Use specific commit style
k3ss-ai git commit --analyze --style conventional
```

### Git Status and Review
```bash
# Enhanced git status
k3ss-ai git status

# Review staged changes
k3ss-ai git review

# Review specific diff range
k3ss-ai git review HEAD~3..HEAD
```

## Build System Integration

### Build Execution and Analysis
```bash
# Run build with AI analysis
k3ss-ai build run --analyze

# Use custom build command
k3ss-ai build run --command "npm run build:prod" --analyze

# Attempt automatic fixes for build failures
k3ss-ai build run --fix

# Analyze build system without running
k3ss-ai build analyze
```

## Pipeline Management

### Pipeline Detection and Optimization
```bash
# Detect existing CI/CD pipeline
k3ss-ai pipeline detect

# Generate GitHub Actions workflow
k3ss-ai pipeline generate github-actions

# Generate GitLab CI configuration
k3ss-ai pipeline generate gitlab-ci

# Generate Jenkins pipeline
k3ss-ai pipeline generate jenkins
```

## Automation Workflows

### Workflow Management
```bash
# List available workflows
k3ss-ai workflow list

# Create custom workflow
k3ss-ai workflow create deploy-staging \
  --description "Deploy to staging environment" \
  --trigger git_hook \
  --steps "npm install" "npm test" "npm run build" "npm run deploy:staging"

# Execute workflow
k3ss-ai workflow run deploy-staging

# Initialize with prebuilt workflows
k3ss-ai workflow init
```

### Batch Operations
```bash
# Add tests to all JavaScript files
k3ss-ai batch run add-tests --pattern "*.js" --recursive

# Format all TypeScript files
k3ss-ai batch run format --pattern "*.ts" --recursive

# Lint and fix all files
k3ss-ai batch run lint-fix --pattern "src/**/*.js"

# Dry run to see what would be processed
k3ss-ai batch run add-tests --pattern "*.js" --dry-run
```

## Advanced Usage

### Configuration Management
```bash
# Set specific configuration values
k3ss-ai config set git.auto_commit true
k3ss-ai config set build.command "yarn build"
k3ss-ai config set settings.output_format json

# View configuration
k3ss-ai config show
```

### Combining Commands with Shell
```bash
# Pipe analysis results to other tools
k3ss-ai analyze code src/ --format json | jq '.security_issues'

# Use in shell scripts
if k3ss-ai build run --analyze; then
  echo "Build successful"
  k3ss-ai workflow run deploy-staging
else
  echo "Build failed, checking for fixes"
  k3ss-ai build run --fix
fi
```

### Integration with Git Hooks
```bash
# Pre-commit hook example
#!/bin/sh
# .git/hooks/pre-commit

# Run quality checks
k3ss-ai analyze code --security --performance
if [ $? -ne 0 ]; then
  echo "Quality checks failed"
  exit 1
fi

# Generate commit message if none provided
if [ -z "$1" ]; then
  k3ss-ai git commit --analyze
fi
```

## Troubleshooting

### Common Issues

**Command not found**
```bash
# Ensure k3ss-ai is in your PATH
echo $PATH
which k3ss-ai

# If not found, add to PATH or use full path
export PATH=$PATH:/usr/local/bin
```

**Configuration issues**
```bash
# Reset configuration to defaults
rm ~/.k3ss-ai.yaml
k3ss-ai config init

# Check configuration location
k3ss-ai config show
```

**AI service connection issues**
```bash
# Test AI service connectivity
k3ss-ai chat "test connection"

# Check configuration
k3ss-ai config show | grep ai

# Update endpoint if needed
k3ss-ai config set ai.endpoint "http://your-ai-service:8080"
```

**Git integration issues**
```bash
# Ensure you're in a git repository
git status

# Check for staged changes
git diff --cached

# Verify git configuration
git config --list
```

### Debug Mode
```bash
# Enable debug output for troubleshooting
k3ss-ai --debug command-name

# Enable verbose output
k3ss-ai --verbose command-name
```

## Tips and Best Practices

### Workflow Optimization
- Use `--dry-run` flags to preview operations before execution
- Combine multiple operations in workflows for efficiency
- Use batch operations for repetitive tasks across multiple files
- Set up git hooks for automated quality checks

### Performance Tips
- Use caching by running similar commands multiple times
- Leverage batch operations instead of individual file processing
- Configure appropriate AI service timeouts for your network
- Use specific file patterns to limit scope of operations

### Integration Patterns
- Combine CLI commands with existing shell scripts
- Use JSON output format for integration with other tools
- Set up workflows for common development tasks
- Configure git hooks for automated assistance

### Security Considerations
- Store API keys in configuration files with appropriate permissions
- Use environment variables for sensitive configuration in CI/CD
- Regularly update the CLI to get latest security improvements
- Review generated code and suggestions before applying

## Getting Help

### Built-in Help
```bash
# General help
k3ss-ai --help

# Command-specific help
k3ss-ai generate --help
k3ss-ai workflow create --help

# Subcommand help
k3ss-ai generate component --help
```

### Community and Support
- GitHub Issues: Report bugs and request features
- Documentation: Comprehensive guides and API reference
- Examples: Sample workflows and integration patterns
- Community: Share tips and best practices

This quick start guide covers the essential functionality of the K3SS AI Coder CLI. For more detailed information, refer to the comprehensive documentation and integration guides.

