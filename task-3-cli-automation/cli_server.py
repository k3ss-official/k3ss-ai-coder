#!/usr/bin/env python3
"""
K3SS AI CLI Automation Service
HTTP wrapper for the k3ss-ai CLI binary
"""

import json
import subprocess
import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import logging

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CLI_BINARY = "./k3ss-ai"

def check_cli_available():
    """Check if the k3ss-ai binary is available and executable"""
    try:
        result = subprocess.run([CLI_BINARY, "--help"], 
                              capture_output=True, text=True, timeout=10)
        return result.returncode == 0, result.stdout
    except Exception as e:
        logger.error(f"CLI check failed: {e}")
        return False, str(e)

def execute_cli_command(args, workdir=None):
    """Execute a k3ss-ai command and return the result"""
    try:
        cmd = [CLI_BINARY] + args
        logger.info(f"Executing: {' '.join(cmd)}")
        
        result = subprocess.run(cmd, 
                              capture_output=True, 
                              text=True, 
                              timeout=30,
                              cwd=workdir)
        
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None,
            "command": ' '.join(cmd),
            "returncode": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "output": "",
            "error": "Command timed out after 30 seconds",
            "command": ' '.join(cmd),
            "returncode": -1
        }
    except Exception as e:
        return {
            "success": False,
            "output": "",
            "error": str(e),
            "command": ' '.join(cmd),
            "returncode": -1
        }

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    cli_available, cli_info = check_cli_available()
    
    # Parse available commands from help output
    commands = []
    if cli_available and "Available Commands:" in cli_info:
        lines = cli_info.split('\n')
        in_commands = False
        for line in lines:
            if "Available Commands:" in line:
                in_commands = True
                continue
            elif in_commands and line.strip() and not line.startswith(' '):
                break
            elif in_commands and line.strip():
                parts = line.strip().split()
                if parts:
                    commands.append(parts[0])
    
    return jsonify({
        "status": "healthy",
        "service": "K3SS AI CLI Automation",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "cli": {
            "available": cli_available,
            "binary": CLI_BINARY,
            "commands": commands,
            "info": cli_info if cli_available else "CLI not available"
        }
    })

@app.route('/cli/execute', methods=['POST'])
def execute_command():
    """Execute a generic CLI command"""
    data = request.get_json()
    if not data or 'command' not in data:
        return jsonify({"error": "Missing 'command' in request"}), 400
    
    command = data['command']
    args = data.get('args', [])
    workdir = data.get('workdir')
    
    # Build full command args
    full_args = [command] + args
    
    result = execute_cli_command(full_args, workdir)
    return jsonify(result)

@app.route('/cli/commands', methods=['GET'])
def list_commands():
    """List available CLI commands"""
    commands = {
        "chat": "Interactive chat with AI assistant",
        "generate": "Generate code, components, and project scaffolding",
        "analyze": "Analyze code for security, performance, and quality issues",
        "git": "Git workflow integration and automation",
        "build": "Build system integration and analysis",
        "review": "AI-powered code review and analysis",
        "refactor": "AI-powered code refactoring",
        "workflow": "Automation workflow management",
        "batch": "Batch operations across multiple files",
        "pipeline": "CI/CD pipeline integration and optimization"
    }
    return jsonify(commands)

@app.route('/cli/chat', methods=['POST'])
def chat():
    """Chat with AI assistant"""
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"error": "Missing 'message' in request"}), 400
    
    args = ["chat", data['message']]
    if 'context' in data:
        args.extend(["--context", data['context']])
    
    result = execute_cli_command(args)
    return jsonify(result)

@app.route('/cli/generate', methods=['POST'])
def generate():
    """Generate code or components"""
    data = request.get_json()
    if not data or 'type' not in data or 'name' not in data:
        return jsonify({"error": "Missing 'type' or 'name' in request"}), 400
    
    args = ["generate", data['type'], data['name']]
    
    if 'description' in data:
        args.extend(["--description", data['description']])
    
    if 'options' in data:
        for key, value in data['options'].items():
            args.extend([f"--{key}", value])
    
    result = execute_cli_command(args)
    return jsonify(result)

@app.route('/cli/analyze', methods=['POST'])
def analyze():
    """Analyze code"""
    data = request.get_json()
    if not data or 'path' not in data:
        return jsonify({"error": "Missing 'path' in request"}), 400
    
    args = ["analyze", data['path']]
    
    if 'types' in data:
        for t in data['types']:
            args.extend(["--type", t])
    
    if 'options' in data:
        args.extend(data['options'])
    
    result = execute_cli_command(args)
    return jsonify(result)

@app.route('/cli/git', methods=['POST'])
def git():
    """Git operations"""
    data = request.get_json()
    if not data or 'action' not in data:
        return jsonify({"error": "Missing 'action' in request"}), 400
    
    args = ["git", data['action']]
    
    if 'message' in data:
        args.extend(["--message", data['message']])
    
    if 'options' in data:
        for key, value in data['options'].items():
            args.extend([f"--{key}", value])
    
    result = execute_cli_command(args)
    return jsonify(result)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8081))
    
    print(f"🚀 K3SS AI CLI Automation Service starting on port {port}")
    print(f"🔗 Health check: http://localhost:{port}/health")
    print(f"📋 CLI binary: {CLI_BINARY}")
    
    # Check if CLI is available on startup
    cli_available, cli_info = check_cli_available()
    if cli_available:
        print("✅ CLI binary is available and ready")
    else:
        print(f"⚠️  CLI binary check failed: {cli_info}")
    
    app.run(host='0.0.0.0', port=port, debug=False)

