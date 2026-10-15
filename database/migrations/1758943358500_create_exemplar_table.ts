import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'exemplar'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table
        .integer('livro_id')
        .notNullable()
        .references('id')
        .inTable('livro')
        .onDelete('RESTRICT')
        .index()
      table.string('codigo', 30).notNullable().unique()
      table.string('situacao', 20).notNullable().defaultTo('disponivel').index()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
