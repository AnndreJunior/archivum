import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

/**
 * Regras de geração do `database/schema.ts`.
 *
 * Oculta a coluna `senha` do bibliotecário na serialização dos models, do
 * mesmo modo que a regra padrão do Lucid faz com a coluna `password`.
 */
export default {
  columns: {
    senha: {
      tsType: 'string',
      imports: [],
      decorators: [{ name: '@column', args: { serializeAs: null } }],
    },
  },
} satisfies SchemaRules
