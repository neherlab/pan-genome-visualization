import "../js/libs.js";
import "./plain.css";

import html from "./pipeline.html?raw";
import { NAV_PIPELINE } from "./nav.js";

export const page = {
  title: "panX",
  nav: NAV_PIPELINE,
  html,
  mount() {},
};
