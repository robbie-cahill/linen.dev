import {
  createAccount,
  createChannel,
  createMessage,
  createThread,
  createUser,
} from '@linen/factory';
import { logger } from '../__tests__/logger';
import { fetcher } from '../__tests__/fetcher';
import { setup } from './setup';
import { SerializedSearchSettings } from '@linen/types';
import { prisma } from '@linen/database';
import { getAccountSettings } from './utils/shared';
import { handleCommunityDeletion } from './handle-community-deletion';

describe('community deletion', () => {
  let accountId: string;
  let searchSettings: SerializedSearchSettings;
  beforeAll(async () => {
    const account = await createAccount({ type: 'PUBLIC' });
    const channel = await createChannel({
      accountId: account.id,
    });
    const user = await createUser({ accountsId: account.id });
    accountId = account.id;

    const thread1 = await createThread({ channelId: channel.id });
    await createMessage({
      threadId: thread1.id,
      channelId: channel.id,
      body: 'lorem',
      usersId: user.id,
    });
    await createMessage({
      threadId: thread1.id,
      channelId: channel.id,
      body: 'ipsum',
      usersId: user.id,
    });

    await setup({ accountId: account.id, logger });
  });

  test('community token should exist', async () => {
    const accountSettings = await getAccountSettings(accountId, logger);
    expect(accountSettings?.searchSettings).toBeDefined();
    expect(accountSettings?.searchSettings.apiKey).toBeDefined();
    expect(accountSettings?.searchSettings.scope).toBe('public');
    searchSettings = accountSettings?.searchSettings!;
  });

  test('query results should have threads', async () => {
    const { results } = await fetcher(searchSettings.apiKey, '*');
    expect(results).toBeDefined();
    expect(results[0].hits).toHaveLength(1);
    expect(results[0].hits[0].document.body).toContain('lorem');
    expect(results[0].hits[0].document.body).toContain('ipsum');
  });

  test('after delete community, query results should be empty', async () => {
    await prisma.users.deleteMany({ where: { accountsId: accountId } });
    await prisma.accounts.delete({ where: { id: accountId } });
    await handleCommunityDeletion({
      accountId,
    });
    const { results } = await fetcher(searchSettings.apiKey, '*');
    expect(results).toBeDefined();
    expect(results[0].hits).toHaveLength(0);
  });
});
