import { cleanEnv, str, url, host, num } from 'envalid';

const env = cleanEnv(process.env, {
  OPENAI_API_TOKEN: str(),
  INTERNAL_API_KEY: str(),

  AUTH_SERVICE_URL: url({
    devDefault: 'http://localhost:3000',
    default: 'https://www.linen.dev',
  }),

  // typesense client
  NEXT_PUBLIC_TYPESENSE_HOST: host({
    default: 'po6fgyhi38429jzkp-1.a1.typesense.net',
    devDefault: 'localhost',
  }),
  TYPESENSE_PORT: num({
    default: 443,
    devDefault: 8108,
  }),
  TYPESENSE_PROTOCOL: str({
    default: 'https',
    devDefault: 'http',
  }),
  TYPESENSE_URL: url({
    default: 'https://po6fgyhi38429jzkp-1.a1.typesense.net:443/multi_search',
    devDefault: 'http://localhost:8108/multi_search',
  }),
  TYPESENSE_DATABASE: str({
    default: 'threads',
  }),
  TYPESENSE_EMBEDDING_DB: str({
    default: 'embeddings',
  }),
  // typesense api-key with upsert permission
  TYPESENSE_ADMIN: str({
    devDefault: 'xyz',
  }),

  TYPESENSE_SEARCH_ONLY: str({ devDefault: 'xyz' }),
});

export default env;
