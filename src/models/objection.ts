export interface ObjectionCategory {
    categoryId: number;
    userId: string;
    categoryName: string;
    parentId: number | null;
    sortOrder: number;
    childCategoryCount?: number;
    objectionCount?: number;
}

export interface ObjectionAnswer {
    answerId?: number;
    objectionId?: number;
    answerTypeCd: AnswerType;
    answerText: string;
    sourceText: string | null;
    sourceUrl: string | null;
    sortOrder: number;
}

export type AnswerType = 'short' | 'detailed' | 'counter_question';

export const ANSWER_TYPE_LABELS: { value: AnswerType; label: string }[] = [
    { value: 'short', label: 'Short Answer' },
    { value: 'detailed', label: 'Detailed Answer' },
    { value: 'counter_question', label: 'Counter-Question' },
];

export const ANSWER_TYPE_ORDER: AnswerType[] = ['short', 'detailed', 'counter_question'];

export interface Objection {
    objectionId?: number;
    userId: string;
    categoryId: number;
    objectionText: string;
    archiveFl: string;
    lastPracticedDt: string | null;
    answers?: ObjectionAnswer[];
    categoryName?: string;
}

export interface ObjectionPracticeHistory {
    practiceId?: number;
    objectionId: number;
    userId: string;
    practicedDt: string;
}
