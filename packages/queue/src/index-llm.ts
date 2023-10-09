console.log('NODE_ENV: ' + process.env.NODE_ENV);

import { downloadCert, getDatabaseUrl } from '@linen/database';
import { run } from 'graphile-worker';
import { llmQuestion } from './tasks/llm';

async function runWorker() {
  await downloadCert();
  const runner = await run({
    connectionString: getDatabaseUrl({
      dbUrl: process.env.DATABASE_URL,
      cert: process.env.RDS_CERTIFICATE,
    }),
    concurrency: 10,
    noHandleSignals: false,
    pollInterval: 1000,
    taskList: {
      llmQuestion,
    },
  });
  await runner.promise;
}

runWorker().catch((err) => {
  console.error(err);
  process.exit(1);
});
