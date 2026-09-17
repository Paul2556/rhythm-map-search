const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  toIcon: () => ipcRenderer.invoke("dock:icon"),
  toMini: () => ipcRenderer.invoke("dock:mini"),
  toFull: () => ipcRenderer.invoke("dock:full"),
  onHoverChange: (cb) => {
    const listener = (_event, hovering) => cb(hovering);
    ipcRenderer.on("dock:hover", listener);
    return () => ipcRenderer.removeListener("dock:hover", listener);
  },
});
