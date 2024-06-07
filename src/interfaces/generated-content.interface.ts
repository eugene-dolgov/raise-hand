export interface SavedGeneratedContent {
  id: string;
  standard: string;
  content: string;
  context: string;
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

export interface SavedGeneratedContentContext {
  grade: string
  course: string
  subject: string
  domainId: string
  clusterId: string
  standardId: string
  standardType: string
  standardDomain: string
  standardCluster: string
  userPreferredName: string
  ancestor1StandardId: string
  ancestor2StandardId: string
  standardDescription: string
  standardDescriptionOriginal: string
  ancestor1StandardDescription: string
  ancestor2StandardDescription: string
}
