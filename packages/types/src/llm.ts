export interface CrawlOptions {
  communityName: string;
  url: string;
  selectors: string[];
  accountId: string;
  repo?: string;
  branch?: string;
}

type TypesenseDocument = {
  id: string;
  accountId: string;
  body?: string;
  content?: string;
  source?: string;
  channelId?: string;
  threadId?: string;
  contentType?: string;
};

export type TypesenseResponse = {
  results: {
    hits: {
      document: TypesenseDocument;
    }[];
  }[];
};

export type SourceDocument = {
  pageContent: string;
  metadata: TypesenseDocument & {
    loc: {
      lines: {
        from: number;
        to: number;
      };
    };
    title?: string;
    language?: string;
  };
};

export type LLMPredictionResponse = {
  text: string;
  sourceDocuments: SourceDocument[];
};
