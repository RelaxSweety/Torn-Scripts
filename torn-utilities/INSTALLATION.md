# Torn Utilities (TU) Installation Guide

Install TU Manager first, then install the modules you want individually. The current module catalog and all module installation links are provided inside TU Manager; no separate module list is required.

## Step 1 — Enable custom scripts

1. Open **Torn PDA**.
2. Go to **Settings → Advanced Browser Settings**.
3. Enable **Custom User Scripts**, if necessary.
4. Open **Manage Scripts**.

## Step 2 — Install TU Manager

1. Select **Add New Script** and configure installation from a URL.
2. Copy and paste the TU Manager installation URL:
   
   `https://raw.githubusercontent.com/RelaxSweety/Torn-Scripts/main/torn-utilities/core/pda/torn-utilities.user.js`
3. Tap **Fetch**, then **Load**.
4. Select **OK** or **Authorize** if prompted.
5. Confirm TU Manager is enabled in Manage Scripts.

## Step 3 — Install individual TU modules

**All TU module download links are available directly in TU Manager.**

1. Return to Torn in the PDA browser and refresh the page.
2. Tap the circular **TU** button.
3. Open **Modules** and browse the current catalog.
4. Select a module, then choose **Copy install URL** (or **Copy update URL** if already loaded).
5. Return to **Settings → Advanced Browser Settings → Manage Scripts**.
6. Select **Add New Script**, paste the copied URL, and tap **Fetch → Load**.
7. Confirm **OK** or **Authorize** if prompted, and enable the script.
8. Repeat for any other modules you want.

TU Manager supplies module links but does **not** automatically install modules.

## Step 4 — Launch and use modules

1. Return to Torn in the PDA browser and refresh.
2. Tap **TU**, then open **Modules**.
3. Select an installed, enabled module to launch it.
4. Close or exit the module when finished.
5. Tap **TU** again to return to the module dashboard.

## Step 5 — Update scripts

1. Go to **Settings → Advanced Browser Settings → Manage Scripts**.
2. Select TU Manager or the module to update.
3. Use the available update/reload option to fetch the latest script version.
4. Return to Torn and refresh.

## Troubleshooting

- **TU button missing:** Verify TU Manager is enabled in Manage Scripts and refresh Torn.
- **Module shows Not Loaded:** Install that module separately, enable it, then refresh Torn.
- **Module does not launch:** Verify it is enabled and compatible with your installed TU Manager.
- **Duplicate buttons or unexpected behavior:** Disable outdated or duplicate scripts, including the old combined arcade script if using separate Flight Game and Stick Fighter modules.

---

Created by **RelaxSweety [4539436]**.
