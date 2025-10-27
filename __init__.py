"""
ComfyUI Credit Tracker - ENHANCED VERSION
Adds CPU + Memory cost tracking while keeping ALL existing logic intact
"""

import os
import json
import subprocess
from aiohttp import web
import server

# Export web directory
WEB_DIRECTORY = "./js"

# File paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "config.json")
BALANCE_FILE = os.path.join(SCRIPT_DIR, "balance.json")


def load_config():
    """Load configuration file"""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return None


def load_balance():
    """Load balance file"""
    if os.path.exists(BALANCE_FILE):
        with open(BALANCE_FILE, 'r') as f:
            return json.load(f)
    return None


def save_balance(balance_data):
    """Save balance to file"""
    with open(BALANCE_FILE, 'w') as f:
        json.dump(balance_data, f, indent=2)


def get_gpu_info():
    """Detect GPU using nvidia-smi"""
    try:
        result = subprocess.run(
            ['nvidia-smi', '--query-gpu=name', '--format=csv,noheader'],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            gpu_name = result.stdout.strip()
            return {"gpu_name": gpu_name, "success": True}
    except Exception as e:
        print(f"GPU detection failed: {e}")
    
    return {"gpu_name": "Unknown", "success": False}


# ============================================
# 🆕 NEW FUNCTION: CPU & Memory Detection
# ============================================
def get_compute_resources():
    """
    Detect CPU cores and Memory using psutil
    Similar to get_gpu_info() but for CPU/Memory
    """
    try:
        import psutil
        
        # Detect CPU cores (logical = vCPU count, includes hyper-threading)
        cpu_cores = psutil.cpu_count(logical=True)
        
        # Detect Memory in GB
        memory_bytes = psutil.virtual_memory().total
        memory_gb = round(memory_bytes / (1024**3), 2)
        
        print(f"✅ Compute Resources Detected: {cpu_cores} vCPU, {memory_gb} GB RAM")
        
        return {
            "cpu_cores": cpu_cores,
            "memory_gb": memory_gb,
            "success": True
        }
    except ImportError:
        print("⚠️  psutil not installed, using defaults (12 vCPU, 32 GB)")
        # Fallback to safe defaults if psutil not available
        return {
            "cpu_cores": 12,
            "memory_gb": 32.0,
            "success": False,
            "error": "psutil not installed"
        }
    except Exception as e:
        print(f"⚠️  Compute detection failed: {e}, using defaults")
        return {
            "cpu_cores": 12,
            "memory_gb": 32.0,
            "success": False,
            "error": str(e)
        }


# API Routes (EXISTING - NOT MODIFIED)
@server.PromptServer.instance.routes.get("/credit_tracker/config")
async def get_config(request):
    """Get configuration"""
    config = load_config()
    if config:
        return web.json_response(config)
    return web.json_response({"error": "Config not found"}, status=404)


@server.PromptServer.instance.routes.get("/credit_tracker/balance")
async def get_balance(request):
    """Get current balance"""
    balance = load_balance()
    if balance:
        return web.json_response(balance)
    return web.json_response({"error": "Balance not found"}, status=404)


@server.PromptServer.instance.routes.post("/credit_tracker/balance")
async def update_balance(request):
    """Save balance"""
    try:
        balance_data = await request.json()
        save_balance(balance_data)
        return web.json_response({"success": True})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


@server.PromptServer.instance.routes.get("/credit_tracker/gpu_info")
async def get_gpu(request):
    """Get GPU information"""
    gpu_info = get_gpu_info()
    return web.json_response(gpu_info)


# ============================================
# 🆕 NEW ENDPOINT: Compute Resources
# ============================================
@server.PromptServer.instance.routes.get("/credit_tracker/compute_resources")
async def get_compute(request):
    """Get CPU and Memory information"""
    compute_info = get_compute_resources()
    return web.json_response(compute_info)


@server.PromptServer.instance.routes.post("/credit_tracker/reset")
async def reset_balance(request):
    """Reset balance to starting amount"""
    try:
        config = load_config()
        if not config:
            return web.json_response({"error": "Config not found"}, status=404)
        
        from datetime import datetime
        balance_data = {
            "last_updated": datetime.now().isoformat(),
            "remaining_balance": config.get("starting_balance", 80.0)
        }
        save_balance(balance_data)
        return web.json_response({"success": True, "balance": balance_data})
    except Exception as e:
        return web.json_response({"error": str(e)}, status=500)


print("✅ Credit Tracker: Extension loaded (Enhanced with CPU+Memory tracking)")

__all__ = ['WEB_DIRECTORY']
