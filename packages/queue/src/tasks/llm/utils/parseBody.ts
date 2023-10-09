import { LLMPredictionResponse, SourceDocument, accounts } from '@linen/types';
import { prisma } from '@linen/database';
import { getThreadUrl } from '@linen/utilities/url';

export async function parseBody(
  response: LLMPredictionResponse,
  { account, communityName }: { account: accounts; communityName: string }
): Promise<string> {
  // TODO: if is a url, show it, otherwise, it will be a threadId, we should build the url
  // TODO https urls should not be wrapped by <>
  const references = getReferences(response.sourceDocuments);
  const urls = getUrls(references);
  const threadIds = getThreadIds(references);
  const threads = await prisma.threads.findMany({
    where: {
      id: { in: threadIds },
    },
  });

  const threadUrls = threads.map((thread) => {
    return getThreadUrl({
      isSubDomainRouting: true,
      slug: thread.slug,
      incrementId: thread.incrementId,
      settings: {
        communityName,
        redirectDomain: account.redirectDomain as string | undefined,
      },
      LINEN_URL:
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000'
          : 'https://www.linen.dev',
    });
  });
  console.log('threadUrls', threadUrls);

  const refs = [...urls, ...threadUrls];

  if (refs.length > 0) {
    return [
      response.text,
      'References:',
      refs.map((source) => `- ${source}`).join('\n'),
    ].join('\n\n');
  }
  return response.text;
}

function getUrls(references: string[]) {
  return references.filter(
    (url) => url.startsWith('https://') || url.startsWith('http://')
  );
}

function getThreadIds(references: string[]) {
  return references.filter(
    (url) => !url.startsWith('https://') && !url.startsWith('http://')
  );
}

export function getReferences(documents: SourceDocument[]): string[] {
  const sources: string[] = [];
  documents.forEach((document) => {
    const source =
      document.metadata.source ||
      document.metadata.threadId ||
      document.metadata.id;
    if (source && !sources.includes(source)) {
      sources.push(source);
    }
  });
  return sources;
}
