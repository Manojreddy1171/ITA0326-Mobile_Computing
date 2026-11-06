# OMNeT++ Installation Guide (Windows 10 / 11)

A step-by-step installation and configuration guide for OMNeT++ discrete event simulation environment and INET Framework on Windows.

---

## 📋 Prerequisites
- 64-bit Windows 10 or Windows 11
- At least 5 GB free disk space
- No spaces or non-ASCII characters in target directory paths

---

## 🚀 Step 1: Download OMNeT++
1. Open Google Chrome or your preferred browser.
2. Visit the official OMNeT++ download page:
   👉 [https://omnetpp.org/download/](https://omnetpp.org/download/)
3. Download the latest Windows package archive (e.g., `omnetpp-6.x.x-windows-x86_64.zip`).

> [!NOTE]
> The Windows archive is self-contained: it includes the MinGW/GCC toolchain, MSYS2 bash environment, Python, and the Eclipse-based IDE.

---

## 📂 Step 2: Extract the ZIP Archive
1. Open your **Downloads** folder and locate the downloaded `.zip` file.
2. Right-click the `.zip` file and select **Extract All...**.
3. Set the destination path to a simple directory without spaces, e.g.:
   ```plaintext
   C:\omnetpp
   ```

> [!WARNING]
> Do **NOT** extract OMNeT++ to directories with spaces (such as `C:\Program Files` or inside `OneDrive`), as build tools (`make` and `gcc`) will fail.

---

## ⚙️ Step 3: Launch MinGW Shell
1. Navigate to your extracted OMNeT++ directory (e.g., `C:\omnetpp`).
2. Double-click the file named:
   ```cmd
   mingwenv.cmd
   ```
3. A terminal window with an MSYS2 shell will open. Allow it a few moments to initialize the environment variables.

---

## 🔨 Step 4: Configure and Build
In the `mingwenv` terminal, run the following commands in sequence:

1. **Run Configuration:**
   ```bash
   ./configure
   ```
   *Verify that all mandatory checks pass successfully.*

2. **Compile OMNeT++:**
   ```bash
   make
   ```
   *(Optional acceleration: use `make -j$(nproc)` to utilize all available CPU cores).*

---

## 💻 Step 5: Open OMNeT++ IDE
Once the build completes:
1. In the `mingwenv` terminal, launch the IDE by running:
   ```bash
   omnetpp
   ```
   *(Or double-click `omnetpp.exe` in the root folder).*
2. Select your preferred workspace location when prompted.
3. The OMNeT++ IDE will launch.

---

## 📡 Step 6: Install INET Framework (Optional / Recommended)
To simulate mobile computing and networking protocols (TCP/IP, UDP, 802.11 Wi-Fi, MANET, Routing):
1. In the OMNeT++ IDE menu, navigate to:
   **Help ➔ Install Simulation Models...**
2. Select **INET Framework**.
3. Follow the on-screen prompts and select **Build automatically**.
