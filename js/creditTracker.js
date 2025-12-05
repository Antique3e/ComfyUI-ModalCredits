/**
 * ComfyUI Credit Tracker
 * Simple UI extension to track Modal GPU credits with animated color bar
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// ========================================
// COLOR CONFIGURATION (CRYSTOOLS STYLE - ONLY 2 COLORS)
// ========================================
// Change these values to customize the bar colors
const COLORS = {
    BACKGROUND: '#222222',     // Dark gray background (when no credits)
    START: '#236692',          // Green - Full credits (100%)
    END: '#DC2626',            // Red - No credits (0%)
    TEXT: '#ffffff'            // White text on top of bar
};
// ========================================

class CreditTracker {
    constructor() {
        this.config = null;
        this.balance = null;
        this.gpuType = null;
        this.gpuCount = 1;
        this.costPerSecond = 0;
        this.lastUpdate = Date.now();
        this.displayElement = null;
        this.sliderElement = null;      // The animated color bar
        this.containerElement = null;   // The main container
        
        this.init();
    }

    async init() {
        await this.loadConfig();
        await this.loadBalance();
        await this.detectGPU();
        this.createDisplay();
        this.startTracking();
    }

    async loadConfig() {
        try {
            const response = await api.fetchApi('/credit_tracker/config');
            if (response.ok) {
                this.config = await response.json();
                console.log('✅ Credit Tracker: Config loaded');
            } else {
                this.config = {
                    starting_balance: 80.00,
                    gpu_costs_per_hour: {
                        "NVIDIA H100": 3.95,
                        "NVIDIA A100-SXM4-80GB": 2.50,
                        "NVIDIA A100-SXM4-40GB": 2.10,
                        "NVIDIA A10G": 1.10,
                        "Tesla T4": 0.59
                    },
                    gpu_count: 1
                };
                console.log('⚠ Credit Tracker: Using default config');
            }
        } catch (error) {
            console.error('❌ Credit Tracker: Config load failed', error);
        }
    }

    async loadBalance() {
        try {
            const response = await api.fetchApi('/credit_tracker/balance');
            if (response.ok) {
                this.balance = await response.json();
                console.log('✅ Credit Tracker: Balance loaded');
            } else {
                this.balance = {
                    last_updated: new Date().toISOString(),
                    remaining_balance: this.config.starting_balance
                };
                await this.saveBalance();
                console.log('✅ Credit Tracker: New balance initialized');
            }
        } catch (error) {
            console.error('❌ Credit Tracker: Balance load failed', error);
            this.balance = {
                last_updated: new Date().toISOString(),
                remaining_balance: this.config.starting_balance
            };
        }
    }

    async detectGPU() {
        try {
            const response = await api.fetchApi('/credit_tracker/gpu_info');
            if (response.ok) {
                const gpuInfo = await response.json();
                this.gpuType = gpuInfo.gpu_name;
                this.gpuCount = this.config.gpu_count;
                
                let costPerHour = 1.0;
                for (const [gpuName, cost] of Object.entries(this.config.gpu_costs_per_hour)) {
                    if (this.gpuType.includes(gpuName) || gpuName.includes(this.gpuType)) {
                        costPerHour = cost;
                        break;
                    }
                }
                
                this.costPerSecond = (costPerHour / 3600) * this.gpuCount;
                console.log(✅ Credit Tracker: GPU detected - ${this.gpuType} @ $${costPerHour}/hr);
            }
        } catch (error) {
            console.error('❌ Credit Tracker: GPU detection failed', error);
            this.gpuType = "Unknown";
            this.costPerSecond = (1.0 / 3600) * this.gpuCount;
        }
    }

    // ╔═══════════════════════════════════════════════════════════════════════╗
    // ║ CHANGE #1: COMPLETELY REWRITTEN createDisplay() FUNCTION             ║
    // ║ Added animated color bar with container and slider structure         ║
    // ╚═══════════════════════════════════════════════════════════════════════╝
    createDisplay() {
        // Main container - dark background visible when bar shrinks
        const container = document.createElement('div');
        container.id = 'credit-tracker-display';
        container.style.cssText = `
            background: ${COLORS.BACKGROUND};
            border: none;
            cursor: pointer;
            border-radius: 4px;
            min-width: 65px;
            height: 30px;
            line-height: 1;
            position: relative;
            overflow: hidden;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;   
            padding: 4px 10px;
        `;
        
        // Progress bar slider (the animated color bar)
        // This bar shrinks from right to left as credits decrease
        const slider = document.createElement('div');
        slider.id = 'credit-tracker-slider';
        slider.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            width: 100%;
            background-color: ${COLORS.START};
            transition: width 1.0s ease, background-color 1.0s ease;
            border-radius: 4px;
        `;
        container.appendChild(slider);
        
        // Text label (displays $XX.XX on top of the bar)
        this.displayElement = document.createElement('div');
        this.displayElement.style.cssText = `
            position: relative;
            z-index: 1;
            color: ${COLORS.TEXT};
            font-size: 14px;
            font-weight: 500;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            text-shadow: 0 0 3px rgba(0,0,0,0.5);
        `;
        container.appendChild(this.displayElement);
        
        // Store references
        this.sliderElement = slider;
        this.containerElement = container;
        
        // Click to show details
        container.onclick = () => this.showDetails();
        
        // Hover effect
        container.onmouseenter = () => {
            container.style.opacity = '0.8';
        };
        container.onmouseleave = () => {
            container.style.opacity = '1';
        };
        
        this.updateDisplay();
        
        // Add to header bar
        const addToHeader = () => {
            const menuBar = document.querySelector('.comfyui-menu') || 
                           document.querySelector('.comfy-menu');
            
            if (menuBar) {
                const managerButton = Array.from(menuBar.children).find(el => 
                    el.textContent?.includes('Manager') || 
                    el.id?.includes('manager') ||
                    el.className?.includes('manager')
                );
                if (managerButton) {
                    menuBar.insertBefore(container, managerButton);
                    console.log('✅ Credit Tracker: Display added before Manager');
                } else {
                    menuBar.appendChild(container);
                    console.log('✅ Credit Tracker: Display added to header (Manager not found)');
                }
            } else {
                console.warn('⚠ Credit Tracker: Menu bar not found, retrying...');
                setTimeout(addToHeader, 500);
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addToHeader);
        } else {
            setTimeout(addToHeader, 100);
        }
    }
    // ╔═══════════════════════════════════════════════════════════════════════╗
    // ║ END OF CHANGE #1                                                      ║
    // ╚═══════════════════════════════════════════════════════════════════════╝

    // ╔═══════════════════════════════════════════════════════════════════════╗
    // ║ CHANGE #2: COMPLETELY REWRITTEN updateDisplay() FUNCTION             ║
    // ║ Now uses 2-color blend (green to red) like Crystools temperature bar ║
    // ╚═══════════════════════════════════════════════════════════════════════╝
    
    /* OLD CODE - COMMENTED OUT
    updateDisplay() {
        if (this.displayElement) {
            const balance = this.balance.remaining_balance;
            this.displayElement.textContent = $${balance.toFixed(2)};
        }
    }
    */
    
    // ████████████████ NEW CODE STARTS HERE ████████████████
    updateDisplay() {
        if (this.displayElement && this.sliderElement) {
            const balance = this.balance.remaining_balance;
            const percentage = (balance / this.config.starting_balance) * 100;
            
            // Update text display
            this.displayElement.textContent = $${balance.toFixed(2)};
            
            // Update bar width (shrinks from 100% to 0% as credits decrease)
            this.sliderElement.style.width = ${percentage}%;
            
            // ========================================
            // COLOR TRANSITION LOGIC (CRYSTOOLS STYLE - ONLY 2 COLORS)
            // ========================================
            // Direct blend from GREEN to RED (exactly like Crystools temperature)
            // Uses CSS color-mix() to blend two colors based on percentage
            // 
            // How it works:
            // - 100% credits: color-mix(red 0%, green) = pure green #00ff00
            // - 75% credits: color-mix(red 25%, green) = lime green
            // - 50% credits: color-mix(red 50%, green) = yellow (natural mix)
            // - 25% credits: color-mix(red 75%, green) = orange-red
            // - 0% credits: color-mix(red 100%, green) = pure red #ff0000
            //
            // The redAmount is inverted because:
            // - High credits (100%) = Low red (0%) = Green
            // - Low credits (0%) = High red (100%) = Red
            // ========================================
            
            const redAmount = 100 - percentage; // Inverted: more red as credits decrease
            this.sliderElement.style.backgroundColor = `color-mix(in srgb, ${COLORS.END} ${redAmount}%, ${COLORS.START})`;
        }
    }
    // ████████████████ NEW CODE ENDS HERE ████████████████
    
    // ╔═══════════════════════════════════════════════════════════════════════╗
    // ║ END OF CHANGE #2                                                      ║
    // ╚═══════════════════════════════════════════════════════════════════════╝

    startTracking() {
        // Update credits every second
        setInterval(() => {
            const now = Date.now();
            const elapsed = (now - this.lastUpdate) / 1000;
            
            // Deduct credits based on GPU cost
            const cost = this.costPerSecond * elapsed;
            this.balance.remaining_balance = Math.max(0, this.balance.remaining_balance - cost);
            this.balance.last_updated = new Date().toISOString();
            
            // Update the display
            this.updateDisplay();
            
            // Save to file every 10 seconds
            if (Math.floor(now / 1000) % 10 === 0) {
                this.saveBalance();
            }
            
            this.lastUpdate = now;
        }, 1000);
    }

    async saveBalance() {
        try {
            await api.fetchApi('/credit_tracker/balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.balance)
            });
        } catch (error) {
            console.error('❌ Credit Tracker: Save failed', error);
        }
    }

    showDetails() {
        const balance = this.balance.remaining_balance;
        const startingBalance = this.config.starting_balance;
        const used = startingBalance - balance;
        const percentage = ((balance / startingBalance) * 100).toFixed(1);
        const costPerHour = this.costPerSecond * 3600;
        const hoursRemaining = balance > 0 ? (balance / costPerHour).toFixed(2) : '0.00';
        
        const message = `
💰 Credit Tracker Details
━━━━━━━━━━━━━━━━━━━━━━━━
💵 Remaining: $${balance.toFixed(2)}
📊 Used: $${used.toFixed(2)}
💳 Starting: $${startingBalance.toFixed(2)}
🔋 Percentage: ${percentage}%

🎮 GPU: ${this.gpuType}
🔢 Count: ${this.gpuCount}
💲 Cost: $${costPerHour.toFixed(2)}/hour
⏱  Remaining: ${hoursRemaining} hours
        `.trim();
        
        alert(message);
    }
}

// Register the extension with ComfyUI
app.registerExtension({
    name: "comfyui.credit.tracker",
    async setup() {
        new CreditTracker();
        console.log('✅ Credit Tracker: Extension loaded');
    }
});
