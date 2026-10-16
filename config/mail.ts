import env from '#start/env'
import { defineConfig, transports } from '@adonisjs/mail'
import type { InferMailers } from '@adonisjs/mail/types'

/**
 * Mail configuration.
 * Defines the mailers used to send transactional emails. In development and
 * tests the SMTP transport points to the `smtp4dev` server.
 */
const mailConfig = defineConfig({
  /**
   * The mailer to use when none is specified.
   */
  default: env.get('MAIL_MAILER'),

  /**
   * Global "from" address used when not defined on the message itself.
   */
  from: {
    address: env.get('MAIL_FROM_ADDRESS'),
    name: env.get('MAIL_FROM_NAME'),
  },

  /**
   * List of configured mailers. Each key is a mailer name.
   */
  mailers: {
    smtp: transports.smtp({
      host: env.get('SMTP_HOST'),
      port: env.get('SMTP_PORT'),
    }),
  },
})

export default mailConfig

declare module '@adonisjs/mail/types' {
  export interface MailersList extends InferMailers<typeof mailConfig> {}
}
