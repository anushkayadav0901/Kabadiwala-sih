import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineArrowPath, HiOutlineCloud, HiCheck, HiExclamationTriangle } from "react-icons/hi2";
import { getPendingCount } from "../utils/offlineStore";
import { syncPendingLots } from "../services/lotService";
import { useApp } from "../context/AppContext";

export const OfflineSyncBanner = () => {
  const { isOnline } = useApp();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const refreshCount = useCallback(async () => {
    try { setPendingCount(await getPendingCount()); } catch { /* idb unavailable */ }
  }, []);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 5000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !syncing) {
      handleSync();
    }
  }, [isOnline]);

  const handleSync = async () => {
    if (syncing || !isOnline) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncPendingLots();
      setSyncResult(result);
      await refreshCount();
      if (result.synced > 0) {
        setTimeout(() => setSyncResult(null), 4000);
      }
    } catch {
      setSyncResult({ synced: 0, failed: pendingCount, pending: pendingCount });
    } finally {
      setSyncing(false);
    }
  };

  if (pendingCount === 0 && !syncResult) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        {syncResult?.synced > 0 && syncResult.pending === 0 ? (
          <div className="bg-green-50 border-b border-green-100 px-4 py-2 flex items-center justify-center gap-2">
            <HiCheck className="text-green-600 text-sm" />
            <span className="text-[12px] font-semibold text-green-700">
              {syncResult.synced} lot{syncResult.synced > 1 ? "s" : ""} synced successfully
            </span>
          </div>
        ) : syncResult?.failed > 0 ? (
          <div className="bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiExclamationTriangle className="text-amber-600 text-sm" />
              <span className="text-[12px] font-semibold text-amber-700">
                {syncResult.failed} lot{syncResult.failed > 1 ? "s" : ""} failed to sync
              </span>
            </div>
            <button onClick={handleSync} className="text-[11px] font-bold text-amber-700 underline tap">
              Retry
            </button>
          </div>
        ) : pendingCount > 0 ? (
          <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HiOutlineCloud className="text-blue-600 text-sm" />
              <span className="text-[12px] font-semibold text-blue-700">
                {pendingCount} lot{pendingCount > 1 ? "s" : ""} saved offline
                {!isOnline && " — will sync when online"}
              </span>
            </div>
            {isOnline && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-700 tap"
              >
                <HiOutlineArrowPath className={`text-xs ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync now"}
              </button>
            )}
          </div>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
};
