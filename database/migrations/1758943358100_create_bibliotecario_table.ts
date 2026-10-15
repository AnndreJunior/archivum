import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'bibliotecario'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('nome', 120).notNullable()
      table.string('matricula', 6).notNullable().unique()
      table.string('email', 254).notNullable().unique()
      table.string('senha').notNullable()
      table.string('role', 20).notNullable().defaultTo('bibliotecario')
      table.boolean('ativo').notNullable().defaultTo(true)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
