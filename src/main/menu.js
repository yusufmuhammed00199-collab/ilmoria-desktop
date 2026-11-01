'use strict';
/** The app menu (the menu bar on macOS; on Windows its shortcuts, with the bar shown by Alt). */
const { app, Menu, shell } = require('electron');
const { state, actions } = require('./state');
const { APP_NAME, isMac, origin, asset, L } = require('./util');
const { showNote } = require('./notify');

function buildMenu() {
  const devTools = !app.isPackaged || process.env.ILMORIA_DEVTOOLS === '1';
  const checkNow = async () => {
    try {
      const u = await actions.checkUpdate(true);
      showNote({
        id: 'update',
        title: u ? L('updateReady', { v: u.version }) : L('latest'),
        body: !u ? `${APP_NAME} ${app.getVersion()}` : u.ready ? L('updateRestart') : u.url ? L('updateBody') : L('updateDownloading'),
        onClick: u?.ready ? () => actions.installUpdate() : u?.url ? () => void shell.openExternal(u.url) : undefined,
      });
    } catch {
      showNote({ id: 'update', title: L('updateFailed'), body: L('updateFailedBody') });
    }
  };
  const template = [
    ...(isMac
      ? [
          {
            label: APP_NAME,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { label: L('settings'), accelerator: 'Cmd+,', click: () => actions.openSettings() },
              { label: L('schoolAddress'), click: () => actions.openSetup() },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { label: L('quit'), accelerator: 'Cmd+Q', click: () => actions.quit() },
            ],
          },
        ]
      : [
          {
            label: L('file'),
            submenu: [
              { label: L('settings'), accelerator: 'Ctrl+,', click: () => actions.openSettings() },
              { label: L('schoolAddress'), click: () => actions.openSetup() },
              { type: 'separator' },
              { label: L('closeWindow'), accelerator: 'Ctrl+W', click: () => state.win?.close() },
              { label: L('quit'), accelerator: 'Ctrl+Q', click: () => actions.quit() },
            ],
          },
        ]),
    { role: 'editMenu' },
    {
      label: L('view'),
      submenu: [
        { label: L('back'), accelerator: isMac ? 'Cmd+[' : 'Alt+Left', click: () => state.win?.webContents.navigationHistory.goBack() },
        { label: L('forward'), accelerator: isMac ? 'Cmd+]' : 'Alt+Right', click: () => state.win?.webContents.navigationHistory.goForward() },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        ...(devTools ? [{ role: 'toggleDevTools' }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
    {
      role: 'help',
      submenu: [
        { label: L('openInBrowser'), click: () => void shell.openExternal(`${origin()}/dashboard`) },
        { label: L('checkUpdates'), click: () => void checkNow() },
        ...(!isMac ? [{ type: 'separator' }, { label: L('about'), click: () => app.showAboutPanel() }] : []),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: app.getVersion(),
    copyright: `© ${new Date().getFullYear()} Ilmoria`,
    website: 'https://ilmoria.com',
    iconPath: asset('icon.png'),
  });
}

module.exports = { buildMenu };
