import { client } from './utils/client';
import { createSearchOnlyKey } from './utils/keys';
import { collectionEmbeddingSchema, collectionSchema } from './utils/model';

export async function init() {
  try {
    await client.health.retrieve();
  } catch (error: any) {
    if (String(error.message).includes('connect ECONNREFUSED')) {
      console.log(
        [
          `-----------------------`,
          `Please ensure that you have a typesense server running at port 8108`,
          `Step 1. Find out how to install typesense locally from their docs.`,
          `Step 2. Then run the following command, choose your own data dir.`,
          `./typesense-server --data-dir=/MyDataDir --api-key=xyz --api-port=8108`,
          `-----------------------`,
        ].join('\n')
      );
    }
    throw error;
  }

  try {
    await client.collections().create(collectionSchema);
  } catch (error: any) {
    if (error.name === 'ObjectAlreadyExists' || error.httpStatus === 409) {
      console.error({ error: JSON.stringify(error) });
    }
  }
  try {
    // await client.collections(collectionEmbeddingSchema.name).delete();
    await client.collections().create(collectionEmbeddingSchema);
  } catch (error: any) {
    if (error.name === 'ObjectAlreadyExists' || error.httpStatus === 409) {
      console.error({ error: JSON.stringify(error) });
    }
  }

  return await createSearchOnlyKey([
    collectionSchema.name,
    collectionEmbeddingSchema.name,
  ]);
}

if (require.main === module) {
  init().then((key) => {
    console.log('search-only api-key ::', key.value);
  });
}
