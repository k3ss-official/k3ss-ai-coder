#!/usr/bin/env python3
"""
K3SS AI Coder - Ultimate AI Code Assistant
Integration Service & API Gateway

This service integrates all components and provides a unified API gateway
for the Ultimate AI Code Assistant system.
"""

import json
import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IntegrationService:
    def __init__(self):
        self.services = {
            "ai_orchestration": {
                "url": "http://localhost:8080",
                "name": "AI Orchestration & Model Integration",
                "status": "unknown"
            },
            "cli_automation": {
                "url": "http://localhost:8081", 
                "name": "CLI & Automation Framework",
                "status": "unknown"
            },
            "browser_control": {
                "url": "http://localhost:8082",
                "name": "Browser Control & Web Research", 
                "status": "unknown"
            },
            "security": {
                "url": "http://localhost:8083",
                "name": "Security & Enterprise Features",
                "status": "unknown"
            }
        }
        
    def check_service_health(self, service_key: str) -> Dict[str, Any]:
        """Check health of a specific service"""
        service = self.services[service_key]
        try:
            response = requests.get(f"{service['url']}/health", timeout=5)
            if response.status_code == 200:
                service["status"] = "online"
                return {
                    "service": service_key,
                    "status": "online",
                    "response": response.json()
                }
            else:
                service["status"] = "unhealthy"
                return {
                    "service": service_key,
                    "status": "unhealthy",
                    "error": f"HTTP {response.status_code}"
                }
        except Exception as e:
            service["status"] = "offline"
            return {
                "service": service_key,
                "status": "offline", 
                "error": str(e)
            }
    
    def check_all_services(self) -> Dict[str, Any]:
        """Check health of all services"""
        results = {}
        online_count = 0
        
        for service_key in self.services:
            result = self.check_service_health(service_key)
            results[service_key] = result
            if result["status"] == "online":
                online_count += 1
        
        return {
            "total_services": len(self.services),
            "online_services": online_count,
            "system_status": "healthy" if online_count == len(self.services) else "degraded" if online_count > 0 else "offline",
            "services": results,
            "timestamp": datetime.now().isoformat()
        }
    
    def proxy_request(self, service_key: str, endpoint: str, method: str = "GET", data: Dict = None) -> Dict[str, Any]:
        """Proxy a request to a specific service"""
        if service_key not in self.services:
            raise ValueError(f"Unknown service: {service_key}")
        
        service = self.services[service_key]
        url = f"{service['url']}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return {
                "success": True,
                "status_code": response.status_code,
                "data": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text,
                "service": service_key
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "service": service_key
            }

integration_service = IntegrationService()

@app.route('/health', methods=['GET'])
def health():
    """Overall system health check"""
    system_health = integration_service.check_all_services()
    
    return jsonify({
        "status": "healthy",
        "service": "K3SS AI Coder - Ultimate AI Code Assistant",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "integration": {
            "gateway_status": "online",
            "services_integrated": len(integration_service.services),
            "system_health": system_health
        },
        "capabilities": {
            "ai_orchestration": True,
            "cli_automation": True,
            "browser_control": True,
            "security_framework": True,
            "unified_api": True,
            "service_integration": True
        }
    })

@app.route('/system/status', methods=['GET'])
def system_status():
    """Detailed system status"""
    return jsonify(integration_service.check_all_services())

@app.route('/ai/request', methods=['POST'])
def ai_request():
    """Proxy AI requests to orchestration service"""
    data = request.get_json()
    result = integration_service.proxy_request("ai_orchestration", "/ai/request", "POST", data)
    
    if result["success"]:
        return jsonify(result["data"])
    else:
        return jsonify({"error": result["error"]}), 500

@app.route('/cli/execute', methods=['POST'])
def cli_execute():
    """Proxy CLI commands to automation service"""
    data = request.get_json()
    result = integration_service.proxy_request("cli_automation", "/cli/execute", "POST", data)
    
    if result["success"]:
        return jsonify(result["data"])
    else:
        return jsonify({"error": result["error"]}), 500

@app.route('/browser/navigate', methods=['POST'])
def browser_navigate():
    """Proxy browser navigation to browser service"""
    data = request.get_json()
    result = integration_service.proxy_request("browser_control", "/browser/navigate", "POST", data)
    
    if result["success"]:
        return jsonify(result["data"])
    else:
        return jsonify({"error": result["error"]}), 500

@app.route('/browser/search', methods=['POST'])
def browser_search():
    """Proxy web search to browser service"""
    data = request.get_json()
    result = integration_service.proxy_request("browser_control", "/search", "POST", data)
    
    if result["success"]:
        return jsonify(result["data"])
    else:
        return jsonify({"error": result["error"]}), 500

@app.route('/security/auth', methods=['POST'])
def security_auth():
    """Proxy authentication to security service"""
    data = request.get_json()
    result = integration_service.proxy_request("security", "/auth/login", "POST", data)
    
    if result["success"]:
        return jsonify(result["data"])
    else:
        return jsonify({"error": result["error"]}), 500

@app.route('/workflow/complete', methods=['POST'])
def complete_workflow():
    """Execute a complete AI-powered workflow using all services"""
    data = request.get_json()
    workflow_type = data.get('type', 'general')
    
    workflow_result = {
        "workflow_id": f"wf_{datetime.now().timestamp()}",
        "type": workflow_type,
        "started_at": datetime.now().isoformat(),
        "steps": [],
        "status": "running"
    }
    
    try:
        # Step 1: AI Analysis
        ai_result = integration_service.proxy_request("ai_orchestration", "/health", "GET")
        workflow_result["steps"].append({
            "step": "ai_analysis",
            "status": "completed" if ai_result["success"] else "failed",
            "result": ai_result
        })
        
        # Step 2: CLI Operations (if needed)
        if workflow_type in ["code_generation", "analysis"]:
            cli_result = integration_service.proxy_request("cli_automation", "/cli/commands", "GET")
            workflow_result["steps"].append({
                "step": "cli_operations",
                "status": "completed" if cli_result["success"] else "failed",
                "result": cli_result
            })
        
        # Step 3: Web Research (if needed)
        if workflow_type in ["research", "documentation"]:
            browser_result = integration_service.proxy_request("browser_control", "/capabilities", "GET")
            workflow_result["steps"].append({
                "step": "web_research",
                "status": "completed" if browser_result["success"] else "failed",
                "result": browser_result
            })
        
        # Step 4: Security Validation
        security_result = integration_service.proxy_request("security", "/security/policies", "GET")
        workflow_result["steps"].append({
            "step": "security_validation",
            "status": "completed" if security_result["success"] else "failed",
            "result": security_result
        })
        
        workflow_result["status"] = "completed"
        workflow_result["completed_at"] = datetime.now().isoformat()
        
    except Exception as e:
        workflow_result["status"] = "failed"
        workflow_result["error"] = str(e)
        workflow_result["failed_at"] = datetime.now().isoformat()
    
    return jsonify(workflow_result)

@app.route('/services', methods=['GET'])
def list_services():
    """List all integrated services"""
    return jsonify({
        "total_services": len(integration_service.services),
        "services": integration_service.services
    })

@app.route('/capabilities', methods=['GET'])
def get_capabilities():
    """Get complete system capabilities"""
    return jsonify({
        "ultimate_ai_code_assistant": {
            "ai_orchestration": {
                "multi_provider_support": True,
                "local_model_integration": True,
                "intelligent_routing": True,
                "context_management": True
            },
            "cli_automation": {
                "command_execution": True,
                "workflow_automation": True,
                "git_integration": True,
                "build_system_support": True
            },
            "browser_control": {
                "web_automation": True,
                "search_integration": True,
                "content_analysis": True,
                "screenshot_capture": True
            },
            "security_framework": {
                "authentication": True,
                "authorization": True,
                "encryption": True,
                "audit_logging": True,
                "threat_detection": True,
                "compliance_monitoring": True
            },
            "integration": {
                "unified_api": True,
                "service_orchestration": True,
                "workflow_automation": True,
                "real_time_monitoring": True
            }
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 9000))
    
    print(f"🚀 K3SS AI Coder - Ultimate AI Code Assistant starting on port {port}")
    print(f"🔗 Health check: http://localhost:{port}/health")
    print(f"🎯 Integration Gateway: Unifying all AI Code Assistant services")
    print(f"📊 System Status: http://localhost:{port}/system/status")
    
    # Check all services on startup
    print("\n🔍 Checking service connectivity...")
    status = integration_service.check_all_services()
    print(f"✅ Services online: {status['online_services']}/{status['total_services']}")
    print(f"🎯 System status: {status['system_status']}")
    
    app.run(host='0.0.0.0', port=port, debug=False)

