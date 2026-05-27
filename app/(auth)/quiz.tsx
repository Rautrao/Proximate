import { useState, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';
import {
  LANGUAGES,
  QUIZ_QUESTIONS,
  UI_STRINGS,
  PASS_THRESHOLD,
  FAIL_COOLDOWN_MS,
  type LanguageCode,
} from '@/constants/quiz';

function passLabelFor(lang: LanguageCode): string {
  return LANGUAGES.find((l) => l.code === lang)?.passLabel ?? 'correct';
}

type Step = 'language' | 'quiz' | 'result';

export default function QuizScreen() {
  const router = useRouter();
  const { language, setLanguage, recordPass, recordFailure, lastFailedAt } =
    useOnboardingStore();

  const [step, setStep] = useState<Step>(language ? 'quiz' : 'language');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(QUIZ_QUESTIONS.length).fill(null)
  );
  const [correctCount, setCorrectCount] = useState(0);
  const [passed, setPassed] = useState(false);

  // Cooldown after a recent failure — prevents brute-forcing.
  const cooldownRemainingMs = lastFailedAt
    ? Math.max(0, FAIL_COOLDOWN_MS - (Date.now() - lastFailedAt))
    : 0;
  const inCooldown = cooldownRemainingMs > 0;

  // Tick the cooldown so the screen re-renders as time elapses.
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    if (!inCooldown) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [inCooldown]);

  const ui = language ? UI_STRINGS[language] : UI_STRINGS.en;

  function pickLanguage(code: LanguageCode) {
    setLanguage(code);
    setStep('quiz');
  }

  function answerQuestion(optionIdx: number) {
    const next = [...answers];
    next[currentQ] = optionIdx;
    setAnswers(next);
  }

  function submitQuiz() {
    const score = answers.reduce<number>((acc, a, i) => {
      if (a === null) return acc;
      return acc + (a === QUIZ_QUESTIONS[i].correctIndex ? 1 : 0);
    }, 0);
    setCorrectCount(score);
    const didPass = score >= PASS_THRESHOLD;
    setPassed(didPass);
    if (didPass) recordPass();
    else recordFailure();
    setStep('result');
  }

  /* ── Language picker ─────────────────────────────────────────────────── */
  if (step === 'language') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.brand}>PROXIMATE</Text>
          <Text style={styles.title}>{UI_STRINGS.en.pickLanguage}</Text>
          <Text style={styles.subtitle}>
            Verify that you understand how Proximate is used before creating an
            account. Available in:
          </Text>

          <View style={styles.langGrid}>
            {LANGUAGES.map((l) => (
              <Pressable
                key={l.code}
                onPress={() => pickLanguage(l.code)}
                style={({ pressed }) => [
                  styles.langCard,
                  pressed && styles.langCardPressed,
                ]}
              >
                <Text style={styles.langNative}>{l.native}</Text>
                <Text style={styles.langLabel}>{l.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#6B7280" />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ── Cooldown gate ───────────────────────────────────────────────────── */
  if (inCooldown && step === 'quiz') {
    const mins = Math.ceil(cooldownRemainingMs / 60_000);
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, styles.center]}>
          <Ionicons name="lock-closed" size={42} color="#F87171" />
          <Text style={styles.resultTitle}>{ui.failed}</Text>
          <Text style={styles.resultSub}>
            {ui.tryAgainIn} {mins} {ui.minutes}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ── Quiz ────────────────────────────────────────────────────────────── */
  if (step === 'quiz' && language) {
    const q = QUIZ_QUESTIONS[currentQ];
    const selected = answers[currentQ];
    const isLast = currentQ === QUIZ_QUESTIONS.length - 1;

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.quizHeader}>
            <Pressable
              onPress={() => setStep('language')}
              style={styles.langSwitchBtn}
            >
              <Ionicons name="globe-outline" size={14} color="#9CA3AF" />
              <Text style={styles.langSwitchText}>
                {LANGUAGES.find((l) => l.code === language)?.native}
              </Text>
            </Pressable>
            <Text style={styles.progress}>
              {ui.question} {currentQ + 1} {ui.of} {QUIZ_QUESTIONS.length}
            </Text>
          </View>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentQ + 1) / QUIZ_QUESTIONS.length) * 100}%` },
              ]}
            />
          </View>

          <Text style={styles.questionText}>{q.text[language]}</Text>

          <View style={styles.options}>
            {q.options[language].map((opt, idx) => {
              const isSelected = selected === idx;
              return (
                <Pressable
                  key={idx}
                  onPress={() => answerQuestion(idx)}
                  style={({ pressed }) => [
                    styles.option,
                    isSelected && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <View
                    style={[
                      styles.optionDot,
                      isSelected && styles.optionDotSelected,
                    ]}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            disabled={selected === null}
            onPress={() => {
              if (isLast) submitQuiz();
              else setCurrentQ(currentQ + 1);
            }}
            style={({ pressed }) => [
              styles.primaryBtn,
              selected === null && styles.primaryBtnDisabled,
              pressed && styles.primaryBtnPressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {isLast ? ui.submit : ui.next}
            </Text>
            <Ionicons
              name={isLast ? 'checkmark' : 'arrow-forward'}
              size={18}
              color="#0a0a0a"
            />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ── Result ──────────────────────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, styles.center]}>
        <Ionicons
          name={passed ? 'shield-checkmark' : 'close-circle'}
          size={56}
          color={passed ? '#22C55E' : '#F87171'}
        />
        <Text style={styles.resultTitle}>
          {passed ? ui.passed : ui.failed}
        </Text>
        <Text style={styles.resultSub}>
          {correctCount} {ui.of} {QUIZ_QUESTIONS.length} {passLabelFor(language ?? 'en')}
        </Text>

        {passed ? (
          <Pressable
            onPress={() => router.replace('/(auth)/register')}
            style={({ pressed }) => [
              styles.primaryBtn,
              { marginTop: 40, width: '100%' },
              pressed && styles.primaryBtnPressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>{ui.continueToRegister}</Text>
            <Ionicons name="arrow-forward" size={18} color="#0a0a0a" />
          </Pressable>
        ) : (
          <Text style={[styles.resultSub, { marginTop: 16, color: '#71717a' }]}>
            {ui.tryAgainIn} 5 {ui.minutes}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#09090b' },
  container: { padding: 24, paddingTop: 32, minHeight: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brand: {
    color: '#fafafa',
    fontSize: 13,
    letterSpacing: 4,
    fontWeight: '600',
    marginBottom: 32,
  },
  title: { color: '#fafafa', fontSize: 28, fontWeight: '700', marginBottom: 10 },
  subtitle: { color: '#a1a1aa', fontSize: 14, lineHeight: 22, marginBottom: 32 },

  langGrid: { gap: 12 },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#18181b',
    gap: 14,
  },
  langCardPressed: { backgroundColor: '#27272a' },
  langNative: { color: '#fafafa', fontSize: 18, fontWeight: '600', flex: 1 },
  langLabel: { color: '#71717a', fontSize: 12, letterSpacing: 1.4, marginRight: 4 },

  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  langSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  langSwitchText: { color: '#a1a1aa', fontSize: 12 },
  progress: { color: '#71717a', fontSize: 11, letterSpacing: 1.5 },
  progressBar: {
    height: 2,
    backgroundColor: '#27272a',
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 32,
  },
  progressFill: { height: '100%', backgroundColor: '#fbbf24' },

  questionText: {
    color: '#fafafa',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 30,
    marginBottom: 28,
  },
  options: { gap: 10, marginBottom: 32 },
  option: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    backgroundColor: '#18181b',
  },
  optionSelected: {
    borderColor: '#fbbf24',
    backgroundColor: 'rgba(251, 191, 36, 0.06)',
  },
  optionPressed: { opacity: 0.85 },
  optionDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#52525b',
    marginTop: 1,
  },
  optionDotSelected: {
    borderColor: '#fbbf24',
    backgroundColor: '#fbbf24',
  },
  optionText: { color: '#d4d4d8', fontSize: 14, lineHeight: 21, flex: 1 },
  optionTextSelected: { color: '#fafafa' },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fbbf24',
    paddingVertical: 16,
    borderRadius: 999,
  },
  primaryBtnDisabled: { backgroundColor: '#3f3f46', opacity: 0.6 },
  primaryBtnPressed: { opacity: 0.85 },
  primaryBtnText: { color: '#0a0a0a', fontSize: 15, fontWeight: '600' },

  resultTitle: {
    color: '#fafafa',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 24,
    textAlign: 'center',
  },
  resultSub: {
    color: '#a1a1aa',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
