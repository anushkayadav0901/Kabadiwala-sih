import React, { useEffect, useState } from "react";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { Card } from "../components/Card";
import { Loader } from "../components/Loader";
import { MaterialIcon } from "../components/icons/MaterialIcon";
import {
  getCollectorTransactions,
  getCollectorEarningsSummary
} from "../services/transactionService";
import { formatCurrency } from "../utils/helpers";
import { useApp } from "../context/AppContext";
import { HiOutlineWallet, HiCheckCircle, HiOutlineInformationCircle } from "react-icons/hi2";

export const Earnings = () => {
  const { t, user } = useApp();
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      getCollectorEarningsSummary(user.id),
      getCollectorTransactions(user.id)
    ])
      .then(([s, txs]) => {
        setSummary(s);
        setTransactions(txs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (loading) {
    return (
      <div className="screen pb-nav">
        <Navbar title={t("earnings") || "My earnings"} />
        <main className="col px-4 pt-4">
          <Loader message="Loading earnings" />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="screen pb-nav">
      <Navbar title={t("earnings") || "My earnings"} />

      <main className="col px-4 pt-4 flex flex-col gap-4">
        {/* ---- passbook total -------------------------------------------- */}
        <section className="rounded-[18px] bg-ink text-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow text-white/50">Total earned</p>
              <p className="font-bold text-[38px] tnum tracking-[-0.03em] leading-none mt-2">
                {formatCurrency(summary?.totalEarnings || 0)}
              </p>
              <p className="text-[13px] text-white/60 mt-2.5 tnum">
                Across {summary?.completedDeals || 0} completed sales
              </p>
            </div>
            <span className="w-11 h-11 shrink-0 rounded-xl bg-white/10 grid place-items-center">
              <HiOutlineWallet className="text-[22px]" />
            </span>
          </div>
        </section>

        {/* ---- periods ---------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-2.5">
          <Card>
            <p className="eyebrow">Today</p>
            <p className="font-bold text-[24px] tnum tracking-[-0.02em] mt-1.5">
              {formatCurrency(summary?.todayEarnings || 0)}
            </p>
          </Card>
          <Card>
            <p className="eyebrow">This month</p>
            <p className="font-bold text-[24px] tnum tracking-[-0.02em] mt-1.5">
              {formatCurrency(summary?.monthlyEarnings || 0)}
            </p>
          </Card>
        </div>

        {/* ---- honest state note ------------------------------------------ */}
        <div className="flex items-start gap-2.5 px-1">
          <HiOutlineInformationCircle className="text-faint text-base shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-faint leading-snug">
            Sample history. Completed sales are not written to the ledger yet — that needs a
            backend or a local store.
          </p>
        </div>

        {/* ---- history ----------------------------------------------------- */}
        <section>
          <div className="sec-head">
            <h3 className="sec-title">Recent sales</h3>
            <span className="text-[12.5px] font-medium text-faint tnum">
              {transactions.length} entries
            </span>
          </div>

          {transactions.length === 0 ? (
            <Card className="text-center py-8">
              <p className="text-[14px] font-semibold text-ink">No sales yet</p>
              <p className="text-[13px] text-muted mt-1 max-w-[30ch] mx-auto">
                Create a lot and sell it to a depot — it will show up here.
              </p>
            </Card>
          ) : (
            <div className="card divide-y divide-hair overflow-hidden">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center gap-3">
                  <MaterialIcon material={{ name: tx.materialName }} size="md" tone="ink" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold text-ink truncate">
                      {tx.materialName}
                    </p>
                    <p className="text-[12.5px] text-faint tnum truncate">
                      {Number(tx.weightKg || 0).toFixed(2)} kg · {tx.recyclerName}
                    </p>
                    <p className="text-[11.5px] text-faint mt-0.5">{tx.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-[16px] tnum text-ink">
                      +{formatCurrency(tx.totalAmount)}
                    </p>
                    <p className="text-[11.5px] font-semibold text-brand-600 flex items-center justify-end gap-1 mt-0.5">
                      <HiCheckCircle className="text-[12px]" />
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
};
