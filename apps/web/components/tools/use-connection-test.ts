"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NodeConfigValue } from "@/lib/agents/types";
import { TEST_STEPS, simulateTestOutcome, type TestResult, type TestStep } from "@/lib/tools/connection";
import { toolStore } from "@/lib/tools/store";

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const idleSteps = (): TestStep[] => TEST_STEPS.map((label) => ({ label, status: "pending" }));

/**
 * Plays a simulated connection test step by step and records the outcome —
 * on the tool install by default, or through `record` (used by integrations).
 */
export function useConnectionTest(toolId: string, toolName: string, record?: (outcome: TestResult) => void) {
  const [steps, setSteps] = useState<TestStep[]>(idleSteps);
  const [result, setResult] = useState<TestResult | null>(null);
  const [running, setRunning] = useState(false);
  const runRef = useRef(0);
  const recordRef = useRef(record);

  useEffect(() => {
    recordRef.current = record;
  });

  useEffect(() => {
    const ref = runRef;
    return () => {
      ref.current++;
    };
  }, []);

  const run = useCallback(
    async (config: Record<string, NodeConfigValue>) => {
      const id = ++runRef.current;
      const outcome = simulateTestOutcome(config, toolName);
      const stopAt = outcome.ok ? TEST_STEPS.length : (outcome.failedAt ?? 0);
      setRunning(true);
      setResult(null);
      setSteps(idleSteps());

      for (let index = 0; index < TEST_STEPS.length; index++) {
        setSteps((current) => current.map((step, i) => (i === index ? { ...step, status: "running" } : step)));
        await sleep(index === stopAt && !outcome.ok && outcome.latencyMs > 5000 ? 1600 : 420 + Math.random() * 380);
        if (runRef.current !== id) return;
        if (index === stopAt) {
          setSteps((current) => current.map((step, i) => (i === index ? { ...step, status: "failed" } : step)));
          break;
        }
        setSteps((current) => current.map((step, i) => (i === index ? { ...step, status: "success" } : step)));
      }

      setResult(outcome);
      setRunning(false);
      if (recordRef.current) recordRef.current(outcome);
      else toolStore.recordTest(toolId, outcome.ok, outcome.message);
      return outcome;
    },
    [toolId, toolName],
  );

  const reset = useCallback(() => {
    runRef.current++;
    setRunning(false);
    setResult(null);
    setSteps(idleSteps());
  }, []);

  return { steps, result, running, run, reset };
}
