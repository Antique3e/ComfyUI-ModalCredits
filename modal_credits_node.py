"""
ComfyUI-ModalCredits - A custom node for tracking Modal GPU credits
"""

import os
import json
import time
import subprocess
from datetime import datetime
import folder_paths

# GPU pricing per hour (in USD) - Update these based on your Modal pricing
GPU_COSTS = {
    "A10G": 1.10,
    "A100-40GB": 3.00,
    "A100-80GB": 4.00,
    "H100": 8.00,
    "T4": 0.60,
    "L4": 0.80,
    "L40S": 2.50,
    "UNKNOWN": 1.00  # Default fallback
}

class ModalCreditsMonitor:
    """Monitor Modal GPU credits and display in ComfyUI header"""
    
    def __init__(self):
        self.data_file = os.path.join(folder_paths.get_output_directory(), "modal_credits_data.json")
        self.load_data()
        self.gpu_type = self.detect_gpu()
        self.cost_per_second = GPU_COSTS.get(self.gpu_type, GPU_COSTS["UNKNOWN"]) / 3600
        self.last_update = time.time()
        
    def detect_gpu(self):
        """Detect the GPU type being used"""
        try:
            # Try nvidia-smi first
            result = subprocess.run(
                ['nvidia-smi', '--query-gpu=name', '--format=csv,noheader'],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                gpu_name = result.stdout.strip().upper()
                
                # Map GPU names to our pricing tiers
                if "A10G" in gpu_name or "A10" in gpu_name:
                    return "A10G"
                elif "A100" in gpu_name:
                    if "80" in gpu_name:
                        return "A100-80GB"
                    else:
                        return "A100-40GB"
                elif "H100" in gpu_name:
                    return "H100"
                elif "T4" in gpu_name:
                    return "T4"
                elif "L4" in gpu_name:
                    return "L4"
                elif "L40S" in gpu_name or "L40" in gpu_name:
                    return "L40S"
                    
        except Exception as e:
            print(f"GPU detection failed: {e}")
        
        return "UNKNOWN"
    
    def load_data(self):
        """Load saved credit data from file"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r') as f:
                    data = json.load(f)
                    self.initial_credits = data.get('initial_credits', 80.0)
                    self.credits_used = data.get('credits_used', 0.0)
                    self.session_start = data.get('session_start', time.time())
                    self.modal_token = data.get('modal_token', self.get_modal_token())
                    
                    # Check if token changed - reset if different
                    current_token = self.get_modal_token()
                    if current_token and current_token != self.modal_token:
                        print("Modal token changed - resetting credits")
                        self.reset_credits()
                    
            except Exception as e:
                print(f"Error loading credits data: {e}")
                self.reset_credits()
        else:
            self.reset_credits()
    
    def get_modal_token(self):
        """Get current Modal token from environment or config"""
        try:
            # Try to get Modal token from environment
            token = os.environ.get('MODAL_TOKEN_ID', '')
            if not token:
                # Try to read from Modal config
                modal_config = os.path.expanduser('~/.modal.toml')
                if os.path.exists(modal_config):
                    with open(modal_config, 'r') as f:
                        content = f.read()
                        # Simple parsing - might need adjustment based on actual format
                        for line in content.split('\n'):
                            if 'token_id' in line:
                                token = line.split('=')[1].strip().strip('"\'')
                                break
            return token
        except Exception as e:
            print(f"Error getting Modal token: {e}")
            return ""
    
    def reset_credits(self):
        """Reset credit tracking"""
        self.initial_credits = 80.0
        self.credits_used = 0.0
        self.session_start = time.time()
        self.modal_token = self.get_modal_token()
        self.save_data()
    
    def save_data(self):
        """Save credit data to file"""
        try:
            data = {
                'initial_credits': self.initial_credits,
                'credits_used': self.credits_used,
                'session_start': self.session_start,
                'modal_token': self.modal_token,
                'last_save': datetime.now().isoformat()
            }
            with open(self.data_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving credits data: {e}")
    
    def update_credits(self):
        """Update credit usage based on elapsed time"""
        current_time = time.time()
        elapsed = current_time - self.last_update
        
        # Calculate credits used in this interval
        credits_this_interval = elapsed * self.cost_per_second
        self.credits_used += credits_this_interval
        self.last_update = current_time
        
        # Save every 10 seconds to avoid too frequent writes
        if int(current_time) % 10 == 0:
            self.save_data()
    
    def get_remaining_credits(self):
        """Get remaining credits"""
        self.update_credits()
        return max(0, self.initial_credits - self.credits_used)
    
    def get_battery_percentage(self):
        """Get battery percentage (0-100)"""
        return int((self.get_remaining_credits() / self.initial_credits) * 100)
    
    def get_status_info(self):
        """Get comprehensive status information"""
        remaining = self.get_remaining_credits()
        percentage = self.get_battery_percentage()
        
        return {
            'remaining_credits': round(remaining, 2),
            'used_credits': round(self.credits_used, 2),
            'initial_credits': self.initial_credits,
            'percentage': percentage,
            'gpu_type': self.gpu_type,
            'cost_per_hour': GPU_COSTS.get(self.gpu_type, GPU_COSTS["UNKNOWN"]),
            'session_duration': time.time() - self.session_start
        }


# Global instance
_monitor_instance = None

def get_monitor():
    """Get or create monitor instance"""
    global _monitor_instance
    if _monitor_instance is None:
        _monitor_instance = ModalCreditsMonitor()
    return _monitor_instance


class ModalCreditsNode:
    """ComfyUI node for Modal credits monitoring"""
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "initial_credits": ("FLOAT", {
                    "default": 80.0,
                    "min": 0.0,
                    "max": 10000.0,
                    "step": 0.01,
                    "display": "number"
                }),
                "reset_credits": ("BOOLEAN", {"default": False}),
            },
            "optional": {
                "gpu_override": (["AUTO"] + list(GPU_COSTS.keys()), {"default": "AUTO"}),
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("status",)
    FUNCTION = "monitor_credits"
    CATEGORY = "utils"
    OUTPUT_NODE = True
    
    def monitor_credits(self, initial_credits, reset_credits, gpu_override="AUTO"):
        monitor = get_monitor()
        
        # Handle reset
        if reset_credits:
            monitor.initial_credits = initial_credits
            monitor.reset_credits()
        
        # Handle GPU override
        if gpu_override != "AUTO":
            monitor.gpu_type = gpu_override
            monitor.cost_per_second = GPU_COSTS.get(gpu_override, GPU_COSTS["UNKNOWN"]) / 3600
        
        # Get status
        status = monitor.get_status_info()
        
        status_text = (
            f"💰 Modal Credits Status\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"💵 Remaining: ${status['remaining_credits']:.2f}\n"
            f"📊 Used: ${status['used_credits']:.2f}\n"
            f"🔋 Battery: {status['percentage']}%\n"
            f"🎮 GPU: {status['gpu_type']}\n"
            f"💲 Cost: ${status['cost_per_hour']:.2f}/hour\n"
            f"⏱️  Session: {status['session_duration'] / 3600:.2f} hours"
        )
        
        return (status_text,)


# Node registration
NODE_CLASS_MAPPINGS = {
    "ModalCreditsNode": ModalCreditsNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ModalCreditsNode": "Modal Credits Monitor"
}

# Web extension for header display
WEB_DIRECTORY = "./web"

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']
