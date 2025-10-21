# 💰 ComfyUI-ModalCredits

Track your Modal GPU credits in real-time with an iPhone-style battery indicator in the ComfyUI header!

![Battery Icon](https://img.shields.io/badge/Battery-80%25-green) ![Status](https://img.shields.io/badge/Status-Active-brightgreen)

## ✨ Features

- 🔋 **iPhone-style battery indicator** in ComfyUI header
- ⚡ **Real-time credit tracking** - updates every second
- 💾 **Persistent data** - survives server restarts
- 🎮 **Auto GPU detection** - detects A10G, A100, H100, T4, L4, L40S
- 🔄 **Token change detection** - auto-resets when switching Modal accounts
- 🎨 **Color-coded alerts** - Green (>50%), Yellow (20-50%), Red (<20%)
- 📊 **Detailed stats** - Click icon for GPU type, cost/hour, estimated time remaining

## 📦 Installation

### Quick Install (Recommended)

```bash
cd ComfyUI/custom_nodes/
git clone https://github.com/yourusername/ComfyUI-ModalCredits.git
```

Then restart ComfyUI server.

### Manual Install

1. Create directory:
```bash
cd ComfyUI/custom_nodes/
mkdir ComfyUI-ModalCredits
cd ComfyUI-ModalCredits
mkdir web
```

2. Copy these files:
   - `__init__.py`
   - `modal_credits_node.py`
   - `routes.py`
   - `web/modal_credits.js`

3. Restart ComfyUI

## ⚙️ Configuration

### Step 1: Update GPU Costs

Edit `modal_credits_node.py` and update prices to match your Modal plan:

```python
GPU_COSTS = {
    "A10G": 1.10,        # ← Update these
    "A100-40GB": 3.00,
    "A100-80GB": 4.00,
    "H100": 8.00,
    "T4": 0.60,
    "L4": 0.80,
    "L40S": 2.50,
    "UNKNOWN": 1.00
}
```

### Step 2: Set Initial Credits

Default is $80. Change it by:
1. Adding the "Modal Credits Monitor" node to your workflow
2. Setting `initial_credits` parameter
3. Or editing the default in the code

## 🚀 Usage

### After Installation

1. **Start ComfyUI** - Battery icon appears automatically in header
2. **View credits** - See remaining balance next to battery
3. **Click icon** - See detailed breakdown
4. **Monitor usage** - Watch it decrease in real-time

### Node Parameters

- `initial_credits` (default: 80.0) - Your starting credit amount
- `reset_credits` (default: False) - Toggle to reset counter
- `gpu_override` (default: AUTO) - Manual GPU selection if auto-detect fails

### Battery Colors

- 🟢 **Green** - More than 50% remaining (healthy)
- 🟡 **Yellow** - 20-50% remaining (caution)
- 🔴 **Red** - Less than 20% remaining (low, pulses)

## 📊 What You'll See

Click the battery icon to view:
```
💰 Modal Credits Details
━━━━━━━━━━━━━━━━━━━━━━━━
💵 Remaining: $45.50
📊 Used: $34.50
💳 Initial: $80.00
🔋 Battery: 57%

🎮 GPU: A100-40GB
💲 Cost: $3.00/hour
⏱️  Session: 11.50 hours

🧮 Estimated time remaining:
   15.17 hours
```

## 💾 Data Storage

Credits are saved to:
```
ComfyUI/output/modal_credits_data.json
```

This file stores:
- Initial credit amount
- Total credits used
- Session start time
- Modal token ID (for account detection)
- Last save timestamp

## 🔄 Resetting Credits

### Method 1: Using the Node
Add node to workflow → Set `reset_credits` to True → Run

### Method 2: Delete Data File
```bash
rm ComfyUI/output/modal_credits_data.json
```

### Method 3: API Call
```bash
curl -X POST http://localhost:8188/modal_credits/reset \
  -H "Content-Type: application/json" \
  -d '{"initial_credits": 80.0}'
```

## 🔧 Troubleshooting

### Battery icon not showing up?
1. ✅ Check all files are in correct locations
2. ✅ Clear browser cache (Ctrl+Shift+R)
3. ✅ Check browser console for errors (F12)
4. ✅ Restart ComfyUI server completely

### GPU not detected?
1. ✅ Verify nvidia-smi works: `nvidia-smi`
2. ✅ Use `gpu_override` in node settings
3. ✅ Check server console for detection messages

### Credits not saving?
1. ✅ Check permissions on `ComfyUI/output/` directory
2. ✅ Look for `modal_credits_data.json` file
3. ✅ Check server logs for write errors

### Wrong GPU detected?
- Use the `gpu_override` dropdown in the node to manually select

## 📁 File Structure

```
ComfyUI/custom_nodes/ComfyUI-ModalCredits/
├── __init__.py                  # Package initialization
├── modal_credits_node.py        # Main node & credit logic
├── routes.py                    # API endpoints
├── web/
│   └── modal_credits.js         # Web interface & battery UI
└── README.md                    # This file
```

## 🎯 How It Works

1. **GPU Detection**: Uses `nvidia-smi` to detect your GPU
2. **Cost Calculation**: Calculates cost per second based on GPU
3. **Real-time Updates**: Updates every second in the background
4. **Data Persistence**: Saves to JSON file every 10 seconds
5. **Token Detection**: Reads Modal config to detect account changes

## 💡 Pro Tips

- 📌 Update GPU costs monthly to match Modal's pricing
- 👀 Click battery icon regularly to check estimated time remaining
- ⚠️ Set alerts when credits drop below 20%
- 💾 Backup `modal_credits_data.json` to preserve history
- 🔄 Reset credits when you add funds to your Modal account

## 📝 Requirements

- ComfyUI
- Python 3.8+
- NVIDIA GPU (for GPU detection)
- Modal CLI configured (optional, for token detection)

## 🤝 Contributing

Issues and PRs welcome! Feel free to:
- Report bugs
- Suggest features
- Improve documentation
- Add support for more GPUs

## 📄 License

MIT License - Free to use and modify

## ⭐ Support

If this helps you track your Modal credits, give it a star! ⭐

---

**Made with ❤️ for the ComfyUI community**
