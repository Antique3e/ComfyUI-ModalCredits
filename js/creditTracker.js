/**
 * ComfyUI Credit Tracker - ENHANCED VERSION
 * Tracks Modal GPU + CPU + Memory credits with animated color bar
 * 
 * ✅ CHANGES FROM ORIGINAL:
 * 1. Added CPU/Memory cost properties to constructor
 * 2. Added detectCompute() method (NEW)
 * 3. Modified detectGPU() to store separate costs
 * 4. Added detectCompute() call in init()
 * 5. Enhanced showDetails() with cost breakdown
 * 
 * ⚠️ PRESERVED (NOT CHANGED):
 * - setInterval timing (1000ms)
 * - Save frequency (every 10 seconds)
 * - saveBalance() method
 * - updateDisplay() method
 * - Color bar animation
 * - balance.json format
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
    END: '#EB3B5A',            // Red - No credits (0%)
    TEXT: '#ffffff'            // White text on top of bar
};
// ========================================

//🆕 Modal Pricing Constants
const MODAL_PRICING = {
    CPU_PER_CORE_HOUR: 0.0473,    // $0.0473 per vCPU core per hour
    MEMORY_PER_GB_HOUR: 0.0080     // $0.0080 per GB per hour
};
// ========================================

class CreditTracker {
    constructor() {
        // ===== EXISTING PROPERTIES (UNCHANGED) =====
        this.config = null;
        this.balance = null;
        this.gpuType = null;
        this.gpuCount = 1;
        this.costPerSecond = 0;
        this.lastUpdate = Date.now();
        this.displayElement = null;
        this.sliderElement = null;      // The animated color bar
        this.containerElement = null;   // The main container
        
        // 🆕 NEW PROPERTIES - CPU & Memory tracking
        this.cpuCores = 0;
        this.memoryGB = 0;
        this.gpuCostPerHour = 0;
        this.cpuCostPerHour = 0;
        this.memoryCostPerHour = 0;
        // =========================================
        
        this.init();
    }

    async init() {
        await this.loadConfig();
        await this.loadBalance();
        await this.detectGPU();
        await this.detectCompute();  // 🆕 NEW: Detect CPU & Memory
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
                console.log('⚠️ Credit Tracker: Using default config');
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
                
                // 🆕 CHANGED: Store GPU cost separately (was: this.costPerSecond = ...)
                this.gpuCostPerHour = costPerHour;
                console.log(`✅ GPU: ${this.gpuType} @ $${costPerHour.toFixed(4)}/hr`);
            }
        } catch (error) {
            console.error('❌ Credit Tracker: GPU detection failed', error);
            this.gpuType = "Unknown";
            this.gpuCostPerHour = 1.0;
        }
    }

    // 🆕 NEW METHOD: Detect CPU & Memory (similar to detectGPU)
    async detectCompute() {
        try {
            const response = await api.fetchApi('/credit_tracker/compute_resources');
            if (response.ok) {
                const computeInfo = await response.json();
                this.cpuCores = computeInfo.cpu_cores;
                this.memoryGB = computeInfo.memory_gb;
                
                // Calculate costs using Modal pricing
                this.cpuCostPerHour = this.cpuCores * MODAL_PRICING.CPU_PER_CORE_HOUR;
                this.memoryCostPerHour = this.memoryGB * MODAL_PRICING.MEMORY_PER_GB_HOUR;
                
                console.log(`✅ CPU: ${this.cpuCores} vCPU @ $${this.cpuCostPerHour.toFixed(4)}/hr`);
                console.log(`✅ Memory: ${this.memoryGB} GB @ $${this.memoryCostPerHour.toFixed(4)}/hr`);
            }
        } catch (error) {
            console.error('❌ Compute detection failed, using defaults', error);
            // Fallback to reasonable defaults
            this.cpuCores = 12;
            this.memoryGB = 32.0;
            this.cpuCostPerHour = 12 * MODAL_PRICING.CPU_PER_CORE_HOUR;
            this.memoryCostPerHour = 32.0 * MODAL_PRICING.MEMORY_PER_GB_HOUR;
        }
        
        // 🆕 Calculate total cost per second (GPU + CPU + Memory)
        const totalCostPerHour = (this.gpuCostPerHour + this.cpuCostPerHour + this.memoryCostPerHour) * this.gpuCount;
        this.costPerSecond = totalCostPerHour / 3600;
        
        console.log(`💰 Total: $${totalCostPerHour.toFixed(4)}/hr = $${(this.costPerSecond * 3600).toFixed(6)}/sec`);
    }

    // ===== createDisplay() - UNCHANGED FROM ORIGINAL =====
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
            border-radius: 4px 0 0 4px;
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
                console.warn('⚠️ Credit Tracker: Menu bar not found, retrying...');
                setTimeout(addToHeader, 500);
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addToHeader);
        } else {
            setTimeout(addToHeader, 100);
        }
    }

    // ===== updateDisplay() - UNCHANGED FROM ORIGINAL =====
    updateDisplay() {
        if (this.displayElement && this.sliderElement) {
            const balance = this.balance.remaining_balance;
            const percentage = (balance / this.config.starting_balance) * 100;
            
            // Update text display
            this.displayElement.textContent = `$${balance.toFixed(2)}`;
            
            // Update bar width (shrinks from 100% to 0% as credits decrease)
            this.sliderElement.style.width = `${percentage}%`;
            
            // Color transition (green to red)
            const redAmount = 100 - percentage;
            this.sliderElement.style.backgroundColor = 
                `color-mix(in srgb, ${COLORS.END} ${redAmount}%, ${COLORS.START})`;
        }
    }

    // ===== startTracking() - UNCHANGED FROM ORIGINAL =====
    startTracking() {
        // Update credits every second
        setInterval(() => {
            const now = Date.now();
            const elapsed = (now - this.lastUpdate) / 1000;
            
            // Deduct credits based on total cost (GPU + CPU + Memory)
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

    // ===== saveBalance() - UNCHANGED FROM ORIGINAL =====
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

    // 🆕 ENHANCED: showDetails() with cost breakdown
    showDetails() {
        const balance = this.balance.remaining_balance;
        const startingBalance = this.config.starting_balance;
        const used = startingBalance - balance;
        const percentage = ((balance / startingBalance) * 100).toFixed(1);
        const totalCostPerHour = this.costPerSecond * 3600;
        const hoursRemaining = balance > 0 ? (balance / totalCostPerHour).toFixed(2) : '0.00';
        
        const message = `
💰 Credit Tracker Details
━━━━━━━━━━━━━━━━━━━━━━━━
💵 Remaining: $${balance.toFixed(2)}
📊 Used: $${used.toFixed(2)}
💳 Starting: $${startingBalance.toFixed(2)}
🔋 Percentage: ${percentage}%

🎮 GPU: ${this.gpuType}
🔢 GPU Count: ${this.gpuCount}
💲 GPU Cost: $${this.gpuCostPerHour.toFixed(4)}/hour

💻 CPU: ${this.cpuCores} vCPU cores
💲 CPU Cost: $${this.cpuCostPerHour.toFixed(4)}/hour

🧠 Memory: ${this.memoryGB.toFixed(2)} GB
💲 Memory Cost: $${this.memoryCostPerHour.toFixed(4)}/hour

━━━━━━━━━━━━━━━━━━━━━━━━
💰 TOTAL: $${totalCostPerHour.toFixed(4)}/hour
⏱️  Time Remaining: ${hoursRemaining} hours
        `.trim();
        
        alert(message);
    }
}

// Register the extension with ComfyUI
app.registerExtension({
    name: "comfyui.credit.tracker.enhanced",
    async setup() {
        new CreditTracker();
        console.log('✅ Credit Tracker Enhanced: Extension loaded (with CPU+Memory tracking)');
    }
});
