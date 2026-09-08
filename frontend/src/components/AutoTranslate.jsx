// ---------------------------------------------------------------------------
// AUTO-TRANSLATE
//
// Applies the bundled Hindi/Marathi dictionaries to whatever is on screen, so
// every page translates without each of the 58 JSX files having to be rewritten
// around a t() call.
//
// How it works: after React commits, walk the text nodes under <body>, look up
// each one's *original* English text in the dictionary, and swap in the
// translation. The English original is kept on the node, so switching language
// (including back to English) is always applied to the source text rather than
// to an already-translated string.
//
// Dictionaries are bundled, not fetched — PS 26229 requires the app to work
// with no connectivity.
// ---------------------------------------------------------------------------
import { useEffect } from "react";
import { useApp } from "../context/AppContext";
import { getDictionary } from "../services/translationService";

// Nodes whose text is data, not UI copy, or where mutation would break things.
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "PRE", "SVG", "PATH"]);

const ORIGINAL = "__kbcEn";

const isTranslatableNode = (node) => {
  const parent = node.parentElement;
  if (!parent) return false;
  if (SKIP_TAGS.has(parent.tagName)) return false;
  if (parent.closest("[data-no-translate]")) return false;
  const raw = node[ORIGINAL] ?? node.nodeValue;
  if (!raw) return false;
  const text = raw.trim();
  // Pure numbers, currency amounts, dates and codes are left alone.
  if (text.length < 2) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  return true;
};

const applyToTree = (root, dict) => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const pending = [];
  let node = walker.nextNode();
  while (node) {
    if (isTranslatableNode(node)) pending.push(node);
    node = walker.nextNode();
  }

  for (const textNode of pending) {
    // Remember the English exactly once, before anything is swapped.
    if (textNode[ORIGINAL] === undefined) textNode[ORIGINAL] = textNode.nodeValue;
    const english = textNode[ORIGINAL];
    const key = english.trim();

    if (!dict) {
      // Back to English.
      if (textNode.nodeValue !== english) textNode.nodeValue = english;
      continue;
    }

    const translated = dict[key];
    if (!translated) continue;
    // Preserve the original surrounding whitespace so layout does not shift.
    const next = english.replace(key, translated);
    if (textNode.nodeValue !== next) textNode.nodeValue = next;
  }
};

// Attributes that are read aloud or shown as tooltips.
const ATTRS = ["placeholder", "title", "aria-label", "alt"];

const applyAttributes = (root, dict) => {
  const selector = ATTRS.map((a) => `[${a}]`).join(",");
  for (const el of root.querySelectorAll(selector)) {
    if (el.closest("[data-no-translate]")) continue;
    for (const attr of ATTRS) {
      const current = el.getAttribute(attr);
      if (!current) continue;
      const store = `${ORIGINAL}_${attr}`;
      if (el[store] === undefined) el[store] = current;
      const english = el[store];
      if (!dict) {
        if (current !== english) el.setAttribute(attr, english);
        continue;
      }
      const translated = dict[english.trim()];
      if (translated && current !== translated) el.setAttribute(attr, translated);
    }
  }
};

export const AutoTranslate = () => {
  const { language } = useApp();

  useEffect(() => {
    const dict = getDictionary(language);
    let frame = 0;

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        // React wrote a fresh English value into an existing node, so the
        // remembered original is stale. (Our own writes never reach here —
        // the observer is disconnected while applying.)
        if (record.type === "characterData") delete record.target[ORIGINAL];
      }
      run();
    });

    const observe = () =>
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
        attributeFilter: ATTRS,
      });

    const run = () => {
      cancelAnimationFrame(frame);
      // Run after paint so React has finished writing its own text.
      frame = requestAnimationFrame(() => {
        // Detach first: applying mutates text nodes, which would otherwise
        // re-trigger this observer in an endless loop.
        observer.disconnect();
        try {
          applyToTree(document.body, dict);
          applyAttributes(document.body, dict);
        } finally {
          observe();
        }
      });
    };

    run();
    observe();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [language]);

  return null;
};
