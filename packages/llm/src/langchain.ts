import { LLMChain, RetrievalQAChain } from 'langchain/chains';
import { ChatPromptTemplate, PromptTemplate } from 'langchain/prompts';
import { FaissStore } from 'langchain/vectorstores/faiss';
import { Document } from 'langchain/document';
import { measure } from './utils/measure';
import Typesense from './typesense';
import { model, embeddingsModel } from './models';
import Splitter from './splitter';

export default class LangChain {
  @measure
  static async predict({
    query,
    typesenseApiKey,
    summarize,
    threadId,
    channelId,
    channelName,
    accountId,
  }: {
    query: string;
    typesenseApiKey: string;
    summarize: boolean;
    threadId: string;
    channelId?: string;
    channelName?: string;
    accountId: string;
  }) {
    const body = await Typesense.queryThreads({
      query,
      apiKey: typesenseApiKey,
      channelId,
      channelName,
      accountId,
    });

    if (summarize) {
      for await (let item of body) {
        item.content = await this.summarize(item.content);
      }
    }
    const typesenseResults = body
      .filter((t) => t.id !== threadId && t.threadId !== threadId)
      .map(
        ({ content, ...b }) =>
          new Document({
            pageContent: content,
            metadata: { ...b },
          })
      );

    const chunks = await Splitter.splitDocuments(typesenseResults);
    const vectorStore = await FaissStore.fromDocuments(chunks, embeddingsModel);
    try {
      return await this.askLLM({ query, vectorStore });
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  @measure
  private static async summarize(text: string) {
    const response = await model.call(`
      Could you please turn the CONVERSATION text below to a stackoverflow style question answer?
      If you don't see the question, just return an empty string, DON'T try to make up a question.
      If you don't know the answer, just return an empty string, DON'T try to make up an answer.
      Keep the question as concise as possible.
      Keep the answer as concise as possible.
      DON'T crop the question, ensure the question is complete.
      DON'T crop the answer, ensure the answer is complete.
      No need to say "thanks for asking!" in the answer.

      CONVERSATION

      ${text}
    `);
    return response;
  }

  @measure
  private static async askLLM({
    query,
    vectorStore,
  }: {
    query: string;
    vectorStore: FaissStore;
  }) {
    const template = `Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, DON'T try to make up an answer.
Keep the answer as concise as possible.
DON'T crop the answer, ensure the answer is complete.
No need to say "thanks for asking!" in the answer.
Context: {context}
Question: {question}
Helpful Answer:`;

    const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever(), {
      prompt: PromptTemplate.fromTemplate(template),
      returnSourceDocuments: true,
    });

    const response = await chain.call({
      query,
    });
    return response;
  }

  @measure
  static async generateQuestionAnswerSummary(input: string[]) {
    const chatPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are a helpful assistant that extract the question and the answer from given context.
        Also you will summarize the context.
        Output MUST BE in json format within "question", "answer", "summary", 
        "confidence_question", "confidence_answer" and "confidence_summary" keys.
        Your response must have a confidence interval from 0 to 100 (avoid decimals) for each json key.`,
      ],
      ['human', '{text}'],
    ]);
    const chainB = new LLMChain({
      prompt: chatPrompt,
      llm: model,
    });
    try {
      const resB = await chainB.call({
        text: input.join('\n'),
      });
      try {
        return JSON.parse(String(resB.text).trim()) as {
          question: string;
          answer: string;
          summary: string;
          confidence_question: number;
          confidence_answer: number;
          confidence_summary: number;
        };
      } catch (error) {
        console.error('parse failure: ' + error, resB);
        return null;
      }
    } catch (error) {
      console.error('api failure: ' + error);
      return null;
    }
  }

  @measure
  static async generateEmbeddings(input: string[]) {
    return await embeddingsModel.embedDocuments(input);
  }
}
