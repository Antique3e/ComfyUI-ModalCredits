/**
 * ComfyUI Modal Credits Monitor - Web Extension
 * Place this file in: custom_nodes/ComfyUI-ModalCredits/web/modal_credits.js
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

class ModalCreditsWidget {
    constructor() {
        this.element = null;
        this.batteryIcon = null;
        this.creditsText = null;
        this.updateInterval = null;
        this.init();
    }

    init() {
        // Create the header widget
        this.createElement();
        
        // Add to header
        this.addToHeader();
        
        // Start update loop
        this.startUpdating();
        
        // Add styles
        this.addStyles();
    }

    createElement() {
        // Main container
        this.element = document.createElement('div');
        this.element.id = 'modal-credits-widget';
        this.element.className = 'modal-credits-container';
        
        // Battery icon container
        const batteryContainer = document.createElement('div');
        batteryContainer.className = 'battery-container';
        batteryContainer.title = 'Click for details';
        batteryContainer.onclick = () => this.showDetails();
        
        // Battery outer shell
        const batteryShell = document.createElement('div');
        batteryShell.className = 'battery-shell';
        
        // Battery fill (the colored part)
        this.batteryFill = document.createElement('div');
        this.batteryFill.className = 'battery-fill';
        this.batteryFill.style.width = '80%';
        
        // Battery tip
        const batteryTip = document.createElement('div');
        batteryTip.className = 'battery-tip';
        
        // Credits text
        this.creditsText = document.createElement('span');
        this.creditsText.className = 'credits-text';
        this.creditsText.textContent = '$80.00';
        
        // Assemble battery
        batteryShell.appendChild(this.batteryFill);
        batteryContainer.appendChild(batteryShell);
        batteryContainer.appendChild(batteryTip);
        
        // Assemble widget
        this.element.appendChild(batteryContainer);
        this.element.appendChild(this.creditsText);
    }

    addToHeader() {
        // Wait for DOM to be ready
        const addToDOM = () => {
            const menuBar = document.querySelector('.comfy-menu') || 
                           document.querySelector('.comfyui-menu') ||
                           document.querySelector('#queue-button')?.parentElement;
            
            if (menuBar) {
                menuBar.appendChild(this.element);
            } else {
                // If menu not found, append to body as fallback
                document.body.appendChild(this.element);
                this.element.style.position = 'fixed';
                this.element.style.top = '10px';
                this.element.style.right = '10px';
                this.element.style.zIndex = '9999';
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addToDOM);
        } else {
            setTimeout(addToDOM, 100);
        }
    }

    async updateCredits() {
        try {
            // Fetch credit status from backend
            const response = await api.fetchApi('/modal_credits/status');
            if (response.ok) {
                const data = await response.json();
                this.updateDisplay(data);
            }
        } catch (error) {
            console.error('Failed to update Modal credits:', error);
        }
    }

    updateDisplay(data) {
        const percentage = data.percentage || 0;
        const remaining = data.remaining_credits || 0;
        
        // Update battery fill
        this.batteryFill.style.width = `${percentage}%`;
        
        // Update color based on percentage
        if (percentage > 50) {
            this.batteryFill.style.backgroundColor = '#4ade80'; // green
        } else if (percentage > 20) {
            this.batteryFill.style.backgroundColor = '#fbbf24'; // yellow
        } else {
            this.batteryFill.style.backgroundColor = '#ef4444'; // red
        }
        
        // Update text
        this.creditsText.textContent = `$${remaining.toFixed(2)}`;
        
        // Add warning pulse if low
        if (percentage <= 20) {
            this.element.classList.add('low-credits');
        } else {
            this.element.classList.remove('low-credits');
        }
        
        // Store data for details view
        this.currentData = data;
    }

    showDetails() {
        if (!this.currentData) return;
        
        const data = this.currentData;
        const hours = (data.session_duration / 3600).toFixed(2);
        
        const message = `
💰 Modal Credits Details
━━━━━━━━━━━━━━━━━━━━━━━━
💵 Remaining: $${data.remaining_credits.toFixed(2)}
📊 Used: $${data.used_credits.toFixed(2)}
💳 Initial: $${data.initial_credits.toFixed(2)}
🔋 Battery: ${data.percentage}%

🎮 GPU: ${data.gpu_type}
💲 Cost: $${data.cost_per_hour.toFixed(2)}/hour
⏱️  Session: ${hours} hours

🧮 Estimated time remaining:
   ${data.remaining_credits > 0 ? (data.remaining_credits / data.cost_per_hour).toFixed(2) + ' hours' : 'Out of credits!'}
        `.trim();
        
        alert(message);
    }

    startUpdating() {
        // Update immediately
        this.updateCredits();
        
        // Then update every second
        this.updateInterval = setInterval(() => {
            this.updateCredits();
        }, 1000);
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .modal-credits-container {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px 12px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 6px;
                margin-left: 8px;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .modal-credits-container:hover {
                background: rgba(0, 0, 0, 0.5);
            }
            
            .battery-container {
                display: flex;
                align-items: center;
                gap: 1px;
            }
            
            .battery-shell {
                width: 30px;
                height: 14px;
                border: 2px solid #fff;
                border-radius: 3px;
                padding: 1px;
                background: rgba(255, 255, 255, 0.1);
                position: relative;
                overflow: hidden;
            }
            
            .battery-fill {
                height: 100%;
                background-color: #4ade80;
                border-radius: 1px;
                transition: width 0.5s ease, background-color 0.5s ease;
            }
            
            .battery-tip {
                width: 3px;
                height: 8px;
                background: #fff;
                border-radius: 0 2px 2px 0;
            }
            
            .credits-text {
                color: #fff;
                font-size: 13px;
                font-weight: 600;
                font-family: monospace;
                min-width: 50px;
                text-align: right;
            }
            
            .low-credits {
                animation: pulse-red 2s infinite;
            }
            
            @keyframes pulse-red {
                0%, 100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.6;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize when ComfyUI is ready
app.registerExtension({
    name: "ModalCredits.Widget",
    async setup() {
        // Create widget instance
        new ModalCreditsWidget();
    }
});

// Add API endpoint handler
api.addEventListener("status", ({detail}) => {
    // Handle any status updates if needed
});

console.log("Modal Credits Monitor loaded");
