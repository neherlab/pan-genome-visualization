/** The Bootstrap alert that a page shows in place of its content when a data file fails to load. */

import { DataError, describeReason } from "./load";

/**
 * Return an alert for a failed load: the URL and the reason of a `DataError`, or the message of any other error,
 * and a link that reloads the page.
 */
export function loadErrorAlert(error: unknown): HTMLElement {
  const alert = document.createElement("div");
  alert.className = "alert alert-danger";
  alert.setAttribute("role", "alert");

  const heading = document.createElement("h4");
  const details = document.createElement("pre");
  details.style.whiteSpace = "pre-wrap";
  if (error instanceof DataError) {
    heading.textContent = "The data of this page could not be loaded.";
    details.textContent = `${error.url}: ${describeReason(error.reason)}`;
  } else {
    heading.textContent = "This page could not be shown.";
    details.textContent = error instanceof Error ? error.message : String(error);
  }

  const reload = document.createElement("a");
  reload.href = window.location.href;
  reload.className = "alert-link";
  reload.textContent = "Reload the page";
  reload.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.reload();
  });
  const hint = document.createElement("p");
  hint.append(reload, ".");

  alert.append(heading, details, hint);
  return alert;
}
