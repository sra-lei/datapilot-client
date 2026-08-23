/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_API_PREFIX: string;
  readonly VITE_ENABLE_MOCK: string;
  readonly VITE_SERVER_CORE_HOST: string;
  readonly VITE_SERVER_CORE_PORT: string;
  readonly VITE_SERVER_CORE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}