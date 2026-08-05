import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section
        aria-labelledby="app-title"
        className="w-full max-w-[560px] rounded-3xl border border-slate-200 bg-white p-12 shadow-[0_24px_64px_rgb(23_36_58_/_10%)]"
      >
        <p className="mb-2 text-xs font-bold tracking-[0.12em] text-blue-600 uppercase">
          Financial App Internship
        </p>
        <h1
          id="app-title"
          className="m-0 text-6xl leading-none font-bold text-slate-900"
        >
          dabuchi
        </h1>
        <p className="mt-6 mb-0 text-slate-600">
          チーム開発の準備ができました。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/transfer"
            className="inline-block rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            送金する
          </Link>
          <Link
            to="/billing"
            className="inline-block rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            請求する
          </Link>
          <Link
            to="/billing/requests"
            className="inline-block rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            請求した相手一覧
          </Link>
        </div>
      </section>
    </main>
  );
}
