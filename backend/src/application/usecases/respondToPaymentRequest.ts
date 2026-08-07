import type {
  PaymentRequestAction,
  PaymentRequestResponse,
} from '../../domain/paymentRequest.js';
import { mysqlDateTimeToIso } from '../../shared/mysqlDateTime.js';
import { CurrentUserNotFoundError } from '../errors/currentUserNotFoundError.js';
import { InvalidPaymentRequestIdError } from '../errors/paymentRequestCommandErrors.js';
import type { CurrentUserRepository } from '../ports/currentUserRepository.js';
import type { PaymentRequestCommandRepository } from '../ports/paymentRequestCommandRepository.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RespondToPaymentRequestInput {
  /** 公開user_id。内部UUIDではない。 */
  currentUserId: string;
  paymentRequestId: string;
  action: PaymentRequestAction;
}

export interface RespondToPaymentRequestResult {
  request: {
    id: string;
    amount: number;
    status: PaymentRequestResponse;
    respondedAt: string;
  };
  /** 承認後の残高。拒否・取り消しでは残高が動かないためnull。 */
  balance: number | null;
}

export class RespondToPaymentRequest {
  constructor(
    private readonly currentUserRepository: CurrentUserRepository,
    private readonly repository: PaymentRequestCommandRepository,
  ) {}

  async execute(
    input: RespondToPaymentRequestInput,
  ): Promise<RespondToPaymentRequestResult> {
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

    // 状態確認・権限確認・残高移動・状態更新は、割り込みを防ぐため
    // repository側の単一transactionにまとめてある。
    const responded = await this.repository.respond({
      paymentRequestId: input.paymentRequestId,
      currentUserInternalId: currentUser.id,
      action: input.action,
    });

    return {
      request: {
        id: responded.id,
        amount: responded.amount,
        status: responded.status,
        respondedAt: mysqlDateTimeToIso(responded.respondedAt),
      },
      balance: responded.recipientBalance,
    };
  }
}
