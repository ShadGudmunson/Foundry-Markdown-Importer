import {actorCreator} from "./ActorCreator.js";

export default class ImportWindow extends Application {

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            id: "md-importer",
            template: "modules/Tetra-Cube-Importer/templates/importer.html",
            resizable: false,
            height: "auto",
            width: 400,
            minimizable: true,
            title: "Markdown Importer"
        }
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find(".import-button").click(() => actorCreator($("[name='text']")[0].value));
    }
}
