import type { StudyDeck, ValidationResult, Flashcard, QuizQuestion, DifficultyLevel } from '../types/result';

/**
 * Strips markdown code blocks (e.g. ```json ... ```) and leading/trailing whitespace
 * from raw LLM output to extract pure JSON.
 */
export function extractJsonString(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  let text = rawText.trim();

  // Strip markdown ```json ... ``` or ``` ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    text = codeBlockMatch[1].trim();
  }

  // If text starts with non-{ and ends with non-}, try finding the first { and last }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  return text;
}

/**
 * Defensive parser that rigorously validates unpredictable LLM output
 * against the expected StudyDeck shape.
 */
export function validateResult(rawInput: unknown): ValidationResult {
  const rawString = typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput);

  // 1. Check for empty or non-string response
  if (!rawInput || (typeof rawInput === 'string' && rawInput.trim().length === 0)) {
    return {
      success: false,
      errorType: 'EMPTY_RESPONSE',
      message: 'The AI model returned an empty response. No content was generated.',
      rawText: rawString || '',
      validationDetails: ['Received empty or null response string from proxy.'],
    };
  }

  // 2. Extract potential JSON
  const cleaned = extractJsonString(rawString);

  // 3. Attempt JSON parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseError: any) {
    // Check if trailing comma fix helps
    try {
      const sanitized = cleaned.replace(/,\s*([}\]])/g, '$1');
      parsed = JSON.parse(sanitized);
    } catch {
      return {
        success: false,
        errorType: 'MALFORMED_JSON',
        message: 'The model output was not valid JSON syntax.',
        rawText: rawString,
        validationDetails: [
          `Syntax error: ${parseError?.message || 'Unparseable JSON'}`,
          `First 100 characters received: "${rawString.slice(0, 100)}..."`,
        ],
      };
    }
  }

  // 4. Structural validation
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      success: false,
      errorType: 'WRONG_SHAPE',
      message: 'Response is not a valid JSON object structure.',
      rawText: rawString,
      validationDetails: ['Expected root JSON to be an object with properties, but got ' + (Array.isArray(parsed) ? 'array' : typeof parsed)],
    };
  }

  const obj = parsed as Record<string, any>;
  const errors: string[] = [];

  // Validate topic
  const topic = typeof obj.topic === 'string' && obj.topic.trim() ? obj.topic.trim() : 'Study Session';

  // Validate summary
  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : '';

  // Validate keyTakeaways
  let keyTakeaways: string[] = [];
  if (Array.isArray(obj.keyTakeaways)) {
    keyTakeaways = obj.keyTakeaways
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map(k => k.trim());
  }

  // Validate cards
  if (!Array.isArray(obj.cards)) {
    errors.push('Missing required property "cards" (expected an array of flashcards)');
  } else if (obj.cards.length === 0) {
    errors.push('The "cards" array is empty. At least one flashcard is required');
  }

  const validCards: Flashcard[] = [];
  if (Array.isArray(obj.cards)) {
    obj.cards.forEach((card: any, index: number) => {
      if (!card || typeof card !== 'object') {
        errors.push(`Card #${index + 1} is not an object`);
        return;
      }

      if (typeof card.question !== 'string' || !card.question.trim()) {
        errors.push(`Card #${index + 1} is missing a valid "question" string`);
      }
      if (typeof card.answer !== 'string' || !card.answer.trim()) {
        errors.push(`Card #${index + 1} is missing a valid "answer" string`);
      }

      const diff: DifficultyLevel =
        card.difficulty === 'beginner' || card.difficulty === 'intermediate' || card.difficulty === 'advanced'
          ? card.difficulty
          : 'intermediate';

      if (card.question && card.answer) {
        validCards.push({
          id: card.id ? String(card.id) : `card-${index + 1}-${Date.now()}`,
          question: card.question.trim(),
          answer: card.answer.trim(),
          explanation: typeof card.explanation === 'string' ? card.explanation.trim() : '',
          category: typeof card.category === 'string' ? card.category.trim() : undefined,
          difficulty: diff,
        });
      }
    });
  }

  // Validate quiz
  const validQuiz: QuizQuestion[] = [];
  if (Array.isArray(obj.quiz)) {
    obj.quiz.forEach((q: any, index: number) => {
      if (!q || typeof q !== 'object') {
        errors.push(`Quiz question #${index + 1} is not an object`);
        return;
      }

      if (typeof q.question !== 'string' || !q.question.trim()) {
        errors.push(`Quiz question #${index + 1} has no "question" text`);
        return;
      }

      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`Quiz question #${index + 1} must have at least 2 answer options`);
        return;
      }

      const options = q.options.map((opt: any) => String(opt || '').trim()).filter((opt: string) => opt.length > 0);
      if (options.length < 2) {
        errors.push(`Quiz question #${index + 1} has empty options`);
        return;
      }

      let correctIndex = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
      if (correctIndex < 0 || correctIndex >= options.length) {
        correctIndex = 0; // Default fallback to first option if out-of-bounds
      }

      validQuiz.push({
        id: q.id ? String(q.id) : `quiz-${index + 1}-${Date.now()}`,
        question: q.question.trim(),
        options,
        correctIndex,
        explanation: typeof q.explanation === 'string' ? q.explanation.trim() : 'Correct answer verified from curriculum.',
      });
    });
  }

  // If there are fundamental structural errors that prevented constructing valid cards
  if (errors.length > 0 && validCards.length === 0) {
    return {
      success: false,
      errorType: errors.some(e => e.includes('cards')) ? 'NO_CARDS' : 'WRONG_SHAPE',
      message: 'The model output does not match the required StudyDeck shape.',
      rawText: rawString,
      validationDetails: errors,
    };
  }

  // Success with validated, sanitized data
  const validatedDeck: StudyDeck = {
    topic,
    summary: summary || `Comprehensive study deck for ${topic}`,
    keyTakeaways: keyTakeaways.length > 0 ? keyTakeaways : [
      'Master core concepts before moving to advanced details',
      'Test yourself with the quiz to reinforce retention',
      'Review weak spot cards repeatedly'
    ],
    cards: validCards,
    quiz: validQuiz,
  };

  return {
    success: true,
    data: validatedDeck,
    rawText: rawString,
  };
}
