#!/bin/bash

# K3SS AI Coder CLI Installation Script
# This script installs the K3SS AI CLI on Linux, macOS, and Windows (via WSL/Git Bash)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/k3ss-official/k3ss-ai-coder"
BINARY_NAME="k3ss-ai"
INSTALL_DIR="/usr/local/bin"

# Detect OS and architecture
detect_platform() {
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    local arch=$(uname -m)
    
    case $os in
        linux*)
            OS="linux"
            ;;
        darwin*)
            OS="darwin"
            ;;
        mingw*|msys*|cygwin*)
            OS="windows"
            ;;
        *)
            echo -e "${RED}Unsupported operating system: $os${NC}"
            exit 1
            ;;
    esac
    
    case $arch in
        x86_64|amd64)
            ARCH="amd64"
            ;;
        arm64|aarch64)
            ARCH="arm64"
            ;;
        armv7l)
            ARCH="arm"
            ;;
        *)
            echo -e "${RED}Unsupported architecture: $arch${NC}"
            exit 1
            ;;
    esac
    
    PLATFORM="${OS}-${ARCH}"
    echo -e "${BLUE}Detected platform: $PLATFORM${NC}"
}

# Check if running as root (for system-wide installation)
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        echo -e "${YELLOW}Running as root - installing system-wide${NC}"
        INSTALL_DIR="/usr/local/bin"
    else
        echo -e "${YELLOW}Running as user - installing to user directory${NC}"
        INSTALL_DIR="$HOME/.local/bin"
        mkdir -p "$INSTALL_DIR"
        
        # Add to PATH if not already there
        if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
            echo -e "${YELLOW}Adding $INSTALL_DIR to PATH${NC}"
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
            echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc 2>/dev/null || true
        fi
    fi
}

# Download and install binary
install_binary() {
    local download_url="${REPO_URL}/releases/latest/download/${BINARY_NAME}-${PLATFORM}"
    local temp_file="/tmp/${BINARY_NAME}"
    
    echo -e "${BLUE}Downloading K3SS AI CLI...${NC}"
    
    if command -v curl >/dev/null 2>&1; then
        curl -L "$download_url" -o "$temp_file"
    elif command -v wget >/dev/null 2>&1; then
        wget "$download_url" -O "$temp_file"
    else
        echo -e "${RED}Error: curl or wget is required to download the binary${NC}"
        exit 1
    fi
    
    # Make executable
    chmod +x "$temp_file"
    
    # Move to install directory
    if [[ $EUID -eq 0 ]]; then
        mv "$temp_file" "$INSTALL_DIR/$BINARY_NAME"
    else
        mv "$temp_file" "$INSTALL_DIR/$BINARY_NAME"
    fi
    
    echo -e "${GREEN}K3SS AI CLI installed to $INSTALL_DIR/$BINARY_NAME${NC}"
}

# Build from source (fallback)
build_from_source() {
    echo -e "${YELLOW}Binary not available for $PLATFORM, building from source...${NC}"
    
    # Check for Go
    if ! command -v go >/dev/null 2>&1; then
        echo -e "${RED}Go is required to build from source${NC}"
        echo -e "${BLUE}Install Go from: https://golang.org/dl/${NC}"
        exit 1
    fi
    
    # Check for Git
    if ! command -v git >/dev/null 2>&1; then
        echo -e "${RED}Git is required to clone the repository${NC}"
        exit 1
    fi
    
    local temp_dir="/tmp/k3ss-ai-build"
    rm -rf "$temp_dir"
    
    echo -e "${BLUE}Cloning repository...${NC}"
    git clone "$REPO_URL" "$temp_dir"
    
    echo -e "${BLUE}Building CLI...${NC}"
    cd "$temp_dir/task-3-cli-automation"
    go build -o "$BINARY_NAME" ./cmd/
    
    # Install binary
    if [[ $EUID -eq 0 ]]; then
        mv "$BINARY_NAME" "$INSTALL_DIR/"
    else
        mv "$BINARY_NAME" "$INSTALL_DIR/"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    echo -e "${GREEN}K3SS AI CLI built and installed successfully${NC}"
}

# Initialize configuration
init_config() {
    echo -e "${BLUE}Initializing configuration...${NC}"
    
    # Create config directory
    local config_dir="$HOME/.k3ss-ai"
    mkdir -p "$config_dir"
    
    # Initialize default configuration
    if command -v "$BINARY_NAME" >/dev/null 2>&1; then
        "$BINARY_NAME" config init
        echo -e "${GREEN}Configuration initialized${NC}"
    else
        echo -e "${YELLOW}Please run '$BINARY_NAME config init' after adding to PATH${NC}"
    fi
}

# Verify installation
verify_installation() {
    echo -e "${BLUE}Verifying installation...${NC}"
    
    if command -v "$BINARY_NAME" >/dev/null 2>&1; then
        local version=$("$BINARY_NAME" --version 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✓ K3SS AI CLI installed successfully${NC}"
        echo -e "${GREEN}✓ Version: $version${NC}"
        echo -e "${GREEN}✓ Location: $(which $BINARY_NAME)${NC}"
        return 0
    else
        echo -e "${RED}✗ Installation verification failed${NC}"
        echo -e "${YELLOW}You may need to restart your shell or run: source ~/.bashrc${NC}"
        return 1
    fi
}

# Show post-installation instructions
show_instructions() {
    echo -e "\n${GREEN}🎉 Installation completed successfully!${NC}\n"
    
    echo -e "${BLUE}Quick Start:${NC}"
    echo -e "  1. Initialize configuration: ${YELLOW}$BINARY_NAME config init${NC}"
    echo -e "  2. Start interactive chat: ${YELLOW}$BINARY_NAME chat --interactive${NC}"
    echo -e "  3. Get help: ${YELLOW}$BINARY_NAME --help${NC}"
    
    echo -e "\n${BLUE}Common Commands:${NC}"
    echo -e "  • Generate code: ${YELLOW}$BINARY_NAME generate component MyComponent${NC}"
    echo -e "  • Analyze code: ${YELLOW}$BINARY_NAME analyze code src/${NC}"
    echo -e "  • Git integration: ${YELLOW}$BINARY_NAME git commit --analyze${NC}"
    echo -e "  • Build analysis: ${YELLOW}$BINARY_NAME build run --analyze${NC}"
    echo -e "  • Create workflows: ${YELLOW}$BINARY_NAME workflow init${NC}"
    
    echo -e "\n${BLUE}Documentation:${NC}"
    echo -e "  • README: ${YELLOW}$REPO_URL/blob/main/task-3-cli-automation/README.md${NC}"
    echo -e "  • Integration Guide: ${YELLOW}$REPO_URL/blob/main/task-3-cli-automation/INTEGRATION.md${NC}"
    
    if ! command -v "$BINARY_NAME" >/dev/null 2>&1; then
        echo -e "\n${YELLOW}⚠️  Note: You may need to restart your shell or run:${NC}"
        echo -e "   ${YELLOW}source ~/.bashrc${NC}"
        echo -e "   ${YELLOW}export PATH=\"$INSTALL_DIR:\$PATH\"${NC}"
    fi
}

# Main installation function
main() {
    echo -e "${BLUE}K3SS AI Coder CLI Installation Script${NC}"
    echo -e "${BLUE}=====================================${NC}\n"
    
    detect_platform
    check_permissions
    
    # Try to install binary, fallback to building from source
    if install_binary 2>/dev/null; then
        echo -e "${GREEN}Binary installation successful${NC}"
    else
        echo -e "${YELLOW}Binary installation failed, trying source build...${NC}"
        build_from_source
    fi
    
    init_config
    
    if verify_installation; then
        show_instructions
    else
        echo -e "\n${RED}Installation completed but verification failed${NC}"
        echo -e "${YELLOW}Please check your PATH and try running: $BINARY_NAME --help${NC}"
    fi
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "K3SS AI Coder CLI Installation Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --version, -v  Show version information"
        echo "  --force        Force reinstallation"
        echo ""
        echo "This script will:"
        echo "  1. Detect your platform (OS and architecture)"
        echo "  2. Download the appropriate binary or build from source"
        echo "  3. Install to /usr/local/bin (as root) or ~/.local/bin (as user)"
        echo "  4. Initialize default configuration"
        echo "  5. Verify the installation"
        exit 0
        ;;
    --version|-v)
        echo "K3SS AI Coder CLI Installation Script v1.0.0"
        exit 0
        ;;
    --force)
        echo -e "${YELLOW}Force reinstallation requested${NC}"
        rm -f "$INSTALL_DIR/$BINARY_NAME" 2>/dev/null || true
        ;;
esac

# Check if already installed (unless force flag is used)
if [[ "${1:-}" != "--force" ]] && command -v "$BINARY_NAME" >/dev/null 2>&1; then
    echo -e "${YELLOW}K3SS AI CLI is already installed at: $(which $BINARY_NAME)${NC}"
    echo -e "${BLUE}Current version: $($BINARY_NAME --version 2>/dev/null || echo 'unknown')${NC}"
    echo -e "${YELLOW}Use --force to reinstall${NC}"
    exit 0
fi

# Run main installation
main

