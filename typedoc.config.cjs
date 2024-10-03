/** @type {import('typedoc').TypeDocOptions} */
module.exports = {
  // readme
  entryPoints: ['./src/index.ts'],
  out: 'docs',
  validation: {
    notDocumented: true,
  },
  excludePrivate: true,
  categoryOrder: [
    'Operator Client',
    'Collateral Client',
    'Proof Factory',
    'Proofer Config',
    '*',
  ],
  excludeExternals: true,
  externalPattern: [],
};
