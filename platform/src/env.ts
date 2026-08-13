export interface Bindings {
  DB: D1Database;
  BACKUPS: R2Bucket;
  ASSETS: Fetcher;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  DEPLOYMENT_ENV?: string;
  GITHUB_API_TOKEN?: string;
}
