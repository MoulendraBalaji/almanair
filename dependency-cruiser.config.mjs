/** @type {import('dependency-cruiser').IConfiguration} */
const config = {
  forbidden: [
    {
      name: 'domain-purity',
      comment: 'Domain is pure: only domain, validated config/data and zod schemas are visible.',
      severity: 'error',
      from: { path: '^src/domain/' },
      to: { pathNot: '^(src/domain/|src/data/|src/config/|node_modules/zod/)' },
    },
    {
      name: 'no-server-in-client',
      comment: 'Server code must never be imported by browser modules.',
      severity: 'error',
      from: { path: '^(src/features/|src/ui/|src/infra/|app/)' },
      to: { path: '^src/server/' },
    },
    {
      name: 'no-route-imports',
      comment: 'Application layers never import Next route modules.',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^app/' },
    },
    {
      name: 'server-scope',
      comment: 'Server may import retrieval types and itself only.',
      severity: 'error',
      from: { path: '^src/server/' },
      to: { pathNot: '^(src/server/|src/domain/retrieval/|src/config/)' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'module', 'typescript', 'default'],
    },
  },
};

export default config;
