import { CrawlOptions } from '@linen/types';
import Crawler from './crawler';

async function run() {
  const communities: CrawlOptions[] = [
    // {
    //   communityName: 'threads.netmaker.io',
    //   url: 'https://docs.netmaker.io',
    //   selectors: ['div.md-content'],
    // },
    {
      accountId: '9f2dfdd8-0fc8-4ade-9484-b130fad6764b',
      communityName: 'discuss.flyte.org',
      // docs
      url: 'https://docs.flyte.org',
      selectors: ['article[role="main"]'],
      // git
      // repo: 'https://github.com/flyteorg/flyte/tree/master/rsts',
      // branch: 'master',
    },
  ];

  for (const record of communities) {
    await Crawler.crawlToStore(record.accountId, record);
  }
}

run();
