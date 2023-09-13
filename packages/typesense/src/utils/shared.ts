import {
  Prisma,
  channels,
  mentions,
  messageAttachments,
  messageReactions,
  messages,
  prisma,
  threads,
  users,
  accounts,
} from '@linen/database';
import { SerializedSearchSettings, Logger, AnonymizeType } from '@linen/types';
import { client } from './client';
import { serializer } from './serializer';
import { serializeThread } from '@linen/serializers/thread';
import { collectionSchema } from './model';
import { env } from './env';
import { createUserKey, createAccountKey } from './keys';
import { anonymizeMessages } from '@linen/serializers/anonymizeMessages';
import { TypesenseThread } from './types';
import { delay } from './delay';
import { countOccurrences } from './countOccurrences';

export async function getAccountSettings(accountId: string, logger: Logger) {
  const account = await prisma.accounts.findUnique({
    where: {
      id: accountId,
    },
  });

  if (!account) {
    logger.warn({ warn: `account not found: ${accountId}` });
    return;
  }

  if (!account.searchSettings) {
    logger.warn({ warn: `account missing searchSettings` });
    return;
  }

  const searchSettings: SerializedSearchSettings = JSON.parse(
    account.searchSettings
  );
  return { searchSettings, account };
}

export async function queryThreads({
  where,
  orderBy,
  take,
}: Prisma.threadsFindManyArgs) {
  return await prisma.threads.findMany({
    include: {
      messages: {
        include: {
          author: true,
          mentions: {
            include: {
              users: true,
            },
          },
          reactions: true,
          attachments: true,
        },
        orderBy: { sentAt: 'asc' },
      },
      channel: {
        include: {
          memberships: {
            select: {
              usersId: true,
              user: { select: { authsId: true } },
            },
          },
        },
      },
    },
    where,
    orderBy,
    take,
  });
}

export function threadsWhere({ accountId }: { accountId: string }) {
  return {
    channel: {
      account: { id: accountId },
      hidden: false,
    },
    hidden: false,
    messageCount: { gt: 0 },
  };
}

/** persist timestamp as flag for next sync job */
export async function persistEndFlag(
  searchSettings: SerializedSearchSettings,
  accountId: string
) {
  searchSettings.lastSync = new Date().getTime();
  // persist
  await prisma.accounts.update({
    where: { id: accountId },
    data: {
      searchSettings: JSON.stringify(searchSettings),
    },
  });
}

export async function pushToTypesense({
  threads,
  is_restrict,
  logger,
  anonymize,
}: {
  threads: (threads & {
    messages: (messages & {
      author: users | null;
      reactions: messageReactions[];
      attachments: messageAttachments[];
      mentions: (mentions & {
        users: users | null;
      })[];
    })[];
    channel: channels & {
      memberships: {
        usersId: string;
        user: {
          authsId: string | null;
        };
      }[];
    };
  })[];
  is_restrict: boolean;
  logger: Logger;
  anonymize?: AnonymizeType;
}) {
  const documents = threads
    .map((t) =>
      serializer({
        thread: serializeThread(
          anonymize ? anonymizeMessages(t, anonymize) : t
        ),
        is_public: t.channel.type === 'PUBLIC',
        is_restrict,
        accessible_to: t.channel.memberships
          .filter((m) => !!m.user.authsId)
          .map((m) => m.usersId),
      })
    )
    .filter((t) => !!t.body);

  await upsert(documents, logger);
}

async function upsert(
  documents: TypesenseThread[],
  logger: Logger,
  attempt = 1
) {
  try {
    await client
      .collections(collectionSchema.name)
      .documents()
      .import(documents, { action: 'upsert' });
  } catch (error: any) {
    if (error.importResults) {
      logger.log(
        countOccurrences(
          error.importResults
            ?.filter((result: any) => !result.success)
            ?.map((result: any) => result.error)
        )
      );
      return;
    }
    if (attempt > 10) {
      logger.error({ retries_exceeded: attempt });
      throw error;
    }
    if (error.httpStatus === 422) {
      logger.error({ error });
      const wait = Math.pow(2, attempt - 1) * 1000;
      logger.warn({ attempt, wait });
      await delay(wait);
      return upsert(documents, logger, attempt + 1);
    }
    throw error;
  }
}

export async function createUserKeyAndPersist({
  account,
  user,
  isPublic,
}: {
  account: accounts;
  user: users;
  isPublic: boolean;
}) {
  const key = createUserKey({
    keyWithSearchPermissions: env.TYPESENSE_SEARCH_ONLY,
    accountId: account.id,
    userId: user.id,
  });
  const settings: SerializedSearchSettings = {
    apiKey: key.value,
    apiKeyExpiresAt: key.expires_at,
    engine: 'typesense',
    scope: isPublic ? 'public' : 'private',
  };
  await prisma.users.update({
    where: {
      id: user.id,
    },
    data: {
      searchSettings: JSON.stringify(settings),
    },
  });
}

export async function createAccountKeyAndPersist({
  account,
}: {
  account: accounts;
}) {
  const isPublic = account.type === 'PUBLIC';

  const key = isPublic
    ? createAccountKey({
        keyWithSearchPermissions: env.TYPESENSE_SEARCH_ONLY,
        accountId: account.id,
      })
    : undefined;

  const settings: SerializedSearchSettings = {
    engine: 'typesense',
    scope: isPublic ? 'public' : 'private',
    apiKey: key?.value || 'private',
    apiKeyExpiresAt: key?.expires_at,
  };

  await prisma.accounts.update({
    where: {
      id: account.id,
    },
    data: {
      searchSettings: JSON.stringify(settings),
    },
  });
}
