export interface SavedGeneratedContent {
  id: string;
  standard: string;
  content: string;
}

export interface SavedGeneratedContentData {
  question: string;
  answer_options: AnswerOption[];
}

export interface AnswerOption {
  id: string
  answer: string
  correct: boolean
  explanation: string
}
