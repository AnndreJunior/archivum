import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'recuperacao_senha'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('bibliotecario_id')
        .notNullable()
        .references('id')
        .inTable('bibliotecario')
        .onDelete('CASCADE')
        .index()
      table.string('token_hash', 64).notNullable().unique()
      table.timestamp('expires_at').notNullable()

      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
