import env from '../utils/env';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { OpenAI } from 'langchain/llms/openai';
import { Ollama } from 'langchain/llms/ollama';
import { HuggingFaceTransformersEmbeddings } from 'langchain/embeddings/hf_transformers';

export const embeddingsModel = env.isProd
  ? new OpenAIEmbeddings({
      openAIApiKey: env.OPENAI_API_TOKEN,
    })
  : new HuggingFaceTransformersEmbeddings({
      modelName: 'Xenova/all-MiniLM-L6-v2',
      maxRetries: 0,
    });

export const model = env.isProd
  ? new OpenAI({
      modelName: 'gpt-3.5-turbo-16k',
      openAIApiKey: env.OPENAI_API_TOKEN,
      temperature: 0,
    })
  : new Ollama({
      baseUrl: 'http://127.0.0.1:11434', // Default value
      model: 'llama2', // Default value
      maxRetries: 0,
    });
