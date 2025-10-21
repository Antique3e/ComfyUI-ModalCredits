/**
 * ComfyUI Credit Tracker
 * Simple UI extension to track Modal GPU credits
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

class CreditTracker {
    constructor() {
        this.config = null;
        this.balance = null;
        this.gpuType = null;
        this.gpuCount = 1;
        this.costPerSecond = 0;
        this.lastUpdate = Date.now();
        this.displayElement = null;
        
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
                
                this.costPerSecond = (costPerHour / 3600) * this.gpuCount;
                console.log(`✅ Credit Tracker: GPU detected - ${this.gpuType} @ $${costPerHour}/hr`);
            }
        } catch (error) {
            console.error('❌ Credit Tracker: GPU detection failed', error);
            this.gpuType = "Unknown";
            this.costPerSecond = (1.0 / 3600) * this.gpuCount;
        }
    }

    createDisplay() {
        this.displayElement = document.createElement('button');
        this.displayElement.id = 'credit-tracker-display';
        this.displayElement.className = 'comfyui-button';
        this.displayElement.style.cssText = `
            background: #222;
            border: none;
            color: #ffffff;
            padding: 4px 10px;
            font-size: 14px;
            font-weight: 400;
            font-family: monospace;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s;
            min-width: 55px;
            height: 30px;
            line-height: 30px;
            text-align: center;
        `;
        
        this.displayElement.onclick = () => this.showDetails();
        this.displayElement.onmouseenter = () => {
            this.displayElement.style.background = '#4e4e4e';
        };
        this.displayElement.onmouseleave = () => {
            this.displayElement.style.background = '#222';
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
                    menuBar.insertBefore(this.displayElement, managerButton);
                    console.log('✅ Credit Tracker: Display added before Manager');
                } else {
                    menuBar.appendChild(this.displayElement);
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

    updateDisplay() {
    if (this.displayElement) {
        const balance = this.balance.remaining_balance;
        this.displayElement.textContent = `$${balance.toFixed(2)}`;
        
        const percentage = (balance / this.config.starting_balance) * 100;
        if (percentage > 50) {
            this.displayElement.style.color = '#ffffff';  
        } else if (percentage > 20) {
            this.displayElement.style.color = '#ffaa00';  
        } else {
            this.displayElement.style.color = '#ff4444';  
        }
    }
}

    startTracking() {
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
⏱️  Remaining: ${hoursRemaining} hours
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
