import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'emprestimo'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('exemplar_id')
        .notNullable()
        .references('id')
        .inTable('exemplar')
        .onDelete('RESTRICT')
        .index()
      table
        .integer('aluno_id')
        .notNullable()
        .references('id')
        .inTable('aluno')
        .onDelete('RESTRICT')
        .index()
      table
        .integer('bibliotecario_retirada_id')
        .notNullable()
        .references('id')
        .inTable('bibliotecario')
        .onDelete('RESTRICT')
        .index()
      table
        .integer('bibliotecario_devolucao_id')
        .nullable()
        .references('id')
        .inTable('bibliotecario')
        .onDelete('RESTRICT')
        .index()

      table.date('data_retirada').notNullable()
      table.date('data_prevista_devolucao').notNullable().index()
      table.date('data_devolucao').nullable()
      table.integer('renovacoes').notNullable().defaultTo(0)
      table.string('status', 20).notNullable().defaultTo('ativo').index()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
