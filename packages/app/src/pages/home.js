import "../js/libs.js";
import "./home.css";
import "../vendor/gifffer.min.js";

import { setViewerContext } from "../js/context.js";
import html from "./home.html?raw";
import { NAV } from "./nav.js";

export const page = {
  title: "panX",
  nav: NAV,
  html,
  async mount({ release, index }) {
    setViewerContext({ release, index });
    window.Gifffer();
    await import("../js/homepage.js");
  },
};
