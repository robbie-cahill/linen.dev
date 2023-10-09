import { TokenTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';
import { measure } from './utils/measure';

export default class Splitter {
  @measure
  static async splitDocuments(documents: Document[], chunkSize = 768) {
    const splitter = new TokenTextSplitter({
      encodingName: 'gpt2',
      chunkSize,
      chunkOverlap: 0,
    });
    return await splitter.splitDocuments(documents);
  }
}
