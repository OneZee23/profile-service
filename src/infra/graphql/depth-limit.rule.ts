import {
  FragmentSpreadNode,
  GraphQLError,
  Kind,
  SelectionNode,
  SelectionSetNode,
  ValidationContext,
  ValidationRule,
} from 'graphql';

/* eslint-disable @typescript-eslint/no-use-before-define */

const INTROSPECTION_FIELD_PREFIX = '__';

type DepthScan = {
  context: ValidationContext;
  fragmentDepths: Map<string, number>;
};

const fragmentSpreadDepth = (
  spread: FragmentSpreadNode,
  scan: DepthScan,
  visitedFragments: ReadonlySet<string>,
): number => {
  const name = spread.name.value;
  if (visitedFragments.has(name)) {
    return 0;
  }

  const memoised = scan.fragmentDepths.get(name);
  if (memoised !== undefined) {
    return memoised;
  }

  const fragment = scan.context.getFragment(name);
  if (!fragment) {
    return 0;
  }

  const depth = selectionSetDepth(
    fragment.selectionSet,
    scan,
    new Set([...visitedFragments, name]),
  );
  scan.fragmentDepths.set(name, depth);

  return depth;
};

const selectionDepth = (
  selection: SelectionNode,
  scan: DepthScan,
  visitedFragments: ReadonlySet<string>,
): number => {
  if (selection.kind === Kind.FIELD) {
    if (selection.name.value.startsWith(INTROSPECTION_FIELD_PREFIX)) {
      return 0;
    }

    const nested = selection.selectionSet
      ? selectionSetDepth(selection.selectionSet, scan, visitedFragments)
      : 0;

    return nested + 1;
  }

  if (selection.kind === Kind.INLINE_FRAGMENT) {
    return selectionSetDepth(selection.selectionSet, scan, visitedFragments);
  }

  return fragmentSpreadDepth(selection, scan, visitedFragments);
};

function selectionSetDepth(
  selectionSet: SelectionSetNode,
  scan: DepthScan,
  visitedFragments: ReadonlySet<string>,
): number {
  return selectionSet.selections.reduce(
    (deepest, selection) =>
      Math.max(deepest, selectionDepth(selection, scan, visitedFragments)),
    0,
  );
}

export function depthLimit(maxDepth: number): ValidationRule {
  return (context: ValidationContext) => {
    const scan: DepthScan = { context, fragmentDepths: new Map() };

    return {
      OperationDefinition(operation) {
        const depth = selectionSetDepth(
          operation.selectionSet,
          scan,
          new Set(),
        );

        if (depth > maxDepth) {
          context.reportError(
            new GraphQLError(
              `Query is ${depth} levels deep, the limit is ${maxDepth}`,
              { nodes: operation },
            ),
          );
        }
      },
    };
  };
}
