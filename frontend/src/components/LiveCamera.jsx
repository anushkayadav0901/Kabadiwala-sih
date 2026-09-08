import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  HiOutlineCamera, HiArrowPath, HiXMark,
  HiOutlineBolt, HiOutlineArrowUpTray, HiExclamationCircle
} from "react-icons/hi2";
import { loadScanModel, modelMaterials } from "../services/estimateService";
import { formatCurrency } from "../utils/helpers";

const AR_INTERVAL_MS = 900;
const AR_MIN_CONFIDENCE = 40;

export const LiveCamera = ({ onCapture, onClose, onFallbackUpload }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const arLoopRef = useRef(null);
  const arCanvasRef = useRef(null);

  const [facingMode, setFacingMode] = useState("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [shutterFlash, setShutterFlash] = useState(false);

  const [arResult, setArResult] = useState(null);
  const [arReady, setArReady] = useState(false);
  const modelRef = useRef(null);

  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      }).catch(() => setHasMultipleCameras(true));
    } else {
      setHasMultipleCameras(true);
    }
  }, []);

  // Load ML model in background
  useEffect(() => {
    let cancelled = false;
    loadScanModel()
      .then((m) => { if (!cancelled) { modelRef.current = m; setArReady(true); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Start / restart camera stream
  useEffect(() => {
    let isCancelled = false;

    const startCamera = async () => {
      setIsLoading(true);
      setCameraError("");

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Your browser does not support in-app camera access. Please use the upload option.");
        setIsLoading(false);
        return;
      }

      try {
        const constraints = {
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (isCancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try { await videoRef.current.play(); } catch {}
        }

        const track = stream.getVideoTracks()[0];
        if (track?.getCapabilities) {
          setHasTorch(Boolean(track.getCapabilities().torch));
        }
        setIsLoading(false);
      } catch {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (isCancelled) { fallbackStream.getTracks().forEach((t) => t.stop()); return; }
          streamRef.current = fallbackStream;
          if (videoRef.current) { videoRef.current.srcObject = fallbackStream; await videoRef.current.play(); }
          setIsLoading(false);
        } catch (fallbackErr) {
          let msg = "Camera permission was denied or camera is unavailable.";
          if (fallbackErr.name === "NotAllowedError") msg = "Camera permission denied. Please allow camera access in browser settings or upload a photo.";
          else if (fallbackErr.name === "NotFoundError" || fallbackErr.name === "DevicesNotFoundError") msg = "No camera found on this device. Please upload a photo from your gallery.";
          setCameraError(msg);
          setIsLoading(false);
        }
      }
    };

    startCamera();
    return () => {
      isCancelled = true;
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    };
  }, [facingMode]);

  // ── AR classification loop ──────────────────────────────────────────
  const classifyFrame = useCallback(async () => {
    const video = videoRef.current;
    const model = modelRef.current;
    if (!video || !model || !video.videoWidth || video.paused) return;

    if (!arCanvasRef.current) arCanvasRef.current = document.createElement("canvas");
    const canvas = arCanvasRef.current;
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, 224, 224);

    try {
      const predictions = await model.predict(canvas);
      const sorted = predictions
        .map(({ className, probability }) => ({ label: className, confidence: Math.round(probability * 100) }))
        .sort((a, b) => b.confidence - a.confidence);

      const top = sorted[0];
      if (top && top.confidence >= AR_MIN_CONFIDENCE) {
        const mat = modelMaterials[top.label];
        setArResult({
          label: top.label,
          confidence: top.confidence,
          name: mat?.name || top.label,
          price: mat?.pricePerKg || 0,
          icon: mat?.icon || "📦",
          unit: mat?.unit || "kg"
        });
      } else {
        setArResult(null);
      }
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    if (!arReady || isLoading || cameraError) return;
    arLoopRef.current = setInterval(classifyFrame, AR_INTERVAL_MS);
    return () => clearInterval(arLoopRef.current);
  }, [arReady, isLoading, cameraError, classifyFrame]);

  const handleFlipCamera = () => setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));

  const handleToggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track?.applyConstraints) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchOn(nextState);
      } catch {}
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    clearInterval(arLoopRef.current);
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 150);

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (facingMode === "user") { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    onCapture(dataUrl);
  };

  return (
    <div className="relative rounded-[22px] overflow-hidden bg-black aspect-[3/4] sm:aspect-[4/3] flex flex-col justify-between shadow-2xl border border-white/10 select-none">
      {shutterFlash && <div className="absolute inset-0 z-40 bg-white pointer-events-none transition-opacity duration-150" />}

      {/* Camera Video Stream */}
      <video
        ref={videoRef}
        autoPlay playsInline muted
        className={`w-full h-full object-cover absolute inset-0 transition-transform duration-300 ${facingMode === "user" ? "-scale-x-100" : ""}`}
      />

      {/* Viewfinder Reticle */}
      <div className="absolute inset-0 pointer-events-none z-10 p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <span className="w-6 h-6 border-t-2 border-l-2 border-white/70 rounded-tl" />
          <span className="w-6 h-6 border-t-2 border-r-2 border-white/70 rounded-tr" />
        </div>

        {/* ── AR overlay label ──────────────────────────────────── */}
        <div className="self-center">
          <AnimatePresence mode="wait">
            {arResult ? (
              <motion.div
                key={arResult.label}
                initial={{ opacity: 0, scale: 0.9, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl
                           bg-black/60 backdrop-blur-xl border border-white/20
                           shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
              >
                <span className="text-xl leading-none">{arResult.icon}</span>
                <div className="min-w-0">
                  <p className="text-white font-bold text-[13.5px] leading-tight truncate">
                    {arResult.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-white/70 text-[11px] font-semibold tnum">
                      {arResult.confidence}% match
                    </span>
                    {arResult.price > 0 && (
                      <>
                        <span className="w-px h-3 bg-white/25" />
                        <span className="text-green-400 text-[11.5px] font-bold tnum">
                          {formatCurrency(arResult.price)}/{arResult.unit}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : arReady && !isLoading && !cameraError ? (
              <motion.span
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md
                           text-white/80 text-[11.5px] font-medium border border-white/15
                           flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Scanning for materials…
              </motion.span>
            ) : (
              <motion.span
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md
                           text-white/90 text-[11.5px] font-medium border border-white/15"
              >
                Point camera at scrap or e-waste
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-end">
          <span className="w-6 h-6 border-b-2 border-l-2 border-white/70 rounded-bl" />
          <span className="w-6 h-6 border-b-2 border-r-2 border-white/70 rounded-br" />
        </div>
      </div>

      {/* Top Bar */}
      <div className="relative z-20 p-3.5 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white grid place-items-center hover:bg-black/60 tap active:scale-95 transition-all border border-white/10"
          aria-label="Close camera"
        >
          <HiXMark className="text-xl" />
        </button>

        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={handleToggleTorch}
              className={`w-10 h-10 rounded-full backdrop-blur-md grid place-items-center tap active:scale-95 transition-all border ${
                torchOn ? "bg-gold-500 text-ink border-gold-400 shadow-md" : "bg-black/40 text-white/80 border-white/10 hover:bg-black/60"
              }`}
              aria-label="Toggle flashlight"
            >
              <HiOutlineBolt className="text-lg" />
            </button>
          )}

          {arReady && (
            <span className="px-2.5 py-1 rounded-full bg-green-500/20 backdrop-blur-md text-green-400 text-[10px] font-bold border border-green-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              AI Live
            </span>
          )}

          <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white/80 text-[11px] font-semibold border border-white/10">
            {facingMode === "environment" ? "Back" : "Front"}
          </span>
        </div>
      </div>

      {/* Loading */}
      {isLoading && !cameraError && (
        <div className="absolute inset-0 z-20 bg-ink/80 backdrop-blur-xs grid place-items-center">
          <div className="flex flex-col items-center gap-3">
            <span className="w-10 h-10 rounded-full border-[3px] border-white/20 border-t-brand-400 animate-spin" />
            <span className="text-white text-[13px] font-medium">Starting live camera…</span>
          </div>
        </div>
      )}

      {/* Camera Error */}
      {cameraError && (
        <div className="absolute inset-0 z-30 bg-ink/95 p-6 flex flex-col items-center justify-center text-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-alert-500/20 text-alert-400 grid place-items-center">
            <HiExclamationCircle className="text-2xl" />
          </span>
          <h4 className="text-white font-bold text-[16px]">Camera Unavailable</h4>
          <p className="text-white/70 text-[12.5px] max-w-[28ch] leading-relaxed">{cameraError}</p>
          <div className="flex flex-col gap-2 mt-3 w-full max-w-[240px]">
            {onFallbackUpload && (
              <label className="h-11 rounded-xl bg-brand-600 text-white font-semibold text-[13.5px] flex items-center justify-center gap-2 cursor-pointer tap hover:bg-brand-500">
                <HiOutlineArrowUpTray className="text-base" />
                Upload from Gallery
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { const reader = new FileReader(); reader.onloadend = () => onCapture(reader.result); reader.readAsDataURL(file); }
                }} className="hidden" />
              </label>
            )}
            <button onClick={onClose} className="h-10 rounded-xl bg-white/10 text-white font-medium text-[13px] tap hover:bg-white/20">Cancel</button>
          </div>
        </div>
      )}

      {/* Bottom Shutter Controls */}
      <div className="relative z-20 p-5 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-around">
        <label
          className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md text-white grid place-items-center cursor-pointer tap active:scale-95 transition-all border border-white/15 hover:bg-white/25"
          aria-label="Upload photo"
        >
          <HiOutlineArrowUpTray className="text-xl" />
          <input type="file" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) { const reader = new FileReader(); reader.onloadend = () => onCapture(reader.result); reader.readAsDataURL(file); }
          }} className="hidden" />
        </label>

        <button
          onClick={handleCapture}
          disabled={isLoading || Boolean(cameraError)}
          className="relative w-18 h-18 rounded-full border-4 border-white flex items-center justify-center tap active:scale-90 transition-all shadow-xl disabled:opacity-40"
          aria-label="Take Photo"
        >
          <span className="w-14 h-14 rounded-full bg-white active:bg-slate-200 transition-colors" />
        </button>

        <button
          onClick={handleFlipCamera}
          disabled={isLoading || Boolean(cameraError)}
          className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md text-white grid place-items-center tap active:scale-95 transition-all border border-white/15 hover:bg-white/25 disabled:opacity-40"
          aria-label="Flip Camera"
        >
          <motion.div
            animate={{ rotate: facingMode === "user" ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            <HiArrowPath className="text-xl" />
          </motion.div>
        </button>
      </div>
    </div>
  );
};
