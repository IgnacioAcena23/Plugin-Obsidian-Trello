var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => TrelloPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  apiKey: "",
  token: "",
  boardId: ""
};
var VIEW_TYPE_TRELLO = "trello-embedded-view";
var TRELLO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="3.5" height="9" fill="currentColor"/><rect x="13.5" y="7" width="3.5" height="5" fill="currentColor"/></svg>`;
var TrelloView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    __publicField(this, "plugin");
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_TRELLO;
  }
  getDisplayText() {
    return "Tablero de Trello";
  }
  getIcon() {
    return "trello-custom";
  }
  async onOpen() {
    const container = this.contentEl;
    container.empty();
    if (!this.plugin.settings.boardId) {
      container.createEl("div", {
        text: "Por favor, configura tu Trello Board ID en los ajustes del plugin.",
        cls: "trello-empty-notice"
      });
      return;
    }
    container.createEl("webview", {
      attr: {
        src: `https://trello.com/b/${this.plugin.settings.boardId}`,
        style: "width: 100%; height: 100%; border: none;",
        allowpopups: "true"
      }
    });
  }
  async onClose() {
    this.contentEl.empty();
  }
};
var TrelloListSuggestModal = class extends import_obsidian.FuzzySuggestModal {
  constructor(app, lists, onSelect) {
    super(app);
    __publicField(this, "lists");
    __publicField(this, "onSelect");
    this.lists = lists;
    this.onSelect = onSelect;
    this.setPlaceholder("Selecciona la lista de Trello...");
  }
  getItems() {
    return this.lists;
  }
  getItemText(item) {
    return item.name;
  }
  onChooseItem(item, evt) {
    this.onSelect(item);
  }
};
var TrelloPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    (0, import_obsidian.addIcon)("trello-custom", TRELLO_SVG);
    this.registerView(
      VIEW_TYPE_TRELLO,
      (leaf) => new TrelloView(leaf, this)
    );
    this.addRibbonIcon("trello-custom", "Abrir mi tablero de Trello", () => {
      this.activateView();
    });
    this.addCommand({
      id: "send-note-to-trello",
      name: "Enviar nota activa a Trello (Elegir Lista)",
      callback: () => this.sendToTrello()
    });
    this.addCommand({
      id: "open-trello-view",
      name: "Abrir pesta\xF1a de Trello",
      callback: () => this.activateView()
    });
    this.addSettingTab(new TrelloSettingsTab(this.app, this));
  }
  // Activa o crea la pestaña integrada dentro de Obsidian
  async activateView() {
    const { workspace } = this.app;
    let leaf = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_TRELLO);
    if (leaves.length > 0) {
      leaf = leaves[0];
    } else {
      leaf = workspace.getLeaf("tab");
      await leaf.setViewState({
        type: VIEW_TYPE_TRELLO,
        active: true
      });
    }
    workspace.revealLeaf(leaf);
  }
  async sendToTrello() {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new import_obsidian.Notice("Abre una nota antes de ejecutar este comando.");
      return;
    }
    const { apiKey, token, boardId } = this.settings;
    if (!apiKey || !token || !boardId) {
      new import_obsidian.Notice("Faltan credenciales (API Key, Token o Board ID) en la configuraci\xF3n.");
      return;
    }
    const content = await this.app.vault.read(file);
    try {
      new import_obsidian.Notice("Cargando listas de Trello...");
      const listsResponse = await (0, import_obsidian.requestUrl)({
        url: `https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${token}`,
        method: "GET"
      });
      if (listsResponse.status !== 200) {
        new import_obsidian.Notice(`Error al obtener las listas: Status ${listsResponse.status}`);
        return;
      }
      const lists = listsResponse.json;
      if (!lists || lists.length === 0) {
        new import_obsidian.Notice("No se encontraron listas en este tablero.");
        return;
      }
      new TrelloListSuggestModal(this.app, lists, async (selectedList) => {
        try {
          const createCardResponse = await (0, import_obsidian.requestUrl)({
            url: `https://api.trello.com/1/cards?idList=${selectedList.id}&key=${apiKey}&token=${token}`,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: file.basename,
              desc: content
            })
          });
          if (createCardResponse.status === 200) {
            new import_obsidian.Notice(`\xA1Tarjeta creada en "${selectedList.name}"!`);
          }
        } catch (err) {
          console.error(err);
          new import_obsidian.Notice("Error al crear la tarjeta en Trello.");
        }
      }).open();
    } catch (err) {
      console.error(err);
      new import_obsidian.Notice("Error al conectar con Trello para obtener las listas.");
    }
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var TrelloSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    __publicField(this, "plugin");
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Configuraci\xF3n de Trello" });
    new import_obsidian.Setting(containerEl).setName("Trello API Key").setDesc("Clave de API obtenida de trello.com/app-key").addText((text) => text.setPlaceholder("Ingresa tu API Key").setValue(this.plugin.settings.apiKey).onChange(async (value) => {
      this.plugin.settings.apiKey = value.trim();
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Trello Token").setDesc("Token de acceso generado").addText((text) => text.setPlaceholder("Ingresa tu Token").setValue(this.plugin.settings.token).onChange(async (value) => {
      this.plugin.settings.token = value.trim();
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Trello Board ID").setDesc("ID de tu tablero de Trello").addText((text) => text.setPlaceholder("Ingresa el ID del Tablero").setValue(this.plugin.settings.boardId).onChange(async (value) => {
      this.plugin.settings.boardId = value.trim();
      await this.plugin.saveSettings();
    }));
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgXHJcbiAgUGx1Z2luLCBcclxuICBOb3RpY2UsIFxyXG4gIHJlcXVlc3RVcmwsIFxyXG4gIFBsdWdpblNldHRpbmdUYWIsIFxyXG4gIFNldHRpbmcsIFxyXG4gIEFwcCwgXHJcbiAgRnV6enlTdWdnZXN0TW9kYWwsIFxyXG4gIGFkZEljb24sIFxyXG4gIEl0ZW1WaWV3LCBcclxuICBXb3Jrc3BhY2VMZWFmIFxyXG59IGZyb20gJ29ic2lkaWFuJztcclxuXHJcbmludGVyZmFjZSBNeVBsdWdpblNldHRpbmdzIHtcclxuICBhcGlLZXk6IHN0cmluZztcclxuICB0b2tlbjogc3RyaW5nO1xyXG4gIGJvYXJkSWQ6IHN0cmluZztcclxufVxyXG5cclxuY29uc3QgREVGQVVMVF9TRVRUSU5HUzogTXlQbHVnaW5TZXR0aW5ncyA9IHtcclxuICBhcGlLZXk6ICcnLFxyXG4gIHRva2VuOiAnJyxcclxuICBib2FyZElkOiAnJ1xyXG59O1xyXG5cclxuaW50ZXJmYWNlIFRyZWxsb0xpc3Qge1xyXG4gIGlkOiBzdHJpbmc7XHJcbiAgbmFtZTogc3RyaW5nO1xyXG59XHJcblxyXG5jb25zdCBWSUVXX1RZUEVfVFJFTExPID0gJ3RyZWxsby1lbWJlZGRlZC12aWV3JztcclxuXHJcbi8vIExvZ28gU1ZHIHBlcnNvbmFsaXphZG8gZGUgVHJlbGxvIHBhcmEgbGEgYmFycmEgbGF0ZXJhbFxyXG5jb25zdCBUUkVMTE9fU1ZHID0gYDxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBmaWxsPVwibm9uZVwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjJcIiBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIj48cmVjdCB4PVwiM1wiIHk9XCIzXCIgd2lkdGg9XCIxOFwiIGhlaWdodD1cIjE4XCIgcng9XCIyXCIgcnk9XCIyXCIvPjxyZWN0IHg9XCI3XCIgeT1cIjdcIiB3aWR0aD1cIjMuNVwiIGhlaWdodD1cIjlcIiBmaWxsPVwiY3VycmVudENvbG9yXCIvPjxyZWN0IHg9XCIxMy41XCIgeT1cIjdcIiB3aWR0aD1cIjMuNVwiIGhlaWdodD1cIjVcIiBmaWxsPVwiY3VycmVudENvbG9yXCIvPjwvc3ZnPmA7XHJcblxyXG4vLyBWaXN0YSBpbnRlZ3JhZGEgY29uIHdlYnZpZXcgZGUgRWxlY3Ryb24gcGFyYSBjYXJnYXIgVHJlbGxvIGRlbnRybyBkZSBPYnNpZGlhblxyXG5jbGFzcyBUcmVsbG9WaWV3IGV4dGVuZHMgSXRlbVZpZXcge1xyXG4gIHBsdWdpbjogVHJlbGxvUGx1Z2luO1xyXG5cclxuICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwbHVnaW46IFRyZWxsb1BsdWdpbikge1xyXG4gICAgc3VwZXIobGVhZik7XHJcbiAgICB0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuICB9XHJcblxyXG4gIGdldFZpZXdUeXBlKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gVklFV19UWVBFX1RSRUxMTztcclxuICB9XHJcblxyXG4gIGdldERpc3BsYXlUZXh0KCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gJ1RhYmxlcm8gZGUgVHJlbGxvJztcclxuICB9XHJcblxyXG4gIGdldEljb24oKTogc3RyaW5nIHtcclxuICAgIHJldHVybiAndHJlbGxvLWN1c3RvbSc7XHJcbiAgfVxyXG5cclxuICBhc3luYyBvbk9wZW4oKSB7XHJcbiAgICBjb25zdCBjb250YWluZXIgPSB0aGlzLmNvbnRlbnRFbDtcclxuICAgIGNvbnRhaW5lci5lbXB0eSgpO1xyXG5cclxuICAgIGlmICghdGhpcy5wbHVnaW4uc2V0dGluZ3MuYm9hcmRJZCkge1xyXG4gICAgICBjb250YWluZXIuY3JlYXRlRWwoJ2RpdicsIHsgXHJcbiAgICAgICAgdGV4dDogJ1BvciBmYXZvciwgY29uZmlndXJhIHR1IFRyZWxsbyBCb2FyZCBJRCBlbiBsb3MgYWp1c3RlcyBkZWwgcGx1Z2luLicsXHJcbiAgICAgICAgY2xzOiAndHJlbGxvLWVtcHR5LW5vdGljZSdcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBVc2FyICd3ZWJ2aWV3JyBkZSBFbGVjdHJvbiBjb24gJ2FsbG93cG9wdXBzJyBwYXJhIHBlcm1pdGlyIGluaWNpbyBkZSBzZXNpXHUwMEYzbiBzaW4gYmxvcXVlb3NcclxuICAgIGNvbnRhaW5lci5jcmVhdGVFbCgnd2VidmlldycgYXMgYW55LCB7XHJcbiAgICAgIGF0dHI6IHtcclxuICAgICAgICBzcmM6IGBodHRwczovL3RyZWxsby5jb20vYi8ke3RoaXMucGx1Z2luLnNldHRpbmdzLmJvYXJkSWR9YCxcclxuICAgICAgICBzdHlsZTogJ3dpZHRoOiAxMDAlOyBoZWlnaHQ6IDEwMCU7IGJvcmRlcjogbm9uZTsnLFxyXG4gICAgICAgIGFsbG93cG9wdXBzOiAndHJ1ZSdcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBvbkNsb3NlKCkge1xyXG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcclxuICB9XHJcbn1cclxuXHJcbi8vIE1vZGFsIGJ1c2NhZG9yIGZsb3RhbnRlIHBhcmEgc2VsZWNjaW9uYXIgbGEgbGlzdGEgZGUgVHJlbGxvXHJcbmNsYXNzIFRyZWxsb0xpc3RTdWdnZXN0TW9kYWwgZXh0ZW5kcyBGdXp6eVN1Z2dlc3RNb2RhbDxUcmVsbG9MaXN0PiB7XHJcbiAgbGlzdHM6IFRyZWxsb0xpc3RbXTtcclxuICBvblNlbGVjdDogKGxpc3Q6IFRyZWxsb0xpc3QpID0+IHZvaWQ7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBsaXN0czogVHJlbGxvTGlzdFtdLCBvblNlbGVjdDogKGxpc3Q6IFRyZWxsb0xpc3QpID0+IHZvaWQpIHtcclxuICAgIHN1cGVyKGFwcCk7XHJcbiAgICB0aGlzLmxpc3RzID0gbGlzdHM7XHJcbiAgICB0aGlzLm9uU2VsZWN0ID0gb25TZWxlY3Q7XHJcbiAgICB0aGlzLnNldFBsYWNlaG9sZGVyKCdTZWxlY2Npb25hIGxhIGxpc3RhIGRlIFRyZWxsby4uLicpO1xyXG4gIH1cclxuXHJcbiAgZ2V0SXRlbXMoKTogVHJlbGxvTGlzdFtdIHtcclxuICAgIHJldHVybiB0aGlzLmxpc3RzO1xyXG4gIH1cclxuXHJcbiAgZ2V0SXRlbVRleHQoaXRlbTogVHJlbGxvTGlzdCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gaXRlbS5uYW1lO1xyXG4gIH1cclxuXHJcbiAgb25DaG9vc2VJdGVtKGl0ZW06IFRyZWxsb0xpc3QsIGV2dDogTW91c2VFdmVudCB8IEtleWJvYXJkRXZlbnQpOiB2b2lkIHtcclxuICAgIHRoaXMub25TZWxlY3QoaXRlbSk7XHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUcmVsbG9QbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xyXG4gIGRlY2xhcmUgc2V0dGluZ3M6IE15UGx1Z2luU2V0dGluZ3M7XHJcblxyXG4gIGFzeW5jIG9ubG9hZCgpIHtcclxuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XHJcblxyXG4gICAgLy8gMS4gUmVnaXN0cmFyIGljb25vIHBlcnNvbmFsaXphZG8gZGUgVHJlbGxvXHJcbiAgICBhZGRJY29uKCd0cmVsbG8tY3VzdG9tJywgVFJFTExPX1NWRyk7XHJcblxyXG4gICAgLy8gMi4gUmVnaXN0cmFyIGxhIHZpc3RhIHBlcnNvbmFsaXphZGFcclxuICAgIHRoaXMucmVnaXN0ZXJWaWV3KFxyXG4gICAgICBWSUVXX1RZUEVfVFJFTExPLFxyXG4gICAgICAobGVhZikgPT4gbmV3IFRyZWxsb1ZpZXcobGVhZiwgdGhpcylcclxuICAgICk7XHJcblxyXG4gICAgLy8gMy4gQVx1MDBGMWFkaXIgYm90XHUwMEYzbiBlbiBsYSBiYXJyYSBsYXRlcmFsIHBhcmEgYWJyaXIgbGEgcGVzdGFcdTAwRjFhIGRlIFRyZWxsb1xyXG4gICAgdGhpcy5hZGRSaWJib25JY29uKCd0cmVsbG8tY3VzdG9tJywgJ0FicmlyIG1pIHRhYmxlcm8gZGUgVHJlbGxvJywgKCkgPT4ge1xyXG4gICAgICB0aGlzLmFjdGl2YXRlVmlldygpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gNC4gUmVnaXN0cmFyIGNvbWFuZG8gcGFyYSBlbnZpYXIgbm90YXMgYSBUcmVsbG8gKEN0cmwgKyBQKVxyXG4gICAgdGhpcy5hZGRDb21tYW5kKHtcclxuICAgICAgaWQ6ICdzZW5kLW5vdGUtdG8tdHJlbGxvJyxcclxuICAgICAgbmFtZTogJ0VudmlhciBub3RhIGFjdGl2YSBhIFRyZWxsbyAoRWxlZ2lyIExpc3RhKScsXHJcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLnNlbmRUb1RyZWxsbygpXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyA1LiBSZWdpc3RyYXIgY29tYW5kbyBwYXJhIGFicmlyIGxhIHBlc3RhXHUwMEYxYSBkZSBUcmVsbG9cclxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XHJcbiAgICAgIGlkOiAnb3Blbi10cmVsbG8tdmlldycsXHJcbiAgICAgIG5hbWU6ICdBYnJpciBwZXN0YVx1MDBGMWEgZGUgVHJlbGxvJyxcclxuICAgICAgY2FsbGJhY2s6ICgpID0+IHRoaXMuYWN0aXZhdGVWaWV3KClcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIDYuIFJlZ2lzdHJhciBwZXN0YVx1MDBGMWEgZGUgYWp1c3Rlc1xyXG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBUcmVsbG9TZXR0aW5nc1RhYih0aGlzLmFwcCwgdGhpcykpO1xyXG4gIH1cclxuXHJcbiAgLy8gQWN0aXZhIG8gY3JlYSBsYSBwZXN0YVx1MDBGMWEgaW50ZWdyYWRhIGRlbnRybyBkZSBPYnNpZGlhblxyXG4gIGFzeW5jIGFjdGl2YXRlVmlldygpIHtcclxuICAgIGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLmFwcDtcclxuICAgIGxldCBsZWFmOiBXb3Jrc3BhY2VMZWFmIHwgbnVsbCA9IG51bGw7XHJcbiAgICBjb25zdCBsZWF2ZXMgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFZJRVdfVFlQRV9UUkVMTE8pO1xyXG5cclxuICAgIGlmIChsZWF2ZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAvLyBTaSB5YSBlc3RcdTAwRTEgYWJpZXJ0YSwgZW5mb2NhcnNlIGVuIGVzYSBwZXN0YVx1MDBGMWFcclxuICAgICAgbGVhZiA9IGxlYXZlc1swXTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIFNpIG5vIGV4aXN0ZSwgYWJyaXIgZW4gdW5hIHBlc3RhXHUwMEYxYSBudWV2YVxyXG4gICAgICBsZWFmID0gd29ya3NwYWNlLmdldExlYWYoJ3RhYicpO1xyXG4gICAgICBhd2FpdCBsZWFmLnNldFZpZXdTdGF0ZSh7XHJcbiAgICAgICAgdHlwZTogVklFV19UWVBFX1RSRUxMTyxcclxuICAgICAgICBhY3RpdmU6IHRydWUsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHdvcmtzcGFjZS5yZXZlYWxMZWFmKGxlYWYpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgc2VuZFRvVHJlbGxvKCkge1xyXG4gICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XHJcbiAgICBpZiAoIWZpbGUpIHtcclxuICAgICAgbmV3IE5vdGljZSgnQWJyZSB1bmEgbm90YSBhbnRlcyBkZSBlamVjdXRhciBlc3RlIGNvbWFuZG8uJyk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB7IGFwaUtleSwgdG9rZW4sIGJvYXJkSWQgfSA9IHRoaXMuc2V0dGluZ3M7XHJcblxyXG4gICAgaWYgKCFhcGlLZXkgfHwgIXRva2VuIHx8ICFib2FyZElkKSB7XHJcbiAgICAgIG5ldyBOb3RpY2UoJ0ZhbHRhbiBjcmVkZW5jaWFsZXMgKEFQSSBLZXksIFRva2VuIG8gQm9hcmQgSUQpIGVuIGxhIGNvbmZpZ3VyYWNpXHUwMEYzbi4nKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLmFwcC52YXVsdC5yZWFkKGZpbGUpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIG5ldyBOb3RpY2UoJ0NhcmdhbmRvIGxpc3RhcyBkZSBUcmVsbG8uLi4nKTtcclxuXHJcbiAgICAgIC8vIENvbnN1bHRhciBsYXMgbGlzdGFzIGRlbCB0YWJsZXJvXHJcbiAgICAgIGNvbnN0IGxpc3RzUmVzcG9uc2UgPSBhd2FpdCByZXF1ZXN0VXJsKHtcclxuICAgICAgICB1cmw6IGBodHRwczovL2FwaS50cmVsbG8uY29tLzEvYm9hcmRzLyR7Ym9hcmRJZH0vbGlzdHM/a2V5PSR7YXBpS2V5fSZ0b2tlbj0ke3Rva2VufWAsXHJcbiAgICAgICAgbWV0aG9kOiAnR0VUJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGlmIChsaXN0c1Jlc3BvbnNlLnN0YXR1cyAhPT0gMjAwKSB7XHJcbiAgICAgICAgbmV3IE5vdGljZShgRXJyb3IgYWwgb2J0ZW5lciBsYXMgbGlzdGFzOiBTdGF0dXMgJHtsaXN0c1Jlc3BvbnNlLnN0YXR1c31gKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGxpc3RzOiBUcmVsbG9MaXN0W10gPSBsaXN0c1Jlc3BvbnNlLmpzb247XHJcblxyXG4gICAgICBpZiAoIWxpc3RzIHx8IGxpc3RzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIG5ldyBOb3RpY2UoJ05vIHNlIGVuY29udHJhcm9uIGxpc3RhcyBlbiBlc3RlIHRhYmxlcm8uJyk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBEZXNwbGVnYXIgbW9kYWwgcGFyYSBlbGVnaXIgbGEgY29sdW1uYVxyXG4gICAgICBuZXcgVHJlbGxvTGlzdFN1Z2dlc3RNb2RhbCh0aGlzLmFwcCwgbGlzdHMsIGFzeW5jIChzZWxlY3RlZExpc3QpID0+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgY29uc3QgY3JlYXRlQ2FyZFJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7XHJcbiAgICAgICAgICAgIHVybDogYGh0dHBzOi8vYXBpLnRyZWxsby5jb20vMS9jYXJkcz9pZExpc3Q9JHtzZWxlY3RlZExpc3QuaWR9JmtleT0ke2FwaUtleX0mdG9rZW49JHt0b2tlbn1gLFxyXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXHJcbiAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICBuYW1lOiBmaWxlLmJhc2VuYW1lLFxyXG4gICAgICAgICAgICAgIGRlc2M6IGNvbnRlbnRcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIGlmIChjcmVhdGVDYXJkUmVzcG9uc2Uuc3RhdHVzID09PSAyMDApIHtcclxuICAgICAgICAgICAgbmV3IE5vdGljZShgXHUwMEExVGFyamV0YSBjcmVhZGEgZW4gXCIke3NlbGVjdGVkTGlzdC5uYW1lfVwiIWApO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xyXG4gICAgICAgICAgbmV3IE5vdGljZSgnRXJyb3IgYWwgY3JlYXIgbGEgdGFyamV0YSBlbiBUcmVsbG8uJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KS5vcGVuKCk7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcclxuICAgICAgbmV3IE5vdGljZSgnRXJyb3IgYWwgY29uZWN0YXIgY29uIFRyZWxsbyBwYXJhIG9idGVuZXIgbGFzIGxpc3Rhcy4nKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcclxuICAgIHRoaXMuc2V0dGluZ3MgPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX1NFVFRJTkdTLCBhd2FpdCB0aGlzLmxvYWREYXRhKCkpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgc2F2ZVNldHRpbmdzKCkge1xyXG4gICAgYXdhaXQgdGhpcy5zYXZlRGF0YSh0aGlzLnNldHRpbmdzKTtcclxuICB9XHJcbn1cclxuXHJcbmNsYXNzIFRyZWxsb1NldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XHJcbiAgcGx1Z2luOiBUcmVsbG9QbHVnaW47XHJcblxyXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwbHVnaW46IFRyZWxsb1BsdWdpbikge1xyXG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xyXG4gICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcbiAgfVxyXG5cclxuICBkaXNwbGF5KCk6IHZvaWQge1xyXG4gICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcclxuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblxyXG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gyJywgeyB0ZXh0OiAnQ29uZmlndXJhY2lcdTAwRjNuIGRlIFRyZWxsbycgfSk7XHJcblxyXG4gICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgIC5zZXROYW1lKCdUcmVsbG8gQVBJIEtleScpXHJcbiAgICAgIC5zZXREZXNjKCdDbGF2ZSBkZSBBUEkgb2J0ZW5pZGEgZGUgdHJlbGxvLmNvbS9hcHAta2V5JylcclxuICAgICAgLmFkZFRleHQodGV4dCA9PiB0ZXh0XHJcbiAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdJbmdyZXNhIHR1IEFQSSBLZXknKVxyXG4gICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5hcGlLZXkpXHJcbiAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG4gICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuYXBpS2V5ID0gdmFsdWUudHJpbSgpO1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgfSkpO1xyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAuc2V0TmFtZSgnVHJlbGxvIFRva2VuJylcclxuICAgICAgLnNldERlc2MoJ1Rva2VuIGRlIGFjY2VzbyBnZW5lcmFkbycpXHJcbiAgICAgIC5hZGRUZXh0KHRleHQgPT4gdGV4dFxyXG4gICAgICAgIC5zZXRQbGFjZWhvbGRlcignSW5ncmVzYSB0dSBUb2tlbicpXHJcbiAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnRva2VuKVxyXG4gICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnRva2VuID0gdmFsdWUudHJpbSgpO1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgfSkpO1xyXG5cclxuICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAuc2V0TmFtZSgnVHJlbGxvIEJvYXJkIElEJylcclxuICAgICAgLnNldERlc2MoJ0lEIGRlIHR1IHRhYmxlcm8gZGUgVHJlbGxvJylcclxuICAgICAgLmFkZFRleHQodGV4dCA9PiB0ZXh0XHJcbiAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdJbmdyZXNhIGVsIElEIGRlbCBUYWJsZXJvJylcclxuICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuYm9hcmRJZClcclxuICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcbiAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5ib2FyZElkID0gdmFsdWUudHJpbSgpO1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdz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
