import type { PaymentRequestSummary } from '../../domain/paymentRequest.js';
import { mysqlDateTimeToIso } from '../../shared/mysqlDateTime.js';
import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import {
  InvalidPaymentRequestIdError,
  PaymentRequestNotFoundError,
} from '../errors/paymentRequestCommandErrors.js';
import type { CurrentUserRepository } from '../ports/currentUserRepository.js';
import type { PaymentRequestListRepository } from '../ports/paymentRequestListRepository.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface GetPaymentRequestInput {
  /** 公開user_id。内部UUIDではない。 */
  currentUserId: string;
  paymentRequestId: string;
}

export class GetPaymentRequest {
  constructor(
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly repository: PaymentRequestListRepository,
  ) {}

  async execute(input: GetPaymentRequestInput): Promise<PaymentRequestSummary> {
    if (!UUID_PATTERN.test(input.paymentRequestId)) {
      throw new InvalidPaymentRequestIdError();
    }

    // 受け取るのは公開user_idなので、payment_requestsを引く前に内部UUIDへ解決する。
    const currentUser = await this.currentUserRepository.findByUserId(
      input.currentUserId,
    );

    if (!currentUser) {
      throw new CurrentUserNotFoundError();
    }

    const record = await this.repository.findPaymentRequestById({
      paymentRequestId: input.paymentRequestId,
      currentUserInternalId: currentUser.id,
    });

    // 当事者でない場合もrepositoryはnullを返す。存在の有無を区別せず404にして、
    // 他人の請求IDを当てられても存在を確認できないようにする。
    if (!record) {
      throw new PaymentRequestNotFoundError();
    }

    return {
      id: record.id,
      counterparty: {
        id: record.counterpartyId,
        name: record.counterpartyName,
        profileUrl: record.counterpartyProfileUrl,
      },
      amount: record.amount,
      status: record.status,
      createdAt: mysqlDateTimeToIso(record.createdAt),
      respondedAt:
        record.respondedAt === null
          ? null
          : mysqlDateTimeToIso(record.respondedAt),
    };
  }
}
