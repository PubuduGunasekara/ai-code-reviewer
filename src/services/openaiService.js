const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Bump this when SYSTEM_PROMPT or REVIEW_SCHEMA changes so cached reviews
// from an older prompt/schema are never served as if they matched the current one.
const PROMPT_SCHEMA_VERSION = 'v1';
const MODEL_NAME = 'gpt-4o-mini';

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
const CATEGORIES = ['security', 'performance', 'bug', 'error-handling', 'style', 'architecture'];
const MAX_ISSUES = 15;

// Thrown when the model's output fails validation (refusal, malformed JSON,
// out-of-range score, too many issues) — distinct from transient/API errors
// so the caller can mark the review as permanently failed instead of retryable.
class ReviewValidationError extends Error {}

const SYSTEM_PROMPT = `You are a senior software engineer conducting
a thorough code review. You have 10+ years of experience across
security, performance, and software architecture.

Your job is to review the provided code diff and identify issues.

SEVERITY LEVELS:
- critical: security vulnerabilities, data loss risk, crashes
- high: bugs that will cause incorrect behavior, major performance issues
- medium: code smells, missing error handling, unclear logic
- low: style issues, naming conventions, minor improvements
- info: suggestions, best practices, optional improvements

CATEGORIES:
- security: SQL injection, XSS, auth bypass, sensitive data exposure
- performance: N+1 queries, missing indexes, inefficient algorithms
- bug: logic errors, off-by-one, null pointer risks
- error-handling: missing try/catch, unhandled promises, no validation
- style: naming, formatting, code organisation
- architecture: design patterns, separation of concerns

RULES:
1. score is 1-10 (10 = excellent, 1 = critical issues everywhere)
2. Only include cwe for security issues (CWE-89, CWE-79, CWE-22, etc.) — otherwise use null
3. Be specific — reference actual variable names and line numbers from the diff
4. If the diff is clean, say so — don't invent issues
5. Maximum ${MAX_ISSUES} issues — focus on the most important ones
6. positives array must have at least 1 item
7. Use null for line when a finding isn't tied to one specific line`;

const REVIEW_JSON_SCHEMA = {
  name: 'code_review',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: '2-3 sentence overall assessment of the code quality' },
      score: { type: 'integer', description: 'Overall score, 1-10' },
      positives: { type: 'array', items: { type: 'string' } },
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            file: { type: 'string' },
            line: { type: ['integer', 'null'] },
            severity: { type: 'string', enum: SEVERITIES },
            category: { type: 'string', enum: CATEGORIES },
            comment: { type: 'string' },
            suggestion: { type: 'string' },
            cwe: { type: ['string', 'null'] },
          },
          required: ['file', 'line', 'severity', 'category', 'comment', 'suggestion', 'cwe'],
          additionalProperties: false,
        },
      },
    },
    required: ['summary', 'score', 'positives', 'issues'],
    additionalProperties: false,
  },
};

// Structured Outputs (strict json_schema) guarantees the shape above, but not
// the value ranges — the API doesn't support keywords like minimum/maxItems
// in strict mode, so those rules are enforced here instead.
function assertReviewIsValid(review) {
  if (!Number.isInteger(review.score) || review.score < 1 || review.score > 10) {
    throw new ReviewValidationError(`AI returned an out-of-range score: ${review.score}`);
  }
  if (review.issues.length > MAX_ISSUES) {
    throw new ReviewValidationError(`AI returned ${review.issues.length} issues, exceeding the ${MAX_ISSUES} cap`);
  }
}

async function reviewDiff(diff, prTitle, prNumber) {
  // Don't send diffs that are too large — GPT-4o mini has token limits.
  // 1 token ≈ 4 characters; we leave room for the response by capping at 100K characters.
  const MAX_DIFF_LENGTH = 100000;
  let processedDiff = diff;

  if (diff.length > MAX_DIFF_LENGTH) {
    processedDiff = diff.substring(0, MAX_DIFF_LENGTH) +
      '\n\n[DIFF TRUNCATED — too large for single review]';
    console.log(`Diff truncated: ${diff.length} → ${MAX_DIFF_LENGTH} chars`);
  }

  const userMessage = `Please review this pull request:

Title: ${prTitle || `PR #${prNumber}`}
PR Number: #${prNumber}

CODE DIFF:
\`\`\`diff
${processedDiff}
\`\`\`

Provide a thorough code review following the format specified.`;

  console.log(`Sending PR #${prNumber} to gpt-4o-mini...`);
  const startTime = Date.now();

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1,      // low temperature = consistent, focused responses
      max_tokens: 4000,      // enough for a detailed review response
      response_format: {
        type: 'json_schema',
        json_schema: REVIEW_JSON_SCHEMA,
      },
    });

    const duration = Date.now() - startTime;
    console.log(`gpt-4o-mini responded in ${duration}ms`);

    const message = completion.choices[0].message;

    if (message.refusal) {
      throw new ReviewValidationError(`AI refused to review this diff: ${message.refusal}`);
    }

    let review;
    try {
      review = JSON.parse(message.content);
    } catch (parseError) {
      console.error('gpt-4o-mini returned invalid JSON despite strict schema:', message.content);
      throw new ReviewValidationError('AI returned invalid response format');
    }

    assertReviewIsValid(review);

    return {
      review,
      processingTimeMs: duration,
      tokensUsed: completion.usage?.total_tokens || 0,
      model: completion.model,
    };

  } catch (error) {
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key — check your .env file');
    }
    if (error.status === 429) {
      throw new Error('OpenAI rate limit exceeded — try again in a moment');
    }
    if (error.status === 400) {
      throw new Error('Diff too large or invalid for gpt-4o-mini');
    }
    throw error;
  }
}

module.exports = {
  reviewDiff,
  ReviewValidationError,
  PROMPT_SCHEMA_VERSION,
  MODEL_NAME,
  MAX_ISSUES,
  SEVERITIES,
  CATEGORIES,
};
