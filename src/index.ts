import generate from '@babel/generator';
import * as t from '@babel/types';
import fs from 'fs';
import { get, set } from 'lodash';
import p_parserBabel from 'prettier/parser-babel';
import prettier from 'prettier/standalone';
import { data as mock } from './mock';
/**
 * Define Types
 */
interface Input {
  key: string;
  value: any;
}

interface Element {
  nodeId: string;
  method: string;
  methodType: string;
  protocol: string;
  params: Input[];
  outputs: { key: string }[];
  options: {
    flow: string;
    jumpOnSuccess: string;
    jumpOnFail: string;
  };
}

interface Block {
  name: string;
  node: t.VariableDeclaration;
  element: Element;
}

type Blocks = Record<string, Block>;
type Output = { type: 'output'; id: { nodeId: string; innerIndex: number } };

/**
 * Configuration
 */
const CONSTS = {
  CHAIN: 'CHAIN',
  MY_VAULT: 'MY_VAULT',
  MY_WALLET: 'MY_WALLET',
};

const IMPORT_PATHS = {
  FCT_CORE: '@kiroboio/fct-core',
  FCT_BUILDER: '@kiroboio/fct-builder',
};

/**
 * Main
 */
export const parse = (data: typeof mock) => {
  const LITERAL_MAP: Record<string, (val: any) => t.Expression> = {
    boolean: t.booleanLiteral,
    number: t.numericLiteral,
    string: (val: string) => {
      const addresses = {
        [data.vault.toLocaleLowerCase()]: CONSTS.MY_VAULT,
        [data.wallet.toLocaleLowerCase()]: CONSTS.MY_WALLET,
      };
      if (addresses[val.toLocaleLowerCase()]) {
        return t.identifier(addresses[val.toLocaleLowerCase()]);
      }
      return t.stringLiteral(val);
    },
    undefined: () => t.identifier('undefined'),
    object: (val: any) =>
      val === null
        ? t.nullLiteral()
        : Array.isArray(val)
        ? t.arrayExpression(val.map(createLiteral))
        : createObjectExpression(val),
  };

  /**
   * Parsing Helpers
   */
  const isOutput = (value: any): value is Output => {
    return (
      typeof value === 'object' &&
      value !== null &&
      value.type === 'output' &&
      value.id
    );
  };

  /**
   * AST Node Creation Helpers
   */
  const createLiteral = (value: any): t.Expression => {
    return LITERAL_MAP[typeof value](value);
  };

  const createObjectExpression = (
    value: any,
  ): t.ObjectExpression | t.Expression => {
    if (isOutput(value)) return createOutputExpression(value);
    return t.objectExpression(
      Object.entries(value).map(([key, value]) =>
        t.objectProperty(t.identifier(key), createLiteral(value)),
      ),
    );
  };

  const createPluginOptions = (inputs: Input[]): t.Expression => {
    const obj = inputs.reduce(
      (acc, input) => set(acc, input.key, input.value),
      {},
    );
    return createObjectExpression(obj);
  };

  /**
   * Block Creation
   */
  const blocks: Blocks = {};
  const protocolsSet: Set<string> = new Set();

  const createPlugin = (element: Element): t.VariableDeclaration => {
    const { nodeId, method, methodType, protocol, params } = element;
    const name = `${protocol.toLocaleLowerCase()}_${method}_${data.blocks.indexOf(
      element,
    )}`;
    protocolsSet.add(protocol);

    const plugin = createPluginDeclaration(name, [
      createMemberExpression([protocol, methodType, method]),
      createPluginOptions(params),
    ]);
    set(blocks, [nodeId], { name, node: plugin, element });

    return plugin;
  };

  /**
   * Declaration Creators
   */
  const createPluginDeclaration = (
    name: string,
    _args: t.CallExpression['arguments'],
  ): t.VariableDeclaration => {
    return t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(name),
        t.callExpression(
          t.memberExpression(t.identifier('fct'), t.identifier('add')),
          _args,
        ),
      ),
    ]);
  };

  const createDefaults = ({ chain, vault, wallet }: typeof mock) => {
    const chainDec = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(CONSTS.CHAIN),
        t.stringLiteral(chain.id),
      ),
    ]);
    chainDec.leadingComments = [
      { type: 'CommentBlock', value: `Chain: ${chain.name}` } as t.Comment,
    ];

    const vaultDec = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(CONSTS.MY_VAULT),
        t.stringLiteral(vault),
      ),
    ]);

    const walletDec = t.variableDeclaration('const', [
      t.variableDeclarator(
        t.identifier(CONSTS.MY_WALLET),
        t.stringLiteral(wallet),
      ),
    ]);

    return [chainDec, vaultDec, walletDec];
  };

  const createImportDeclaration = (
    source: string,
    specifiers: t.ImportSpecifier[] = [],
  ) => {
    return t.importDeclaration(specifiers, t.stringLiteral(source));
  };

  const createOutputExpression = (value: Output): t.Expression => {
    const block = get(blocks, value.id.nodeId);
    const outputKey = get(block, [
      'element',
      'outputs',
      value.id.innerIndex,
      'key',
    ]);
    return createMemberExpression([block.name, 'outputs', outputKey]);
  };

  const createMemberExpression = (identifiers: string[]): t.Expression =>
    identifiers.length === 1
      ? t.identifier(identifiers[0])
      : t.memberExpression(
          createMemberExpression(identifiers.slice(0, -1)),
          t.identifier(identifiers[identifiers.length - 1]),
        );

  /**
   * Flow Statement Creator
   */

  const createFctJumpStatement = (element: Element): t.Expression => {
    const {
      nodeId,
      options: { jumpOnFail, jumpOnSuccess },
    } = element;

    const isOnEither = jumpOnSuccess === jumpOnFail && jumpOnSuccess !== '';

    const currentBlockName = get(blocks, [nodeId, 'name']);
    const identifier = t.identifier(currentBlockName);

    const successNode = get(blocks, [jumpOnSuccess, 'element']);
    const failNode = get(blocks, [jumpOnFail, 'element']);

    const successExpression = successNode
      ? t.callExpression(t.memberExpression(identifier, t.identifier('then')), [
          createFctJumpStatement(successNode),
        ])
      : identifier;

    const failExpression = failNode
      ? t.callExpression(
          t.memberExpression(successExpression, t.identifier('onFail')),
          [createFctJumpStatement(failNode)],
        )
      : successExpression;

    return isOnEither
      ? t.callExpression(
          t.memberExpression(identifier, t.identifier('onEither')),
          [createFctJumpStatement(successNode)],
        )
      : failExpression;
  };

  const createFctFlowStatement = (elements: Element[]) => {
    return t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('fct'), t.identifier('startWith')),
        [createFctJumpStatement(elements[0])],
      ),
    );
  };

  const createFctCompileStatement = () => {
    const configType = t.tsTypeAnnotation(
      t.tsTypeReference(t.identifier('Config')),
    );
    // now we need to create a config declaration with empty object and with the type annotation
    const configIdentifier = t.identifier('config');
    configIdentifier.typeAnnotation = configType;

    const emptyObject = t.objectExpression([]);
    emptyObject.innerComments = [
      { type: 'CommentLine', value: ' Config your FCT here!' } as t.Comment,
    ];

    const config = t.variableDeclaration('const', [
      t.variableDeclarator(configIdentifier, emptyObject),
    ]);

    const call = t.callExpression(
      t.memberExpression(t.identifier('fct'), t.identifier('compile')),
      [t.identifier('config')],
    );

    const blockStatement = t.blockStatement([]);

    blockStatement.innerComments = [
      {
        type: 'CommentBlock',
        value: `
  This (tx) is your compiled fct-transaction, and you can publish it to the FCTService
    and we will execute it for you when the time comes,
  
    or you can execute it yourself using the FCT SDK
      `.trim(),
      } as t.Comment,
    ];

    return [
      config,
      t.expressionStatement(
        t.callExpression(t.memberExpression(call, t.identifier('then')), [
          t.arrowFunctionExpression([t.identifier('tx')], blockStatement),
        ]),
      ),
    ];
  };

  /**
   * Import Declaration Creators
   */
  const createCoreImports = () => {
    const specifiers = Array.from(protocolsSet).map((protocol) =>
      t.importSpecifier(t.identifier(protocol), t.identifier(protocol)),
    );
    return createImportDeclaration(IMPORT_PATHS.FCT_CORE, [
      ...specifiers,
      t.importSpecifier(t.identifier('Config'), t.identifier('Config')),
    ]);
  };

  const createBuilderImports = () => {
    const specifiers = [
      t.importSpecifier(t.identifier('create'), t.identifier('create')),
    ];
    return createImportDeclaration(IMPORT_PATHS.FCT_BUILDER, specifiers);
  };
  const fctInstanceDeclaration = t.variableDeclaration('const', [
    t.variableDeclarator(
      t.identifier('fct'),
      t.callExpression(t.identifier('create'), [
        t.objectExpression([
          t.objectProperty(t.identifier('chain'), t.identifier(CONSTS.CHAIN)),
        ]),
      ]),
    ),
  ]);

  const plugins = data.blocks.map(createPlugin);
  const flow = createFctFlowStatement(data.blocks);

  // Generate imports
  const comment = t.expressionStatement(
    t.identifier(
      '// This file was generated by the FCT compiler. Happy coding! ✨',
    ),
  );

  const imports = [comment, createCoreImports(), createBuilderImports()];
  const importCode = generate(t.program(imports)).code;

  const defaults = generate(t.program(createDefaults(data))).code;
  const bodyCode = [
    fctInstanceDeclaration,
    ...plugins,
    flow,
    ...createFctCompileStatement(),
  ]
    .map((node) => generate(t.program([node])).code)
    .join('\n\n');

  const prettyCode = prettier.format(
    `${importCode}\n\n${defaults}\n\n${bodyCode}`,
    {
      parser: 'babel',
      plugins: [p_parserBabel],
    },
  );
  return prettyCode;
};
