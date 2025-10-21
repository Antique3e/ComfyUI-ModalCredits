"""
ComfyUI-ModalCredits
A custom node for tracking Modal GPU credits with battery-style visualization
"""

from .modal_credits_node import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS, WEB_DIRECTORY

# Import routes to register API endpoints
try:
    from . import routes
    print("✅ Modal Credits Monitor: API routes loaded")
except Exception as e:
    print(f"⚠️ Modal Credits Monitor: Failed to load API routes - {e}")

__all__ = ['NODE_CLASS_MAPPINGS', 'NODE_DISPLAY_NAME_MAPPINGS', 'WEB_DIRECTORY']

print("✅ Modal Credits Monitor: Custom node loaded successfully")
