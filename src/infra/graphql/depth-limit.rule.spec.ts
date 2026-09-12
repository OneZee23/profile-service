import {
  buildSchema,
  GraphQLSchema,
  parse,
  specifiedRules,
  validate,
} from 'graphql';
import { depthLimit } from './depth-limit.rule';

const schema: GraphQLSchema = buildSchema(`
  type Achievement { text: String! }
  type Experience { company: String!, achievements: [Achievement!]! }
  type Profile { name: String!, experience: [Experience!]! }
  type Query { profile: Profile! }
`);

function errorsFor(query: string, maxDepth: number): string[] {
  return validate(schema, parse(query), [
    ...specifiedRules,
    depthLimit(maxDepth),
  ]).map((error) => error.message);
}

describe('depthLimit', () => {
  it('accepts a query at exactly the limit', () => {
    expect(errorsFor('{ profile { name } }', 2)).toEqual([]);
  });

  it('rejects a query one level past the limit', () => {
    expect(errorsFor('{ profile { experience { company } } }', 2)).toEqual([
      'Query is 3 levels deep, the limit is 2',
    ]);
  });

  it('counts through fragment spreads', () => {
    const query = `
      { profile { ...deep } }
      fragment deep on Profile { experience { achievements { text } } }
    `;

    expect(errorsFor(query, 3)).toEqual([
      'Query is 4 levels deep, the limit is 3',
    ]);
  });

  it('counts through inline fragments', () => {
    const query = '{ profile { ... on Profile { experience { company } } } }';

    expect(errorsFor(query, 2)).toEqual([
      'Query is 3 levels deep, the limit is 2',
    ]);
  });

  it('ignores introspection meta fields so the sandbox still loads', () => {
    expect(errorsFor('{ __schema { types { name } } }', 1)).toEqual([]);
  });

  it('stays linear when one fragment is spread many times over', () => {
    const depth = 25;
    const fragments = Array.from(
      { length: depth },
      (_, index) =>
        `fragment f${index} on Profile { name ...f${index + 1} ...f${index + 1} }`,
    );
    const query = [
      '{ profile { ...f0 } }',
      ...fragments,
      `fragment f${depth} on Profile { name }`,
    ].join('\n');

    const startedAt = process.hrtime.bigint();
    const errors = errorsFor(query, 8);
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    expect(errors).toEqual([]);
    expect(elapsedMs).toBeLessThan(250);
  });

  it('reports nothing for a query well inside the limit', () => {
    const query = '{ profile { experience { achievements { text } } } }';

    expect(errorsFor(query, 8)).toEqual([]);
  });
});
