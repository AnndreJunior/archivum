import { randomBytes } from 'node:crypto'

/**
 * Gera a senha inicial aleatória do bibliotecário.
 *
 * O bibliotecário nunca recebe essa senha: ele define a própria senha pelo
 * fluxo de "Esqueci minha senha".
 */
export function gerarSenhaAleatoria(): string {
  return randomBytes(32).toString('base64url')
}
