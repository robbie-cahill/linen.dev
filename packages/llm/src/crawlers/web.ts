import { RecursiveUrlLoader } from 'langchain/document_loaders/web/recursive_url';
import { compile } from 'html-to-text';
import { measure } from '../utils/measure';

class WebCrawler {
  @measure
  static async crawl(url: string, selectors: string[]) {
    const loader = new RecursiveUrlLoader(url, {
      extractor: compile({
        wordwrap: 130,
        baseElements: {
          selectors,
        },
      }),
      maxDepth: 1000,
      preventOutside: true,
    });
    const documents = await loader.load();
    return { documents };
  }
}

export default WebCrawler;
