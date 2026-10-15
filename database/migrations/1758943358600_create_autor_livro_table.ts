import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'autor_livro'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.integer('livro_id').notNullable().references('id').inTable('livro').onDelete('CASCADE')
      table.integer('autor_id').notNullable().references('id').inTable('autor').onDelete('CASCADE')

      table.primary(['livro_id', 'autor_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
