import {
  buildSchema,
  getIntrospectionQuery,
  parse,
  specifiedRules,
  validate,
} from 'graphql';
import { depthLimit } from './depth-limit.rule';

const schema = buildSchema(`
  type Achievement { text: String! }
  type Experience { achievements: [Achievement!]! }
  type Profile { name: String! experience: [Experience!]! }
  type Query { profile: Profile! }
`);

function messagesFor(source: string, maxDepth: number): string[] {
  return validate(schema, parse(source), [
    ...specifiedRules,
    depthLimit(maxDepth),
  ]).map((error) => error.message);
}

const FOUR_LEVELS = '{ profile { experience { achievements { text } } } }';

describe('depthLimit', () => {
  it('should accept a query at the limit', () => {
    expect(messagesFor(FOUR_LEVELS, 4)).toEqual([]);
  });

  it('should reject a query deeper than the limit', () => {
    expect(messagesFor(FOUR_LEVELS, 3)).toEqual([
      'Query is 4 levels deep, the limit is 3',
    ]);
  });

  it('should count the selections of a named fragment', () => {
    const source =
      '{ profile { experience { ...Details } } } fragment Details on Experience { achievements { text } }';

    expect(messagesFor(source, 3)).toEqual([
      'Query is 4 levels deep, the limit is 3',
    ]);
    expect(messagesFor(source, 4)).toEqual([]);
  });

  it('should terminate on a self-spreading fragment', () => {
    const source =
      '{ profile { ...Loop } } fragment Loop on Profile { ...Loop }';

    expect(messagesFor(source, 3)).toEqual([
      'Cannot spread fragment "Loop" within itself.',
    ]);
  });

  it('should ignore introspection meta fields so the sandbox keeps working', () => {
    expect(messagesFor(getIntrospectionQuery(), 3)).toEqual([]);
  });
});
