// ---------------------------------------------------------------------------
// PARALLEL FEATURE EXTRACTION
//
// Distributes (image, view) pairs across forked feature-worker processes and
// skips any view already present in the cache. Because the backbone is frozen,
// an embedding depends only on the image bytes, the view and PREPROCESS_VERSION,
// which is exactly what the cache is keyed on.
// ---------------------------------------------------------------------------
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PREPROCESS_VERSION } from "./image-io.mjs";
import { viewPath } from "./feature-worker.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ML = path.resolve(HERE, "..");
export const CACHE_DIR = path.join(ML, "experiments", "_features", `v${PREPROCESS_VERSION}`);
const FEATURE_DIM = 1280;

export const readView = (sha1, view) => {
  const buf = fs.readFileSync(viewPath(CACHE_DIR, sha1, view));
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + FEATURE_DIM * 4));
};

export const hasView = (sha1, view) => fs.existsSync(viewPath(CACHE_DIR, sha1, view));

/**
 * @param {{sha1:string,file:string,views:string[]}[]} requests
 *        views are "clean" or "a<N>" (augmented view N).
 */
export const extractViews = async (requests, { workers = Number(process.env.WORKERS) || Math.max(1, Math.min(6, os.cpus().length - 2)), label = "views" } = {}) => {
  const todo = requests
    .map((r) => ({ ...r, views: r.views.filter((v) => !hasView(r.sha1, v)) }))
    .filter((r) => r.views.length);
  const totalViews = todo.reduce((n, r) => n + r.views.length, 0);
  const cachedViews = requests.reduce((n, r) => n + r.views.length, 0) - totalViews;
  if (!totalViews) {
    console.log(`  ${label}: all ${cachedViews} cached`);
    return;
  }
  console.log(`  ${label}: ${totalViews} to extract (${cachedViews} cached) on ${workers} workers`);

  // Small chunks keep the queue balanced and progress updates frequent.
  const chunks = [];
  let current = [];
  let size = 0;
  for (const r of todo) {
    current.push(r);
    size += r.views.length;
    if (size >= 8) { chunks.push(current); current = []; size = 0; }
  }
  if (current.length) chunks.push(current);

  const started = Date.now();
  let doneViews = 0;
  let lastLog = 0;
  const failures = [];

  await new Promise((resolve, reject) => {
    let active = 0;
    let next = 0;
    const pool = [];
    const dispatch = (child) => {
      if (next >= chunks.length) {
        child.kill();
        active -= 1;
        if (active === 0) resolve();
        return;
      }
      child.send({ type: "job", cacheDir: CACHE_DIR, items: chunks[next] });
      next += 1;
    };
    for (let w = 0; w < workers; w += 1) {
      const child = fork(path.join(HERE, "feature-worker.mjs"), [], { stdio: ["ignore", "ignore", "pipe", "ipc"] });
      pool.push(child);
      active += 1;
      child.stderr.on("data", () => {}); // tfjs prints a tfjs-node advert to stderr
      child.on("message", (msg) => {
        if (msg.type === "ready") return dispatch(child);
        if (msg.type === "error") failures.push(...msg.items.map((f) => `${f}: ${msg.message}`));
        if (msg.type === "done") doneViews += msg.views;
        if (msg.type === "done" || msg.type === "error") {
          const now = Date.now();
          if (now - lastLog > 15000 || doneViews >= totalViews) {
            lastLog = now;
            const rate = doneViews / ((now - started) / 1000);
            const eta = rate > 0 ? Math.round((totalViews - doneViews) / rate) : 0;
            console.log(`    ${doneViews}/${totalViews} ${label} (${rate.toFixed(1)}/s, ~${Math.floor(eta / 60)}m${eta % 60}s left)`);
          }
          dispatch(child);
        }
      });
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code && code !== 0 && next < chunks.length) reject(new Error(`feature worker exited with code ${code}`));
      });
    }
  });

  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  console.log(`  ${label}: extracted ${doneViews} in ${seconds}s`);
  if (failures.length) {
    console.warn(`  ${failures.length} image(s) failed to extract:`);
    failures.slice(0, 10).forEach((f) => console.warn(`    ${f}`));
  }
};
