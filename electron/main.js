const { app, BrowserWindow, screen, ipcMain, Menu } = require("electron");
const path = require("path");
const net = require("net");
const http = require("http");
const { fork } = require("child_process");

const DEV_URL = process.env.ELECTRON_APP_URL || "http://localhost:3001";
let appUrl = DEV_URL;
let serverProcess = null;

const ICON_SIZE = 56;
const ICON_MARGIN = 16;
const MINI_WIDTH = 360;
const MINI_HEIGHT = 560;
const FULL_WIDTH = 900;
const FULL_HEIGHT = 680;

const HOVER_POLL_MS = 120;
const INITIAL_GRACE_MS = 1000;

let win;
let currentState = "icon";
let hovering = true;
let hoverPollTimer = null;

function getIconBounds() {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: workArea.x + ICON_MARGIN,
    y: workArea.y + workArea.height - ICON_MARGIN - ICON_SIZE,
    width: ICON_SIZE,
    height: ICON_SIZE,
  };
}

function getMiniBounds() {
  const { workArea } = screen.getPrimaryDisplay();
  return {
    x: workArea.x + ICON_MARGIN,
    y: workArea.y + workArea.height - ICON_MARGIN - MINI_HEIGHT,
    width: MINI_WIDTH,
    height: Math.min(MINI_HEIGHT, workArea.height - 40),
  };
}

function getFullBounds() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = Math.min(FULL_WIDTH, workArea.width);
  const height = Math.min(FULL_HEIGHT, workArea.height - 40);
  return {
    x: workArea.x + Math.round((workArea.width - width) / 2),
    y: workArea.y + workArea.height - height,
    width,
    height,
  };
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function waitForServer(url, timeoutMs = 20_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function poll() {
      http
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on("error", () => {
          if (Date.now() - start > timeoutMs) reject(new Error("Bundled server did not start in time"));
          else setTimeout(poll, 200);
        });
    })();
  });
}

// The production build (packaged app) has no `next dev` server to point at —
// it bundles a standalone Next.js server (see scripts/prepare-standalone.mjs)
// and runs it via Electron's embedded Node (ELECTRON_RUN_AS_NODE) on a free
// local port instead.
async function startProductionServer() {
  const port = await getFreePort();
  const serverPath = path.join(process.resourcesPath, "standalone", "server", "server.js");

  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      RHYTHM_MAP_SEARCH_DATA_DIR: app.getPath("userData"),
      ELECTRON_RUN_AS_NODE: "1",
    },
    stdio: "pipe",
  });
  serverProcess.stdout?.on("data", (d) => console.log(`[server] ${d}`.trim()));
  serverProcess.stderr?.on("data", (d) => console.error(`[server] ${d}`.trim()));

  const url = `http://127.0.0.1:${port}`;
  await waitForServer(url);
  return url;
}

function setAppMenu() {
  // Frameless windows still need a real app menu on macOS — it's what wires Cmd+C/Cmd+V/etc.
  // to text inputs even though there's no visible menu bar on the window itself.
  const template = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  win = new BrowserWindow({
    ...getIconBounds(),
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    show: false,
    backgroundColor: "#00000000",
    transparent: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Disable HTTP caching entirely so a relaunch always shows the current dev server
  // output — otherwise Chromium's disk cache (persisted across relaunches via the
  // profile dir) can keep serving a stale bundle even after a fresh navigation.
  // Follow the user across Spaces/desktops instead of staying pinned to the one
  // it was opened on — including full-screen Spaces, which are excluded by default.
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  win.webContents.session.clearCache().then(() => {
    win.loadURL(appUrl, { extraHeaders: "pragma: no-cache\ncache-control: no-cache\n" });
  });
  win.once("ready-to-show", () => win.show());

  // Brief grace period so the icon is visible right after launch instead of
  // vanishing instantly if the cursor isn't already sitting on top of it.
  hovering = true;
  currentState = "icon";
  setTimeout(startHoverPolling, INITIAL_GRACE_MS);
}

function setWindowState(bounds, { transparent }) {
  if (!win) return;
  win.setBackgroundColor(transparent ? "#00000000" : "#0a0a0a");
  win.setBounds(bounds, true);
}

function isCursorOverWindow() {
  if (!win) return false;
  const { x, y } = screen.getCursorScreenPoint();
  const bounds = win.getBounds();
  return x >= bounds.x && x < bounds.x + bounds.width && y >= bounds.y && y < bounds.y + bounds.height;
}

// Ground truth for "is the mouse over the app" comes from the OS cursor position
// vs. the window's actual bounds — not DOM mouseenter/leave/mouseout, which don't
// reliably fire for frameless/transparent Chromium windows. Polling here in the
// main process (rather than in the renderer) means it works regardless of what's
// rendered or whether the page has focus.
function startHoverPolling() {
  if (hoverPollTimer) clearInterval(hoverPollTimer);
  hoverPollTimer = setInterval(() => {
    if (!win) return;
    const isOver = isCursorOverWindow();
    if (isOver === hovering) return;
    hovering = isOver;
    if (!hovering && currentState !== "icon") {
      setWindowState(getIconBounds(), { transparent: true });
      currentState = "icon";
    }
    win.webContents.send("dock:hover", hovering);
  }, HOVER_POLL_MS);
}

ipcMain.handle("dock:icon", () => {
  currentState = "icon";
  setWindowState(getIconBounds(), { transparent: true });
});
ipcMain.handle("dock:mini", () => {
  currentState = "mini";
  setWindowState(getMiniBounds(), { transparent: true });
});
ipcMain.handle("dock:full", () => {
  currentState = "full";
  setWindowState(getFullBounds(), { transparent: true });
});

app.whenReady().then(async () => {
  setAppMenu();
  if (app.isPackaged) {
    try {
      appUrl = await startProductionServer();
    } catch (err) {
      console.error("Failed to start the bundled server:", err);
      app.quit();
      return;
    }
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  serverProcess?.kill();
});
