import { JobHelpers } from 'graphile-worker';
import { z } from 'zod';
import { appendProtocol } from '@linen/utilities/url';
import { getIntegrationUrl } from '@linen/utilities/domain';
import LinenSdk from '@linen/sdk';
import { LLMPredictionResponse, MessageFormat } from '@linen/types';
import crypto from 'crypto';
import { prisma } from '@linen/database';
import { Logger } from '../../helpers/logger';
import { LangChain } from '@linen/llm';
import { serializeAccount } from '@linen/serializers/account';
import { parseBody } from './utils/parseBody';

const linenSdk = new LinenSdk({
  apiKey: process.env.INTERNAL_API_KEY!,
  type: 'internal',
  linenUrl: appendProtocol(getIntegrationUrl()),
});

export const llmQuestion = async (payload: any, helpers: JobHelpers) => {
  const logger = new Logger(helpers.logger);

  logger.info(payload);
  const parsedPayload = z
    .object({
      accountId: z.string().uuid(),
      authorId: z.string().uuid(),
      channelId: z.string().uuid(),
      threadId: z.string().uuid(),
      communityName: z.string(),
    })
    .parse(payload);

  const { accountId, authorId, channelId, threadId, communityName } =
    parsedPayload;

  try {
    const thread = await prisma.threads.findUniqueOrThrow({
      include: {
        messages: true,
        channel: {
          include: { account: true },
        },
      },
      where: { id: threadId },
    });

    const account = await prisma.accounts.findFirstOrThrow({
      where: {
        OR: [
          { redirectDomain: communityName },
          { slackDomain: communityName },
          { discordDomain: communityName },
          { discordServerId: communityName },
        ],
      },
    });
    const { search } = serializeAccount(account);

    logger.info({ llm: `found thread ${thread.id}` });

    if (!search?.apiKey) {
      throw new Error('missing search api-key');
    }

    const llmResponse = await LangChain.predict({
      query: thread.messages.map((m) => m.body).join(' '),
      threadId: thread.id,
      summarize: false,
      typesenseApiKey: search.apiKey,
      channelId: thread.channel.id,
      channelName: thread.channel.channelName,
      accountId: account.id,
    });

    logger.info({ llm: `llm response ready` });

    const body = await parseBody(llmResponse as LLMPredictionResponse, {
      account,
      communityName,
    });

    logger.info({
      llm: `creating a new linen message for thread ${threadId}`,
    });

    await linenSdk.createNewMessage({
      accountId,
      authorId,
      body,
      channelId,
      externalMessageId: crypto.randomUUID(),
      threadId,
      messageFormat: MessageFormat.LINEN,
    });
  } catch (exception: any) {
    logger.error(exception);
    await linenSdk.createNewMessage({
      accountId,
      authorId,
      body: "Sorry, I don't know enough to give you a confident answer yet.",
      channelId,
      externalMessageId: crypto.randomUUID(),
      threadId,
      messageFormat: MessageFormat.LINEN,
    });
  }
};
