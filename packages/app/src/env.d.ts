/** The variables of the build (vite.config.ts): the build fails without `VITE_DATA_URL`. */
interface ImportMetaEnv {
  /** URL of the data root, without a trailing slash. */
  readonly VITE_DATA_URL: string;
  /** Domain of the Plausible analytics, or empty for none. */
  readonly VITE_PLAUSIBLE_DOMAIN: string;
}
