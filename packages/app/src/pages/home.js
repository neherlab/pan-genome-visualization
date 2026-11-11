import "../js/libs.js";
import "./home.css";
import "../vendor/gifffer.min.js";

import html from "./home.html?raw";
import { NAV } from "./nav.js";

export const page = {
  title: "panX",
  nav: NAV,
  html,
  async mount() {
    window.Gifffer();
    await import("../js/homepage.js");
  },
};
