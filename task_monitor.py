#!/usr/bin/env python3
"""
K3SS AI Coder - Ultimate AI Code Assistant
Task Monitor & Operator Control System

This is the central command and control system for the Ultimate AI Code Assistant project.
As Task 1 (Operator), this script provides full operational control and monitoring.
"""

import json
import time
import requests
import psutil
import subprocess
import threading
from datetime import datetime
from typing import Dict, List, Any
import sys
import os

class TaskMonitor:
    def __init__(self):
        self.project_root = "/home/ubuntu/k3ss-ai-coder"
        self.status_file = os.path.join(self.project_root, "PROJECT_STATUS.json")
        self.services = {
            "task_2_ai_orchestration": {"port": 8080, "url": "http://localhost:8080", "status": "UNKNOWN"},
            "task_3_cli_automation": {"port": 8081, "url": "http://localhost:8081", "status": "UNKNOWN"},
            "task_4_browser_web": {"port": 8082, "url": "http://localhost:8082", "status": "UNKNOWN"},
            "task_5_security": {"port": 8083, "url": "http://localhost:8083", "status": "UNKNOWN"}
        }
        self.operator_active = True
        self.monitoring_interval = 30  # seconds
        
    def load_project_status(self) -> Dict[str, Any]:
        """Load current project status from JSON file"""
        try:
            with open(self.status_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"❌ Error loading project status: {e}")
            return {}
    
    def save_project_status(self, status: Dict[str, Any]):
        """Save updated project status to JSON file"""
        try:
            with open(self.status_file, 'w') as f:
                json.dump(status, f, indent=2)
        except Exception as e:
            print(f"❌ Error saving project status: {e}")
    
    def check_service_health(self, service_name: str, service_info: Dict[str, Any]) -> str:
        """Check if a service is online and healthy"""
        try:
            response = requests.get(f"{service_info['url']}/health", timeout=5)
            if response.status_code == 200:
                return "ONLINE"
            else:
                return "UNHEALTHY"
        except requests.exceptions.ConnectionError:
            return "OFFLINE"
        except requests.exceptions.Timeout:
            return "TIMEOUT"
        except Exception as e:
            return f"ERROR: {str(e)}"
    
    def check_port_usage(self, port: int) -> bool:
        """Check if a port is in use"""
        for conn in psutil.net_connections():
            if conn.laddr.port == port:
                return True
        return False
    
    def display_operator_banner(self):
        """Display the operator control banner"""
        print("\n" + "="*80)
        print("🚀 K3SS AI CODER - ULTIMATE AI CODE ASSISTANT")
        print("🎯 TASK 1 (OPERATOR) - FULL CONTROL ACTIVATED")
        print("="*80)
        print(f"⏰ Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"📁 Project Root: {self.project_root}")
        print(f"🔄 Monitoring Interval: {self.monitoring_interval}s")
        print("="*80)
    
    def display_service_status(self):
        """Display current status of all services"""
        print("\n📊 SERVICE STATUS REPORT")
        print("-" * 60)
        
        for service_name, service_info in self.services.items():
            port = service_info["port"]
            url = service_info["url"]
            
            # Check port usage
            port_in_use = self.check_port_usage(port)
            
            # Check service health
            health_status = self.check_service_health(service_name, service_info)
            
            # Update service status
            self.services[service_name]["status"] = health_status
            
            # Display status
            status_icon = "✅" if health_status == "ONLINE" else "❌"
            port_icon = "🟢" if port_in_use else "🔴"
            
            print(f"{status_icon} {service_name.upper()}")
            print(f"   📍 URL: {url}")
            print(f"   🔌 Port {port}: {port_icon} {'IN USE' if port_in_use else 'AVAILABLE'}")
            print(f"   💚 Health: {health_status}")
            print()
    
    def display_project_status(self):
        """Display overall project status"""
        status = self.load_project_status()
        
        print("\n🎯 PROJECT STATUS OVERVIEW")
        print("-" * 60)
        
        if "project" in status:
            project = status["project"]
            print(f"📋 Project: {project.get('name', 'Unknown')}")
            print(f"🏷️  Version: {project.get('version', 'Unknown')}")
            print(f"📊 Status: {project.get('status', 'Unknown')}")
            print(f"👤 Operator: {project.get('operator', 'Unknown')}")
        
        if "tasks" in status:
            print(f"\n📝 TASK COMPLETION STATUS")
            for task_id, task_info in status["tasks"].items():
                task_name = task_info.get("name", "Unknown")
                task_status = task_info.get("status", "Unknown")
                progress = task_info.get("progress", 0)
                
                status_icon = "✅" if task_status == "COMPLETED" else "🔄" if "PROGRESS" in task_status else "❌"
                print(f"   {status_icon} {task_id.upper()}: {task_name} ({progress}%)")
                print(f"      Status: {task_status}")
    
    def issue_operator_directives(self):
        """Issue directives to tasks based on current status"""
        status = self.load_project_status()
        
        print("\n🎯 OPERATOR DIRECTIVES")
        print("-" * 60)
        
        # Check which services need attention
        offline_services = []
        for service_name, service_info in self.services.items():
            if service_info["status"] != "ONLINE":
                offline_services.append(service_name)
        
        if offline_services:
            print("🚨 CRITICAL DIRECTIVES:")
            for service in offline_services:
                task_num = service.split("_")[1]
                port = self.services[service]["port"]
                print(f"   📢 TASK {task_num.upper()}: Deploy service on port {port} IMMEDIATELY")
                print(f"   ⏰ DEADLINE: Service must be online within 15 minutes")
        else:
            print("✅ All services are online - proceeding with integration")
        
        # Update status with current timestamp
        if "operator_control" in status:
            status["operator_control"]["last_check"] = datetime.now().isoformat()
            status["operator_control"]["services_online"] = len([s for s in self.services.values() if s["status"] == "ONLINE"])
            status["operator_control"]["services_total"] = len(self.services)
        
        self.save_project_status(status)
    
    def start_monitoring(self):
        """Start the main monitoring loop"""
        self.display_operator_banner()
        
        print("\n🎯 OPERATOR CONTROL INITIATED")
        print("🔄 Starting continuous monitoring...")
        print("📊 Press Ctrl+C to stop monitoring")
        
        try:
            while self.operator_active:
                self.display_service_status()
                self.display_project_status()
                self.issue_operator_directives()
                
                print(f"\n⏳ Next check in {self.monitoring_interval} seconds...")
                print("="*80)
                
                time.sleep(self.monitoring_interval)
                
        except KeyboardInterrupt:
            print("\n\n🛑 OPERATOR CONTROL TERMINATED")
            print("👋 Monitoring stopped by operator")
            self.operator_active = False
        except Exception as e:
            print(f"\n❌ CRITICAL ERROR: {e}")
            print("🚨 Operator control compromised - manual intervention required")

def main():
    """Main entry point for the task monitor"""
    print("🚀 Initializing K3SS AI Coder Task Monitor...")
    
    # Change to project directory
    project_root = "/home/ubuntu/k3ss-ai-coder"
    if os.path.exists(project_root):
        os.chdir(project_root)
        print(f"📁 Changed to project directory: {project_root}")
    else:
        print(f"❌ Project directory not found: {project_root}")
        sys.exit(1)
    
    # Initialize and start monitoring
    monitor = TaskMonitor()
    monitor.start_monitoring()

if __name__ == "__main__":
    main()

