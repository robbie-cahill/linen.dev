import { measure } from './utils/measure';
import WebCrawler from './crawlers/web';
import Typesense from './typesense';
import { memoize } from './utils/memo';
import { CrawlOptions } from '@linen/types';
// import GitCrawler from './crawlers/git';

const webCrawlerMemo = memoize(WebCrawler.crawl);
// const gitCrawlerMemo = memoize(GitCrawler.crawl);

export default class Crawler {
  @measure
  static async crawlToStore(accountId: string, options: CrawlOptions) {
    const webDocs = await webCrawlerMemo(options.url, options.selectors);
    console.log('webDocs', webDocs.documents.length);
    await Typesense.store(
      webDocs.documents.map((d) => ({
        ...d,
        metadata: {
          ...d.metadata,
          accountId,
          contentType: 'docs',
          id: d.metadata.source,
        },
      }))
    );

    // const gitDocs = await gitCrawlerMemo(options.repo, options.branch);
    // console.log('gitDocs', gitDocs.documents.length);
    // await Typesense.store(
    //   gitDocs.documents.map((d) => ({
    //     ...d,
    //     metadata: {
    //       ...d.metadata,
    //       accountId,
    //       contentType: 'git',
    //       id: d.metadata.source,
    //     },
    //   }))
    // );
  }
}
