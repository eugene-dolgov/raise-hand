export interface GeneratedContent {
  id: string;
  standard: string;
  content: string;
}

export interface GeneratedContentData {
  question: string;
  answer_options: AnswerOption[];
}

export interface AnswerOption {
  id: string
  answer: string
  correct: boolean
  explanation: string
}
