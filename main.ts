import { 
  Plugin, 
  Notice, 
  requestUrl, 
  PluginSettingTab, 
  Setting, 
  App, 
  FuzzySuggestModal, 
  addIcon, 
  ItemView, 
  WorkspaceLeaf 
} from 'obsidian';

interface MyPluginSettings {
  apiKey: string;
  token: string;
  boardId: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  apiKey: '',
  token: '',
  boardId: ''
};

interface TrelloList {
  id: string;
  name: string;
}

const VIEW_TYPE_TRELLO = 'trello-embedded-view';

// Logo SVG personalizado de Trello para la barra lateral
const TRELLO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="3.5" height="9" fill="currentColor"/><rect x="13.5" y="7" width="3.5" height="5" fill="currentColor"/></svg>`;

// Vista integrada con webview de Electron para cargar Trello dentro de Obsidian
class TrelloView extends ItemView {
  plugin: TrelloPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: TrelloPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_TRELLO;
  }

  getDisplayText(): string {
    return 'Tablero de Trello';
  }

  getIcon(): string {
    return 'trello-custom';
  }

  async onOpen() {
    const container = this.contentEl;
    container.empty();

    if (!this.plugin.settings.boardId) {
      container.createEl('div', { 
        text: 'Por favor, configura tu Trello Board ID en los ajustes del plugin.',
        cls: 'trello-empty-notice'
      });
      return;
    }

    // Usar 'webview' de Electron con 'allowpopups' para permitir inicio de sesión sin bloqueos
    container.createEl('webview' as any, {
      attr: {
        src: `https://trello.com/b/${this.plugin.settings.boardId}`,
        style: 'width: 100%; height: 100%; border: none;',
        allowpopups: 'true'
      }
    });
  }

  async onClose() {
    this.contentEl.empty();
  }
}

// Modal buscador flotante para seleccionar la lista de Trello
class TrelloListSuggestModal extends FuzzySuggestModal<TrelloList> {
  lists: TrelloList[];
  onSelect: (list: TrelloList) => void;

  constructor(app: App, lists: TrelloList[], onSelect: (list: TrelloList) => void) {
    super(app);
    this.lists = lists;
    this.onSelect = onSelect;
    this.setPlaceholder('Selecciona la lista de Trello...');
  }

  getItems(): TrelloList[] {
    return this.lists;
  }

  getItemText(item: TrelloList): string {
    return item.name;
  }

  onChooseItem(item: TrelloList, evt: MouseEvent | KeyboardEvent): void {
    this.onSelect(item);
  }
}

export default class TrelloPlugin extends Plugin {
  declare settings: MyPluginSettings;

  async onload() {
    await this.loadSettings();

    // 1. Registrar icono personalizado de Trello
    addIcon('trello-custom', TRELLO_SVG);

    // 2. Registrar la vista personalizada
    this.registerView(
      VIEW_TYPE_TRELLO,
      (leaf) => new TrelloView(leaf, this)
    );

    // 3. Añadir botón en la barra lateral para abrir la pestaña de Trello
    this.addRibbonIcon('trello-custom', 'Abrir mi tablero de Trello', () => {
      this.activateView();
    });

    // 4. Registrar comando para enviar notas a Trello (Ctrl + P)
    this.addCommand({
      id: 'send-note-to-trello',
      name: 'Enviar nota activa a Trello (Elegir Lista)',
      callback: () => this.sendToTrello()
    });

    // 5. Registrar comando para abrir la pestaña de Trello
    this.addCommand({
      id: 'open-trello-view',
      name: 'Abrir pestaña de Trello',
      callback: () => this.activateView()
    });

    // 6. Registrar pestaña de ajustes
    this.addSettingTab(new TrelloSettingsTab(this.app, this));
  }

  // Activa o crea la pestaña integrada dentro de Obsidian
  async activateView() {
    const { workspace } = this.app;
    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_TRELLO);

    if (leaves.length > 0) {
      // Si ya está abierta, enfocarse en esa pestaña
      leaf = leaves[0];
    } else {
      // Si no existe, abrir en una pestaña nueva
      leaf = workspace.getLeaf('tab');
      await leaf.setViewState({
        type: VIEW_TYPE_TRELLO,
        active: true,
      });
    }

    workspace.revealLeaf(leaf);
  }

  async sendToTrello() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice('Abre una nota antes de ejecutar este comando.');
      return;
    }

    const { apiKey, token, boardId } = this.settings;

    if (!apiKey || !token || !boardId) {
      new Notice('Faltan credenciales (API Key, Token o Board ID) en la configuración.');
      return;
    }

    const content = await this.app.vault.read(file);

    try {
      new Notice('Cargando listas de Trello...');

      // Consultar las listas del tablero
      const listsResponse = await requestUrl({
        url: `https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${token}`,
        method: 'GET'
      });

      if (listsResponse.status !== 200) {
        new Notice(`Error al obtener las listas: Status ${listsResponse.status}`);
        return;
      }

      const lists: TrelloList[] = listsResponse.json;

      if (!lists || lists.length === 0) {
        new Notice('No se encontraron listas en este tablero.');
        return;
      }

      // Desplegar modal para elegir la columna
      new TrelloListSuggestModal(this.app, lists, async (selectedList) => {
        try {
          const createCardResponse = await requestUrl({
            url: `https://api.trello.com/1/cards?idList=${selectedList.id}&key=${apiKey}&token=${token}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.basename,
              desc: content
            })
          });

          if (createCardResponse.status === 200) {
            new Notice(`¡Tarjeta creada en "${selectedList.name}"!`);
          }
        } catch (err) {
          console.error(err);
          new Notice('Error al crear la tarjeta en Trello.');
        }
      }).open();

    } catch (err) {
      console.error(err);
      new Notice('Error al conectar con Trello para obtener las listas.');
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class TrelloSettingsTab extends PluginSettingTab {
  plugin: TrelloPlugin;

  constructor(app: App, plugin: TrelloPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Configuración de Trello' });

    new Setting(containerEl)
      .setName('Trello API Key')
      .setDesc('Clave de API obtenida de trello.com/app-key')
      .addText(text => text
        .setPlaceholder('Ingresa tu API Key')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Trello Token')
      .setDesc('Token de acceso generado')
      .addText(text => text
        .setPlaceholder('Ingresa tu Token')
        .setValue(this.plugin.settings.token)
        .onChange(async (value) => {
          this.plugin.settings.token = value.trim();
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Trello Board ID')
      .setDesc('ID de tu tablero de Trello')
      .addText(text => text
        .setPlaceholder('Ingresa el ID del Tablero')
        .setValue(this.plugin.settings.boardId)
        .onChange(async (value) => {
          this.plugin.settings.boardId = value.trim();
          await this.plugin.saveSettings();
        }));
  }
}