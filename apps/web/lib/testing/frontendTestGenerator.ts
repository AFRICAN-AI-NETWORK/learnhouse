/**
 * Helper to convert declarative JSON tests from Smart Article steps
 * into Jest test suites executed by Sandpack in-browser using standard React DOM.
 */

export interface DeclarativeTest {
  id?: string
  description: string
  type?:
    | 'dom_text'
    | 'dom_exists'
    | 'class_contains'
    | 'attribute_check'
    | 'interaction'
    | 'custom'
  selector?: string
  targetSelector?: string
  assertSelector?: string
  expected?: string
  expectedText?: string
  requiredClasses?: string[]
  attribute?: string
  action?: 'click' | 'change'
  inputValue?: string
  customCode?: string
}

export function generateTestFileFromDeclarative(
  tests: DeclarativeTest[],
  template: string = 'react'
): string {
  if (!tests || tests.length === 0) {
    return `
test('Placeholder test', () => {
  expect(true).toBe(true);
});
`
  }

  const isReact = template.includes('react')

  let testCasesCode = ''

  tests.forEach((t, i) => {
    const desc = (t.description || `Test case ${i + 1}`).replace(/'/g, "\\'")

    let testBody = ''

    if (t.customCode) {
      testBody = t.customCode
    } else if (t.type === 'dom_exists') {
      const sel = t.selector || 'body'
      testBody = `
  const el = document.querySelector('${sel}');
  expect(el).not.toBeNull();
`
    } else if (t.type === 'dom_text') {
      const sel = t.selector || 'body'
      const exp = (t.expected || t.expectedText || '').replace(/'/g, "\\'")
      testBody = `
  const el = document.querySelector('${sel}');
  expect(el).not.toBeNull();
  expect(el.textContent).toContain('${exp}');
`
    } else if (t.type === 'class_contains') {
      const sel = t.selector || 'body'
      const classes = t.requiredClasses || []
      const classChecks = classes
        .map((c) => `expect(el.classList.contains('${c}')).toBe(true);`)
        .join('\n  ')
      testBody = `
  const el = document.querySelector('${sel}');
  expect(el).not.toBeNull();
  ${classChecks}
`
    } else if (t.type === 'attribute_check') {
      const sel = t.selector || 'body'
      const attr = t.attribute || 'id'
      const exp = (t.expected || '').replace(/'/g, "\\'")
      testBody = `
  const el = document.querySelector('${sel}');
  expect(el).not.toBeNull();
  expect(el.getAttribute('${attr}')).toBe('${exp}');
`
    } else if (t.type === 'interaction') {
      const targetSel = t.targetSelector || t.selector || 'button'
      const assertSel = t.assertSelector || targetSel
      const exp = (t.expectedText || t.expected || '').replace(/'/g, "\\'")
      testBody = `
  const target = document.querySelector('${targetSel}');
  expect(target).not.toBeNull();
  if (typeof act !== 'undefined') {
    await act(async () => {
      target.click();
    });
  } else {
    target.click();
  }
  const assertEl = document.querySelector('${assertSel}');
  expect(assertEl).not.toBeNull();
  expect(assertEl.textContent).toContain('${exp}');
`
    } else {
      const sel = t.selector || 'body'
      testBody = `
  const el = document.querySelector('${sel}');
  expect(el).not.toBeNull();
`
    }

    testCasesCode += `
test('${desc}', async () => {
${testBody}
});
`
  })

  if (isReact) {
    return `
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

let testRoot = null;

describe('Assignment Test Suite', () => {
  beforeEach(async () => {
    document.body.innerHTML = '<div id="test-root"></div>';
    testRoot = createRoot(document.getElementById('test-root'));
    if (typeof act !== 'undefined') {
      await act(async () => {
        testRoot.render(<App />);
      });
    } else {
      testRoot.render(<App />);
    }
  });

  afterEach(async () => {
    if (testRoot) {
      if (typeof act !== 'undefined') {
        await act(async () => {
          testRoot.unmount();
        });
      } else {
        testRoot.unmount();
      }
      testRoot = null;
    }
    document.body.innerHTML = '';
  });

${testCasesCode}
});
`
  }

  // Vanilla / Static template
  return `
describe('Assignment Test Suite', () => {
${testCasesCode}
});
`
}
