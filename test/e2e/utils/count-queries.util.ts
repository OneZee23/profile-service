import { PrismaService } from '@/infra/database/prisma.service';

interface PrismaQueryEvent {
  query: string;
  params: string;
  duration: number;
}

interface QueryEventEmitter {
  $on(eventType: 'query', callback: (event: PrismaQueryEvent) => void): void;
}

export interface QueryCounter {
  readonly queries: string[];
  startCounting(): Promise<void>;
  settle(): Promise<void>;
}

const EVENT_DELIVERY_MS = 50;

const TRANSACTION_CONTROL_STATEMENTS = new Set([
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'DEALLOCATE ALL',
]);

function isTransactionControl(query: string): boolean {
  return TRANSACTION_CONTROL_STATEMENTS.has(query.trim().toUpperCase());
}

function waitForPendingEvents(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, EVENT_DELIVERY_MS);
  });
}

export function countQueries(prisma: PrismaService): QueryCounter {
  const queries: string[] = [];

  (prisma as unknown as QueryEventEmitter).$on('query', (event) => {
    if (isTransactionControl(event.query)) return;

    queries.push(event.query);
  });

  return {
    queries,

    async startCounting(): Promise<void> {
      await waitForPendingEvents();
      queries.length = 0;
    },

    settle: waitForPendingEvents,
  };
}
