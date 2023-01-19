export const PROJECT_NAME = 'Pangenome' as const
export const PROJECT_DESCRIPTION = 'Pan-genome analysis and visualization' as const
export const COPYRIGHT_YEAR_START = 2016 as const
export const COMPANY_NAME = 'Wei Ding and Richard Neher' as const
export const RELEASE_URL = 'https://pangenome.org' as const

export const DOMAIN = process.env.DOMAIN ?? ''
export const DOMAIN_STRIPPED = process.env.DOMAIN_STRIPPED ?? ''
export const URL_FAVICON = `${DOMAIN}/favicon.ico`
export const URL_SOCIAL_IMAGE = `${DOMAIN}/social-1200x600.png`
export const URL_MANIFEST_JSON = `${DOMAIN}/manifest.json`
export const SAFARI_PINNED_TAB_COLOR = '#555555' as const
export const MS_TILE_COLOR = '#2b5797' as const

export const URL_GITHUB = 'https://github.com/neherlab/pan-genome-visualization' as const
export const URL_GITHUB_FRIENDLY = 'github.com/neherlab/pan-genome-visualization' as const

export const URL_GITHUB_ISSUES = 'https://github.com/neherlab/pan-genome-visualization/issues' as const
export const URL_GITHUB_ISSUES_FRIENDLY = 'github.com/neherlab/pan-genome-visualization/issues' as const
export const URL_GITHUB_CHANGELOG =
  'https://github.com/neherlab/pan-genome-visualization/blob/release/packages/web/CHANGELOG.md'
export const URL_GITHUB_COMMITS = 'https://github.com/neherlab/pan-genome-visualization/commits/release'

export const TWITTER_USERNAME_RAW = 'richardneher' as const
export const TWITTER_USERNAME_FRIENDLY = '@richardneher' as const

export const UNKNOWN_VALUE = `Unknown ` // HACK: keep space at the end: workaround for Auspice filtering out "Unknown"
