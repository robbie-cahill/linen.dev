import { cleanEnv, str, url, host } from 'envalid';

export const env = cleanEnv(process.env, {
  TYPESENSE_ADMIN: str({ default: 'xyz' }),
  DATABASE_URL: url(),
  NEXT_PUBLIC_TYPESENSE_HOST: host({
    default: 'po6fgyhi38429jzkp-1.a1.typesense.net',
    devDefault: 'localhost',
  }),
  TYPESENSE_SEARCH_ONLY: str({ default: 'xyz' }),
  TYPESENSE_DATABASE: str({ default: 'threads' }),
  TYPESENSE_EMBEDDING_DB: str({ default: 'embeddings' }),
});
