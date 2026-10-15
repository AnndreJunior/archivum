import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'aluno'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('nome', 120).notNullable()
      table.string('matricula', 20).notNullable().unique()
      table.integer('ano_escolar').notNullable()
      table.string('turma', 1).notNullable()
      table.string('nivel', 20).notNullable()
      table.string('email', 254).nullable()
      table.string('telefone', 20).nullable()
      table.boolean('ativo').notNullable().defaultTo(true)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
