// Bootstrap 3, its plugins, and the DataTables integrations read the global
// jQuery when they load, so this module runs before them (see libs.js).
import jQuery from "jquery";

window.$ = jQuery;
window.jQuery = jQuery;
