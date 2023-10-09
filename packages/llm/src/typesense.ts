import env from './utils/env';
import { measure } from './utils/measure';
import { Client } from 'typesense';
import { embeddingsModel } from './models';
import * as vectorStore from 'langchain/vectorstores/typesense';
import { Document } from 'langchain/document';
import { TypesenseResponse } from '@linen/types';
import axios from 'axios';
import { toKeywords } from './utils/toKeywords';

const vectorTypesenseClient = new Client({
  nodes: [
    {
      host: env.NEXT_PUBLIC_TYPESENSE_HOST,
      port: env.TYPESENSE_PORT,
      protocol: env.TYPESENSE_PROTOCOL,
    },
  ],
  apiKey: env.TYPESENSE_ADMIN,
  numRetries: 3,
  connectionTimeoutSeconds: 60,
});

const typesenseVectorStoreConfig = {
  maxRetries: 0,
  typesenseClient: vectorTypesenseClient,
  schemaName: env.TYPESENSE_EMBEDDING_DB,
  columnNames: {
    vector: 'vec',
    pageContent: 'content',
    metadataColumnNames: [
      'id',
      'accountId',
      'channelId',
      'threadId',
      'contentType',
      'source',
    ],
  },
} satisfies vectorStore.TypesenseConfig;

export default class Typesense {
  @measure
  static async queryThreads({
    query,
    apiKey,
    limit = 10,
    channelId,
    channelName,
    accountId,
  }: {
    query: string;
    apiKey: string;
    limit?: number;
    channelId?: string;
    channelName?: string;
    accountId: string;
  }) {
    const vec = await embeddingsModel.embedQuery(query);
    const res = await axios
      .post<TypesenseResponse>(
        env.TYPESENSE_URL,
        {
          searches: [
            {
              collection: env.TYPESENSE_DATABASE,
              query_by: 'body',
              q: toKeywords(query),
              highlight_fields: 'none',
              include_fields: 'body,id',
              prefix: false,
              limit_hits: limit,
              filter_by: [
                `accountId:=${accountId}`,
                `is_public:=true`,
                channelName ? `channel_name:!=${channelName}` : null,
              ]
                .filter((e) => e)
                .join(' && '),
            },
            {
              collection: env.TYPESENSE_EMBEDDING_DB,
              query_by: 'content',
              q: toKeywords(query),
              vector_query: `vec:([${vec.join()}], k:${limit})`,
              highlight_fields: 'none',
              exclude_fields: 'vec',
              prefix: false,
              filter_by: [
                `accountId:=${accountId}`,
                channelId ? `channelId:!=${channelId}` : null,
              ]
                .filter((e) => e)
                .join(' && '),
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-typesense-api-key': env.TYPESENSE_SEARCH_ONLY,
          },
          timeout: 60 * 1000,
        }
      )
      .then((res) => res.data)
      .catch((res) => {
        console.error('%j', res);
        throw res;
      });

    return res.results
      .map((r) =>
        r.hits
          .map(({ document }) => document)
          .map(({ body, content, ...rest }) => {
            return {
              content: body || content,
              ...rest,
            };
          })
          .flat()
      )
      .flat();
  }

  static async getVectorStoreWithTypesense() {
    return new vectorStore.Typesense(
      embeddingsModel,
      typesenseVectorStoreConfig
    );
  }

  @measure
  static async store(chunkedDocs: Document<Record<string, any>>[]) {
    const typesenseVectorStore = await this.getVectorStoreWithTypesense();
    await typesenseVectorStore.addDocuments(chunkedDocs);
  }
}
