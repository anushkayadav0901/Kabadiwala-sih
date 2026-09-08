import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Navbar } from "../components/Navbar";
import { BottomNavigation } from "../components/BottomNavigation";
import { useApp } from "../context/AppContext";
import { MODULES, loadProgress, saveProgress, TOTAL_QUESTIONS } from "../data/trainingModules";
import {
  HiOutlineAcademicCap, HiCheckCircle, HiOutlineExclamationTriangle,
  HiChevronRight, HiChevronLeft, HiOutlineLightBulb, HiXMark,
  HiOutlineArrowPath, HiOutlineTrophy, HiOutlineClock
} from "react-icons/hi2";

const SEVERITY = {
  critical: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", label: "Never do this" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "Take care" },
};

// ---------------------------------------------------------------------------
// Lesson cards — swipe/step through one idea at a time.
// ---------------------------------------------------------------------------
const LessonView = ({ module, onFinish, onClose }) => {
  const [index, setIndex] = useState(0);
  const lesson = module.lessons[index];
  const isLast = index === module.lessons.length - 1;
  const sev = lesson.severity ? SEVERITY[lesson.severity] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="w-9 h-9 rounded-lg bg-sunken grid place-items-center tap shrink-0">
          <HiXMark className="text-lg" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink truncate">{module.title}</p>
          <p className="text-[11.5px] text-faint">Lesson {index + 1} of {module.lessons.length}</p>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-sunken overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: module.color }}
          animate={{ width: `${((index + 1) / module.lessons.length) * 100}%` }}
          transition={{ duration: 0.3 }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={index}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }} className="card p-5">
          {sev && (
            <span className={`badge ${sev.bg} ${sev.text} mb-3 inline-flex items-center gap-1`}>
              <HiOutlineExclamationTriangle className="text-[13px]" /> {sev.label}
            </span>
          )}
          <h3 className="text-[19px] font-bold text-ink leading-tight tracking-[-0.015em]">{lesson.heading}</h3>
          <p className="text-[14.5px] leading-relaxed mt-3" style={{ color: "var(--color-muted)" }}>{lesson.body}</p>

          <div className={`mt-4 p-3 rounded-xl flex items-start gap-2.5 ${sev ? `${sev.bg} border ${sev.border}` : "bg-brand-50"}`}>
            <HiOutlineLightBulb className={`text-base shrink-0 mt-0.5 ${sev ? sev.text : "text-brand-600"}`} />
            <p className={`text-[13px] leading-snug font-medium ${sev ? sev.text : "text-brand-700"}`}>{lesson.tip}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-2.5">
        <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}
          className="h-12 px-4 rounded-xl bg-sunken text-ink font-semibold text-[14px]
                     flex items-center gap-1 tap disabled:opacity-40 transition-opacity">
          <HiChevronLeft className="text-lg" /> Back
        </button>
        <button onClick={() => (isLast ? onFinish() : setIndex((i) => i + 1))}
          className="flex-1 h-12 rounded-xl text-white font-semibold text-[14.5px]
                     flex items-center justify-center gap-1.5 tap transition-opacity active:opacity-90"
          style={{ background: module.color }}>
          {isLast ? "Take the quiz" : "Next"} <HiChevronRight className="text-lg" />
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Quiz — immediate feedback with the reason, so a wrong answer still teaches.
// ---------------------------------------------------------------------------
const QuizView = ({ module, onComplete, onClose }) => {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const question = module.quiz[index];
  const isLast = index === module.quiz.length - 1;
  const answered = picked !== null;
  const isRight = picked === question.answer;

  // correctCount already includes this question — choose() incremented it.
  const next = () => {
    if (isLast) return onComplete(correctCount);
    setIndex((i) => i + 1);
    setPicked(null);
  };

  const choose = (i) => {
    if (answered) return;
    setPicked(i);
    if (i === question.answer) setCorrectCount((c) => c + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="w-9 h-9 rounded-lg bg-sunken grid place-items-center tap shrink-0">
          <HiXMark className="text-lg" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink truncate">{module.title} — Quiz</p>
          <p className="text-[11.5px] text-faint">Question {index + 1} of {module.quiz.length}</p>
        </div>
        <span className="badge bg-sunken text-faint tnum shrink-0">{correctCount} correct</span>
      </div>

      <div className="h-1.5 rounded-full bg-sunken overflow-hidden">
        <motion.div className="h-full rounded-full" style={{ background: module.color }}
          animate={{ width: `${((index + 1) / module.quiz.length) * 100}%` }} transition={{ duration: 0.3 }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}>
          <div className="card p-5">
            <h3 className="text-[17px] font-bold text-ink leading-snug tracking-[-0.01em]">{question.q}</h3>
            <div className="flex flex-col gap-2 mt-4">
              {question.options.map((opt, i) => {
                const isAnswer = i === question.answer;
                const isPicked = i === picked;
                let cls = "border-line bg-surface text-ink";
                if (answered && isAnswer) cls = "border-green-300 bg-green-50 text-green-800";
                else if (answered && isPicked) cls = "border-red-300 bg-red-50 text-red-800";
                else if (answered) cls = "border-line bg-surface text-faint";
                return (
                  <button key={i} onClick={() => choose(i)} disabled={answered}
                    className={`w-full p-3.5 rounded-xl border text-left text-[14px] font-medium
                                flex items-center gap-2.5 tap transition-colors ${cls}`}>
                    <span className="w-5 h-5 shrink-0 rounded-full border-2 grid place-items-center text-[11px] font-bold"
                      style={{ borderColor: "currentColor" }}>
                      {answered && isAnswer ? "✓" : answered && isPicked ? "✕" : String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {answered && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={`mt-3 p-3.5 rounded-xl border flex items-start gap-2.5 ${
                isRight ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
              }`}>
              <span className={`text-lg shrink-0 ${isRight ? "text-green-600" : "text-amber-600"}`}>
                {isRight ? "✓" : "!"}
              </span>
              <div>
                <p className={`text-[13px] font-semibold ${isRight ? "text-green-800" : "text-amber-800"}`}>
                  {isRight ? "Correct" : "Not quite"}
                </p>
                <p className={`text-[12.5px] leading-snug mt-0.5 ${isRight ? "text-green-700" : "text-amber-700"}`}>
                  {question.why}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {answered && (
        <button onClick={next}
          className="h-12 rounded-xl text-white font-semibold text-[14.5px] flex items-center justify-center gap-1.5 tap active:opacity-90"
          style={{ background: module.color }}>
          {isLast ? "Finish module" : "Next question"} <HiChevronRight className="text-lg" />
        </button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
export const Training = () => {
  const { user } = useApp();
  const [progress, setProgress] = useState(loadProgress);
  const [active, setActive] = useState(null);
  const [stage, setStage] = useState("lessons");
  const [result, setResult] = useState(null);

  useEffect(() => { saveProgress(progress); }, [progress]);

  const completedModules = MODULES.filter((m) => progress[m.id]?.passed).length;
  const allDone = completedModules === MODULES.length;
  const totalCorrect = MODULES.reduce((s, m) => s + (progress[m.id]?.score || 0), 0);

  const finishQuiz = (score) => {
    const m = active;
    const passed = score >= Math.ceil(m.quiz.length * 0.6);
    setProgress((p) => ({
      ...p,
      [m.id]: { score, total: m.quiz.length, passed, completedAt: new Date().toISOString() },
    }));
    setResult({ score, total: m.quiz.length, passed, module: m });
    setStage("result");
    if (passed) {
      confetti({ particleCount: 70, spread: 62, origin: { y: 0.6 }, colors: [m.color, "#F0A020", "#3A34D4"] });
    }
  };

  const closeAll = () => { setActive(null); setStage("lessons"); setResult(null); };

  // --- module runner ---
  if (active) {
    return (
      <div className="screen pb-nav">
        <Navbar title="Training" showBack={false} />
        <main className="col px-4 pt-4">
          {stage === "lessons" && (
            <LessonView module={active} onClose={closeAll} onFinish={() => setStage("quiz")} />
          )}
          {stage === "quiz" && (
            <QuizView module={active} onClose={closeAll} onComplete={finishQuiz} />
          )}
          {stage === "result" && result && (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col gap-4 pt-6">
              <div className="card p-6 text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto grid place-items-center text-3xl"
                  style={{ background: `${result.module.color}18` }}>
                  {result.passed ? "🎉" : "📖"}
                </div>
                <h3 className="text-[20px] font-bold text-ink mt-3 tracking-[-0.015em]">
                  {result.passed ? "Module complete" : "Almost there"}
                </h3>
                <p className="text-[14px] text-faint mt-1">
                  You answered <strong className="text-ink tnum">{result.score} of {result.total}</strong> correctly
                </p>
                {!result.passed && (
                  <p className="text-[13px] text-faint mt-2 leading-snug">
                    Review the lessons and try again — you need {Math.ceil(result.total * 0.6)} correct to pass.
                  </p>
                )}
              </div>

              <div className="flex gap-2.5">
                <button onClick={() => { setStage("lessons"); setResult(null); }}
                  className="flex-1 h-12 rounded-xl bg-sunken text-ink font-semibold text-[14px] flex items-center justify-center gap-1.5 tap">
                  <HiOutlineArrowPath className="text-base" /> Review
                </button>
                <button onClick={closeAll}
                  className="flex-1 h-12 rounded-xl text-white font-semibold text-[14.5px] tap active:opacity-90"
                  style={{ background: result.module.color }}>
                  Done
                </button>
              </div>
            </motion.div>
          )}
        </main>
        <BottomNavigation />
      </div>
    );
  }

  // --- module list ---
  return (
    <div className="screen pb-nav">
      <Navbar title="Training" />

      <main className="col px-4 pt-4 flex flex-col gap-5">
        <section>
          <h2 className="text-[22px] font-bold tracking-[-0.02em] leading-tight">Collector Training</h2>
          <p className="text-[13px] text-faint mt-0.5">
            Four short modules. Works without internet.
          </p>
        </section>

        {/* progress */}
        <section className="card p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[13px] font-semibold text-ink">Your progress</span>
            <span className="text-[12.5px] text-faint tnum">{completedModules} of {MODULES.length} modules</span>
          </div>
          <div className="h-2.5 rounded-full bg-sunken overflow-hidden flex gap-[2px]">
            {MODULES.map((m) => (
              <div key={m.id} className="flex-1 h-full rounded-sm transition-colors"
                style={{ background: progress[m.id]?.passed ? m.color : "transparent" }} />
            ))}
          </div>
          {allDone ? (
            <div className="mt-3 p-3 rounded-xl bg-green-50 border border-green-200 flex items-start gap-2.5">
              <HiOutlineTrophy className="text-green-600 text-lg shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold text-green-800">All modules complete</p>
                <p className="text-[12px] text-green-700 leading-snug mt-0.5">
                  {totalCorrect} of {TOTAL_QUESTIONS} questions correct. You know the materials, the safety rules,
                  fair pricing and how EPR works.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-faint mt-2.5">
              Complete all four to earn your collector certificate.
            </p>
          )}
        </section>

        {/* modules */}
        <div className="flex flex-col gap-2.5">
          {MODULES.map((m, i) => {
            const done = progress[m.id];
            return (
              <motion.button key={m.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => { setActive(m); setStage("lessons"); }}
                className="card p-4 flex items-center gap-3 text-left tap active:bg-sunken/50 transition-colors">
                <span className="w-12 h-12 shrink-0 rounded-2xl grid place-items-center text-2xl"
                  style={{ background: `${m.color}15` }}>
                  {m.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-ink truncate">{m.title}</span>
                    {done?.passed && <HiCheckCircle className="text-green-600 text-base shrink-0" />}
                  </span>
                  <span className="block text-[12.5px] text-faint leading-snug mt-0.5">{m.subtitle}</span>
                  <span className="flex items-center gap-2.5 mt-1.5">
                    <span className="text-[11px] text-faint flex items-center gap-1">
                      <HiOutlineClock className="text-[12px]" /> {m.minutes} min
                    </span>
                    <span className="text-[11px] text-faint">{m.lessons.length} lessons</span>
                    {done && (
                      <span className="text-[11px] font-semibold tnum" style={{ color: done.passed ? "#0ca30c" : "#D97706" }}>
                        {done.score}/{done.total}
                      </span>
                    )}
                  </span>
                </span>
                <HiChevronRight className="text-faint shrink-0" />
              </motion.button>
            );
          })}
        </div>

        {/* certificate */}
        {allDone && (
          <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-[18px] overflow-hidden border border-line">
            <div className="bg-ink text-white p-5 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.07]"
                style={{ background: "radial-gradient(circle at 70% 20%, #F0A020 0%, transparent 55%)" }} />
              <HiOutlineAcademicCap className="text-4xl mx-auto text-gold-500 relative" />
              <p className="text-[10.5px] uppercase tracking-[0.14em] text-white/50 font-semibold mt-2.5 relative">
                Certificate of Completion
              </p>
              <h3 className="text-[19px] font-bold mt-1.5 relative tracking-[-0.015em]">
                {user?.name || "Verified Collector"}
              </h3>
              <p className="text-[12.5px] text-white/60 mt-2 leading-snug max-w-[34ch] mx-auto relative">
                has completed the Kabadiwala Connect collector training covering material identification,
                safe handling, fair pricing and EPR compliance
              </p>
              <p className="text-[11px] text-white/40 mt-3 relative tnum">
                {totalCorrect}/{TOTAL_QUESTIONS} correct · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="bg-sunken/50 px-4 py-2.5 text-center">
              <p className="text-[10.5px] text-faint leading-snug">
                Issued under Kabadiwala Connect capacity-building programme · SIH 2026 PS 26229
              </p>
            </div>
          </motion.section>
        )}

        <p className="text-[11px] text-faint leading-snug text-center px-2 mb-2">
          Safety guidance follows CPCB handling advisories and the E-Waste (Management) Rules, 2022.
        </p>
      </main>

      <BottomNavigation />
    </div>
  );
};
