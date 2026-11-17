export interface QnA {
  question: string;
  answer: string;
}

export interface SectionPlan {
  name: string;
  description: string;
}

export interface PageBlueprint {
  title: string;
  tagline: string;
  websiteType: string;
  visualTheme: string;
  targetAudience: string;
  sections: SectionPlan[];
  keyFeatures: string[];
}

export interface QuestionResponse {
  success: boolean;
  step: number;
  acknowledgment: string;
  category: string;
  question: string;
  error?: string;
}

export interface TestCaseResult {
  id: string;
  name: string;
  category: "syntax" | "compliance" | "architecture" | "ai_audit";
  status: "passed" | "failed" | "warning";
  message: string;
  details?: string;
  line?: number;
  column?: number;
}

export interface VerificationReport {
  passed: boolean;
  score: number;
  summary: string;
  tests: TestCaseResult[];
  canPreview: boolean;
  sanitizedCode?: string;
}

export type Step =
  | "intro"
  | "questioning"
  | "blueprint"
  | "generating"
  | "testing"
  | "ready";
