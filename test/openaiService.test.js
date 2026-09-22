const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { mockModule } = require('./helpers/mockRequire');

const state = { mode: 'valid', review: null, lastParams: null };

function buildValidReview(overrides = {}) {
  return {
    summary: 'Looks fine.',
    score: 7,
    positives: ['Clear naming'],
    issues: [],
    ...overrides,
  };
}

function buildIssue(overrides = {}) {
  return {
    file: 'src/index.js',
    line: 10,
    severity: 'low',
    category: 'style',
    comment: 'minor nit',
    suggestion: 'rename it',
    cwe: null,
    ...overrides,
  };
}

class FakeOpenAI {
  constructor(opts) {
    this.opts = opts;
  }

  chat = {
    completions: {
      create: async (params) => {
        state.lastParams = params;

        if (state.mode === 'refusal') {
          return {
            choices: [{ message: { content: null, refusal: 'cannot review this diff' } }],
            usage: { total_tokens: 42 },
            model: 'gpt-4o-mini-2024-07-18',
          };
        }

        if (state.mode === 'invalid-json') {
          return {
            choices: [{ message: { content: 'not valid json', refusal: null } }],
            usage: { total_tokens: 42 },
            model: 'gpt-4o-mini-2024-07-18',
          };
        }

        return {
          choices: [{ message: { content: JSON.stringify(state.review), refusal: null } }],
          usage: { total_tokens: 123 },
          model: 'gpt-4o-mini-2024-07-18',
        };
      },
    },
  };
}

const restoreOpenAI = mockModule(require.resolve('openai'), FakeOpenAI);
const { reviewDiff, ReviewValidationError } = require('../src/services/openaiService');

after(() => restoreOpenAI());

test('valid response is returned as-is', async () => {
  state.mode = 'valid';
  state.review = buildValidReview({ score: 8, issues: [buildIssue()] });

  const result = await reviewDiff('diff content', 'My PR', 42);

  assert.deepEqual(result.review, state.review);
  assert.equal(result.model, 'gpt-4o-mini-2024-07-18');
  assert.equal(result.tokensUsed, 123);
});

test('a model refusal raises a clear ReviewValidationError', async () => {
  state.mode = 'refusal';

  await assert.rejects(
    () => reviewDiff('diff content', 'My PR', 42),
    (err) => {
      assert.ok(err instanceof ReviewValidationError);
      assert.match(err.message, /refus/i);
      return true;
    },
  );
});

test('malformed JSON despite the strict schema raises a clear error', async () => {
  state.mode = 'invalid-json';

  await assert.rejects(
    () => reviewDiff('diff content', 'My PR', 42),
    ReviewValidationError,
  );
});

test('an out-of-range score raises', async () => {
  state.mode = 'valid';
  state.review = buildValidReview({ score: 11 });

  await assert.rejects(() => reviewDiff('diff', 'PR', 1), ReviewValidationError);

  state.review = buildValidReview({ score: 0 });
  await assert.rejects(() => reviewDiff('diff', 'PR', 1), ReviewValidationError);
});

test('more than 15 issues raises', async () => {
  state.mode = 'valid';
  state.review = buildValidReview({
    issues: Array.from({ length: 16 }, (_, i) => buildIssue({ line: i })),
  });

  await assert.rejects(() => reviewDiff('diff', 'PR', 1), ReviewValidationError);
});

test('exactly 15 issues is accepted', async () => {
  state.mode = 'valid';
  state.review = buildValidReview({
    issues: Array.from({ length: 15 }, (_, i) => buildIssue({ line: i })),
  });

  const result = await reviewDiff('diff', 'PR', 1);
  assert.equal(result.review.issues.length, 15);
});

test('the OpenAI request uses response_format json_schema with strict: true', async () => {
  state.mode = 'valid';
  state.review = buildValidReview();

  await reviewDiff('diff', 'PR', 1);

  assert.equal(state.lastParams.response_format.type, 'json_schema');
  assert.equal(state.lastParams.response_format.json_schema.strict, true);
  assert.equal(state.lastParams.response_format.json_schema.name, 'code_review');
  assert.equal(state.lastParams.response_format.json_schema.schema.additionalProperties, false);
});

test('a diff under the truncation limit is left untouched', async () => {
  state.mode = 'valid';
  state.review = buildValidReview();
  const diff = 'const x = 1;\n'.repeat(50); // well under 100k chars

  await reviewDiff(diff, 'PR', 1);

  const userMessage = state.lastParams.messages[1].content;
  assert.ok(userMessage.includes(diff));
  assert.ok(!userMessage.includes('DIFF TRUNCATED'));
});

test('a diff over the truncation limit is truncated with the marker', async () => {
  state.mode = 'valid';
  state.review = buildValidReview();
  const diff = 'x'.repeat(150_000);

  await reviewDiff(diff, 'PR', 1);

  const userMessage = state.lastParams.messages[1].content;
  assert.ok(userMessage.includes('DIFF TRUNCATED'));
  assert.ok(!userMessage.includes(diff)); // the full, untruncated diff must not appear
});
