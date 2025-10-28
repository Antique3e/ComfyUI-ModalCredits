/**
 * ComfyUI Credit Tracker
 * Simple UI extension to track Modal GPU credits with animated color bar
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// ========================================
// COLOR CONFIGURATION (CRYSTOOLS STYLE - ONLY 2 COLORS)
// ========================================
const COLORS = {
    BACKGROUND: '#222222',
    START: '#236692',
    END: '#DC2626',
    TEXT: '#ffffff'
};
// ========================================

class CreditTracker {
    constructor() {
        this.config = null;
        this.balance = null;
        this.gpuType = null;
        this.gpuCount = 1;
        this.costPerSecond = 0;  // CHANGED: Now includes GPU + CPU + Memory
        this.lastUpdate = Date.now();
        this.displayElement = null;
        this.sliderElement = null;
        this.containerElement = null;
        
        // NEW: Store CPU and Memory info for display
        this.cpuCores = 0;
        this.memoryGB = 0;
        this.gpuCostPerHour = 0;
        this.cpuCostPerHour = 0;
        this.memoryCostPerHour = 0;
        
        this.init();
    }

    async init() {
        await this.loadConfig();
        await this.loadBalance();
        await this.detectGPU();  // CHANGED: Now also detects CPU and Memory
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
                    gpu_count: 1,
                    cpu_cost_per_core_per_hour: 0.04,
                    memory_cost_per_gb_per_hour: 0.008
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
                const info = await response.json();
                
                // GPU detection (existing logic)
                this.gpuType = info.gpu_name;
                this.gpuCount = this.config.gpu_count;
                
                let gpuCostPerHour = 1.0;
                for (const [gpuName, cost] of Object.entries(this.config.gpu_costs_per_hour)) {
                    if (this.gpuType.includes(gpuName) || gpuName.includes(this.gpuType)) {
                        gpuCostPerHour = cost;
                        break;
                    }
                }
                this.gpuCostPerHour = gpuCostPerHour * this.gpuCount;
                
                // NEW: CPU and Memory detection (same approach as GPU)
                this.cpuCores = info.cpu_cores || 0;
                this.memoryGB = this.config.memory_gb_allocated || 16;
                
                this.cpuCostPerHour = this.config.cpu_cost_per_core_per_hour * this.cpuCores;
                this.memoryCostPerHour = this.config.memory_cost_per_gb_per_hour * this.memoryGB;
                
                // CHANGED: Total cost per second = GPU + CPU + Memory
                const totalCostPerHour = this.gpuCostPerHour + this.cpuCostPerHour + this.memoryCostPerHour;
                this.costPerSecond = totalCostPerHour / 3600;
                
                console.log(`✅ Credit Tracker: GPU detected - ${this.gpuType} @ $${this.gpuCostPerHour.toFixed(2)}/hr`);
                console.log(`✅ Credit Tracker: CPU detected - ${this.cpuCores} cores @ $${this.cpuCostPerHour.toFixed(4)}/hr`);
                console.log(`✅ Credit Tracker: Memory detected - ${this.memoryGB.toFixed(2)} GB @ $${this.memoryCostPerHour.toFixed(4)}/hr`);
                console.log(`✅ Credit Tracker: Total cost - $${totalCostPerHour.toFixed(4)}/hr`);
            }
        } catch (error) {
            console.error('❌ Credit Tracker: Detection failed', error);
            this.gpuType = "Unknown";
            this.costPerSecond = (1.0 / 3600) * this.gpuCount;
        }
    }

    createDisplay() {
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
        
        this.sliderElement = slider;
        this.containerElement = container;
        
        container.onclick = () => this.showDetails();
        
        container.onmouseenter = () => {
            container.style.opacity = '0.8';
        };
        container.onmouseleave = () => {
            container.style.opacity = '1';
        };
        
        this.updateDisplay();
        
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
                    console.log('✅ Credit Tracker: Display added to header');
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

    updateDisplay() {
        if (this.displayElement && this.sliderElement) {
            const balance = this.balance.remaining_balance;
            const percentage = (balance / this.config.starting_balance) * 100;
            
            this.displayElement.textContent = `$${balance.toFixed(2)}`;
            this.sliderElement.style.width = `${percentage}%`;
            
            const redAmount = 100 - percentage;
            this.sliderElement.style.backgroundColor = 
                `color-mix(in srgb, ${COLORS.END} ${redAmount}%, ${COLORS.START})`;
        }
    }

    startTracking() {
        // NO CHANGES: Same tracking logic, just uses updated costPerSecond
        setInterval(() => {
            const now = Date.now();
            const elapsed = (now - this.lastUpdate) / 1000;
            
            const cost = this.costPerSecond * elapsed;
            this.balance.remaining_balance = Math.max(0, this.balance.remaining_balance - cost);
            this.balance.last_updated = new Date().toISOString();
            
            this.updateDisplay();
            
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
        const totalCostPerHour = this.gpuCostPerHour + this.cpuCostPerHour + this.memoryCostPerHour;
        const hoursRemaining = balance > 0 ? (balance / totalCostPerHour).toFixed(2) : '0.00';
        
        // CHANGED: Updated to show GPU, CPU, Memory breakdown
        const message = `
💠 Credit Tracker Details
━━━━━━━━━━━━━━━━━━━━━━━━
💠 Remaining: $${balance.toFixed(2)}
📌 GPU: ${this.gpuType}
📌 CPU: ${this.cpuCores} cores
📌 Memory: ${this.memoryGB.toFixed(2)} GB
━━━━━━━━━━━━━━━━━━━━━━━━
💠 Total Cost: $${totalCostPerHour.toFixed(4)}/hour
⏳ Time Remaining: ${hoursRemaining} hours
        `.trim();
        
        alert(message);
    }
}

app.registerExtension({
    name: "comfyui.credit.tracker",
    async setup() {
        new CreditTracker();
        console.log('✅ Credit Tracker: Extension loaded');
    }
});
