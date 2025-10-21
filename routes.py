"""
API routes for Modal Credits Monitor
Place this in: custom_nodes/ComfyUI-ModalCredits/routes.py
"""

import server
from aiohttp import web
from .modal_credits_node import get_monitor

@server.PromptServer.instance.routes.get("/modal_credits/status")
async def get_credits_status(request):
    """Get current credit status"""
    try:
        monitor = get_monitor()
        status = monitor.get_status_info()
        return web.json_response(status)
    except Exception as e:
        return web.json_response(
            {"error": str(e)},
            status=500
        )

@server.PromptServer.instance.routes.post("/modal_credits/reset")
async def reset_credits(request):
    """Reset credit tracking"""
    try:
        data = await request.json()
        initial_credits = data.get('initial_credits', 80.0)
        
        monitor = get_monitor()
        monitor.initial_credits = initial_credits
        monitor.reset_credits()
        
        return web.json_response({
            "success": True,
            "message": "Credits reset successfully"
        })
    except Exception as e:
        return web.json_response(
            {"error": str(e)},
            status=500
        )

@server.PromptServer.instance.routes.post("/modal_credits/set_initial")
async def set_initial_credits(request):
    """Set initial credits amount"""
    try:
        data = await request.json()
        amount = data.get('amount', 80.0)
        
        monitor = get_monitor()
        monitor.initial_credits = amount
        monitor.save_data()
        
        return web.json_response({
            "success": True,
            "message": f"Initial credits set to ${amount}"
        })
    except Exception as e:
        return web.json_response(
            {"error": str(e)},
            status=500
        )
