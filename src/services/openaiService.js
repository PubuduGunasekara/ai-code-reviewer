const OpenAI = require('openai');

// Create one OpenAI client — reused across all requests
// Like pg Pool, we create once and reuse everywhere
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── THE SYSTEM PROMPT ────────────────────────────────────────
// This is the most important part of this entire file.
// It tells GPT-4o exactly WHO it is and HOW to respond.
// This is called "prompt engineering" — a core AI/ML skill.

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

RESPONSE FORMAT:
You MUST respond with valid JSON only. No markdown. No explanation outside JSON.

{
  "summary": "2-3 sentence overall assessment of the code quality",
  "score": 7,
  "issues": [
    {
      "file": "src/index.js",
      "line": 42,
      "severity": "high",
      "category": "security",
      "comment": "Clear explanation of the problem",
      "suggestion": "Specific actionable fix with code example if helpful",
      "cwe": "CWE-89"
    }
  ],
  "positives": [
    "Things the developer did well"
  ]
}

RULES:
1. score is 1-10 (10 = excellent, 1 = critical issues everywhere)
2. Only include cwe for security issues (CWE-89, CWE-79, CWE-22, etc.)
3. Be specific — reference actual variable names and line numbers from the diff
4. If the diff is clean, say so — don't invent issues
5. Maximum 15 issues — focus on the most important ones
6. positives array must have at least 1 item`;


// ─── MAIN REVIEW FUNCTION ─────────────────────────────────────
async function reviewDiff(diff, prTitle, prNumber) {
  
  // Don't send diffs that are too large — GPT-4o has token limits
  // 1 token ≈ 4 characters. GPT-4o context = 128K tokens.
  // We leave room for the response by capping at 100K characters.
  const MAX_DIFF_LENGTH = 100000;
  let processedDiff = diff;
  
  if (diff.length > MAX_DIFF_LENGTH) {
    processedDiff = diff.substring(0, MAX_DIFF_LENGTH) + 
      '\n\n[DIFF TRUNCATED — too large for single review]';
    console.log(`Diff truncated: ${diff.length} → ${MAX_DIFF_LENGTH} chars`);
  }

  // Build the user message — what GPT-4o actually reads
  const userMessage = `Please review this pull request:

Title: ${prTitle || `PR #${prNumber}`}
PR Number: #${prNumber}

CODE DIFF:
\`\`\`diff
${processedDiff}
\`\`\`

Provide a thorough code review following the format specified.`;

  console.log(`Sending PR #${prNumber} to GPT-4o...`);
  const startTime = Date.now();

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',       // most capable model
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userMessage   },
      ],
      temperature: 0.1,      // low temperature = consistent, focused responses
                             // high temperature = creative but unpredictable
                             // code review should be consistent, not creative
      max_tokens: 4000,      // enough for a detailed review response
      response_format: { type: 'json_object' }, // force JSON output
    });

    const duration = Date.now() - startTime;
    console.log(`gpt-4o-mini responded in ${duration}ms`);

    // Extract the response text
    const responseText = completion.choices[0].message.content;

    // Parse JSON — gpt-4o-mini should return valid JSON due to response_format
    let review;
    try {
      review = JSON.parse(responseText);
    } catch (parseError) {
      console.error('gpt-4o-mini returned invalid JSON:', responseText);
      throw new Error('AI returned invalid response format');
    }

    // Validate the structure we need
    if (!review.issues || !Array.isArray(review.issues)) {
      review.issues = [];
    }
    if (!review.summary) {
      review.summary = 'Review completed.';
    }
    if (!review.score || review.score < 1 || review.score > 10) {
      review.score = 5;
    }
    if (!review.positives || !Array.isArray(review.positives)) {
      review.positives = [];
    }

    return {
      review,
      processingTimeMs: duration,
      tokensUsed: completion.usage?.total_tokens || 0,
      model: completion.model,
    };

  } catch (error) {
    // Handle specific OpenAI errors
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

module.exports = { reviewDiff };