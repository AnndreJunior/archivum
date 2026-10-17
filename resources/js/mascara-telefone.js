/**
 * Máscara de telefone do formulário de aluno.
 *
 * A formatação "de verdade" (validação e persistência) vive no model
 * (`Aluno.formatarTelefone`) e no validator; aqui há apenas uma cópia enxuta,
 * só para formatar o valor na tela enquanto o usuário digita.
 */

/**
 * Formata dígitos progressivamente para (XX) 9XXXX-XXXX (celular, 11 dígitos)
 * ou (XX) XXXX-XXXX (fixo, 10 dígitos), no máximo 11 dígitos.
 */
export function formatarTelefone(valor) {
  const digitos = String(valor).replace(/\D/g, '').slice(0, 11)

  if (digitos.length === 0) return ''
  if (digitos.length <= 2) return `(${digitos}`
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
}

function aplicarMascara(input) {
  input.addEventListener('input', () => {
    input.value = formatarTelefone(input.value)
  })
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('input[name="telefone"]').forEach(aplicarMascara)
}
