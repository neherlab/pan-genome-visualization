import "../js/libs.js";
import "./plain.css";

import { pagePath } from "../links.js";
import html from "./pathogens.html?raw";
import { NAV } from "./nav.js";

export const page = {
  title: "panX",
  nav: NAV,
  html,
  /** List a link to every dataset of the shown release, in the byte order of their ids. */
  mount({ index }) {
    const ids = index.datasets.map((dataset) => dataset.id).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const list = document.getElementById("pathogens");
    for (const id of ids) {
      const link = document.createElement("a");
      link.href = pagePath(`/${id}`);
      link.textContent = id;
      const item = document.createElement("li");
      item.append(link);
      list.append(item);
    }
  },
};
