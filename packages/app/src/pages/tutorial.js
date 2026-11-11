import "../js/libs.js";
import "./plain.css";
import "../vendor/gifffer.min.js";

import html from "./tutorial.html?raw";
import { NAV_TUTORIAL } from "./nav.js";

export const page = {
  title: "panX: pan-genome analysis & exploration",
  nav: NAV_TUTORIAL,
  html,
  mount() {
    window.jQuery(document.body).scrollspy({ target: "#myScrollspy", offset: 100 });
    window.Gifffer();
  },
};
