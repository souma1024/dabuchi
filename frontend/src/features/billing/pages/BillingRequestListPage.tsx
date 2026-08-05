import { UserAvatar } from '../../../components/UserAvatar';
import { recipients } from '../../../lib/mockUsers';
import type { Recipient } from '../../../types/user';
import { billingRequests } from '../mockBillingRequests';

const unknownRecipient: Recipient = { id: '', name: '不明なユーザー' };

function formatCreatedAt(createdAt: string): string {
  return new Date(createdAt).toLocaleString('ja-JP');
}

// 自分が送った請求の一覧画面。バックエンドの請求一覧APIが未確定のため、モックデータを表示する。
// 固定のモックデータを直接参照しているため、BillingAmountPageで作成した請求はこの一覧に反映されない。
// APIが決まり次第、取得処理を関数（またはhook）として1枚挟み、この一覧をそこへ差し替える想定。
export function BillingRequestListPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 bg-slate-50 px-5 py-8">
      <h1 className="text-lg font-bold text-slate-900">請求した相手</h1>

      {billingRequests.length === 0 ? (
        <p className="text-sm text-slate-600">請求履歴はありません。</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {billingRequests.map((billingRequest) => {
            const recipient =
              recipients.find((r) => r.id === billingRequest.billedUserId) ??
              unknownRecipient;

            return (
              <li
                key={billingRequest.id}
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <UserAvatar
                  name={recipient.name}
                  profileUrl={recipient.profileUrl}
                />
                <div className="flex flex-1 flex-col">
                  <span className="text-base font-medium text-slate-800">
                    {recipient.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatCreatedAt(billingRequest.createdAt)}
                  </span>
                </div>
                <span className="text-base font-semibold text-slate-900">
                  {billingRequest.amount.toLocaleString()}円
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
