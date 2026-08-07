import type {
  PaymentRequestDirection,
  PaymentRequestState,
  PaymentRequestSummary,
} from '../../domain/paymentRequest.js';
import { mysqlDateTimeToIso } from '../../shared/mysqlDateTime.js';
import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import type { CurrentUserRepository } from '../ports/currentUserRepository.js';
import type {
  PaymentRequestCursor,
  PaymentRequestQueryRepository,
} from '../ports/paymentRequestQueryRepository.js';

const PAYMENT_REQUEST_PAGE_SIZE = 20;

export interface ListPaymentRequestsInput {
  /** 公開user_id。内部UUIDではない。 */
  currentUserId: string;
  direction: PaymentRequestDirection;
  status: PaymentRequestState | null;
  cursor: PaymentRequestCursor | null;
}

export interface ListPaymentRequestsResult {
  requests: PaymentRequestSummary[];
  nextCursor: PaymentRequestCursor | null;
}

export class ListPaymentRequests {
  constructor(
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly repository: PaymentRequestQueryRepository,
  ) {}

  async execute(
    input: ListPaymentRequestsInput,
  ): Promise<ListPaymentRequestsResult> {
    // 受け取るのは公開user_idなので、payment_requestsを引く前に内部UUIDへ解決する。
    const currentUser = await this.currentUserRepository.findByUserId(
      input.currentUserId,
    );

    if (!currentUser) {
      throw new CurrentUserNotFoundError();
    }

    // 表示件数より1件多く取得し、追加queryなしで次ページの有無を判定する。
    const records = await this.repository.findPaymentRequests({
      currentUserInternalId: currentUser.id,
      direction: input.direction,
      status: input.status,
      cursor: input.cursor,
      limit: PAYMENT_REQUEST_PAGE_SIZE + 1,
    });
    const hasNextPage = records.length > PAYMENT_REQUEST_PAGE_SIZE;
    const visibleRecords = records.slice(0, PAYMENT_REQUEST_PAGE_SIZE);
    const lastVisibleRecord = visibleRecords.at(-1);

    return {
      requests: visibleRecords.map((record) => ({
        id: record.id,
        counterparty: {
          id: record.counterpartyId,
          name: record.counterpartyName,
          profileUrl: record.counterpartyProfileUrl,
        },
        amount: record.amount,
        status: record.status,
        endedByMe: record.endedByMe,
        createdAt: mysqlDateTimeToIso(record.createdAt),
        respondedAt:
          record.respondedAt === null
            ? null
            : mysqlDateTimeToIso(record.respondedAt),
      })),
      nextCursor:
        hasNextPage && lastVisibleRecord
          ? { createdAt: lastVisibleRecord.createdAt, id: lastVisibleRecord.id }
          : null,
    };
  }
}
