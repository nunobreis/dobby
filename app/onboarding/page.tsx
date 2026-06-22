"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setLanguage } from "@/lib/actions/settings";
import { markOnboardingSeen } from "@/lib/actions/onboarding";

type Locale = "en" | "pt";

const SLIDES: Record<Locale, { icon: string; title: string; desc: string }[]> = {
  en: [
    { icon: "🐾", title: "Welcome to Dobby", desc: "Everything you need to look after your dog, in one place." },
    { icon: "💉", title: "Health Records", desc: "Log vaccinations, track weight, and keep a full history of every vet visit." },
    { icon: "🍖", title: "Daily Care", desc: "Track food, diet changes, and medications — all in one place." },
    { icon: "📸", title: "Memories & Docs", desc: "Capture milestones and store important documents like insurance and certificates." },
    { icon: "🤖", title: "AI Vet", desc: "Ask questions about your dog's health and get instant answers from our AI vet." },
  ],
  pt: [
    { icon: "🐾", title: "Bem-vindo ao Dobby", desc: "Tudo o que precisas para cuidar do teu cão, num só lugar." },
    { icon: "💉", title: "Registos de Saúde", desc: "Regista vacinas, acompanha o peso e guarda o histórico de visitas ao veterinário." },
    { icon: "🍖", title: "Cuidados Diários", desc: "Acompanha a alimentação, mudanças de dieta e medicamentos — tudo num só lugar." },
    { icon: "📸", title: "Memórias e Documentos", desc: "Guarda momentos especiais e documentos importantes como seguros e certificados." },
    { icon: "🤖", title: "Veterinário IA", desc: "Faz perguntas sobre a saúde do teu cão e recebe respostas imediatas do nosso veterinário IA." },
  ],
};

const LABELS: Record<Locale, { skip: string; next: string; getStarted: string }> = {
  en: { skip: "Skip", next: "Next", getStarted: "Get started" },
  pt: { skip: "Saltar", next: "Próximo", getStarted: "Começar" },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [locale, setLocale] = useState<Locale>("en");
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const slides = SLIDES[locale];
  const labels = LABELS[locale];
  const isLast = current === slides.length - 1;

  async function handleLanguageToggle(next: Locale) {
    setLocale(next);
    await setLanguage(next);
  }

  async function handleFinish() {
    await markOnboardingSeen();
    router.push("/dashboard");
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    const delta = touchStart - e.changedTouches[0].clientX;
    if (delta > 50 && current < slides.length - 1) setCurrent((c) => c + 1);
    if (delta < -50 && current > 0) setCurrent((c) => c - 1);
    setTouchStart(null);
  }

  return (
    <div
      className="min-h-screen bg-background flex flex-col px-6 pt-12 pb-10"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5 bg-[#E0E0E0] rounded-[10px] p-0.5">
          {(["en", "pt"] as const).map((l) => (
            <button
              key={l}
              onClick={() => handleLanguageToggle(l)}
              className={`text-[10px] font-bold px-3 py-1 rounded-[7px] transition-colors ${
                locale === l ? "bg-accent text-white" : "text-text-secondary"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        {!isLast && (
          <button
            onClick={handleFinish}
            className="text-sm font-semibold text-text-secondary"
          >
            {labels.skip}
          </button>
        )}
      </div>

      {/* Slide content */}
      <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center py-10">
        <div className="w-24 h-24 bg-white rounded-[28px] flex items-center justify-center text-5xl shadow-sm">
          {slides[current].icon}
        </div>
        <div className="space-y-3 px-2">
          <h1 className="text-[22px] font-bold text-text-primary leading-tight">
            {slides[current].title}
          </h1>
          <p className="text-[14px] text-text-secondary leading-relaxed">
            {slides[current].desc}
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === current ? "w-5 bg-accent" : "w-1.5 bg-lavender"
              }`}
            />
          ))}
        </div>
        <button
          onClick={isLast ? handleFinish : () => setCurrent((c) => c + 1)}
          className="w-full bg-accent text-white font-bold text-[15px] rounded-pill py-4"
        >
          {isLast ? labels.getStarted : labels.next}
        </button>
      </div>
    </div>
  );
}
