// The jQuery plugins of every page. Each page module imports this module first:
// an ES module runs its imports before its own body, and jquery-global.js must
// run before the plugins that read the global jQuery.
import "./jquery-global.js";
import "bootstrap";
import "bootstrap-toggle";
import "bootstrap-multiselect";
import "datatables.net";
import "datatables.net-bs";
import "datatables.net-colreorder";
import "../vendor/jquery.bootstrap-autohidingnavbar.min.js";
