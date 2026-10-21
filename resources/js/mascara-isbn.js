/**
 * Máscara de ISBN do formulário de livro.
 *
 * A formatação "de verdade" (validação e persistência) vive no model
 * (`Livro.formatarIsbn`) e no validator; aqui há apenas uma cópia enxuta,
 * só para formatar o valor na tela enquanto o usuário digita.
 */

/**
 * Formata dígitos progressivamente para XXX-XX-XXX-XXXX-X, no máximo 13
 * dígitos.
 */
export function formatarIsbn(valor) {
  const digitos = String(valor).replace(/\D/g, '').slice(0, 13)

  if (digitos.length === 0) return ''
  if (digitos.length <= 3) return digitos
  if (digitos.length <= 5) return `${digitos.slice(0, 3)}-${digitos.slice(3)}`
  if (digitos.length <= 8) {
    return [digitos.slice(0, 3), digitos.slice(3, 5), digitos.slice(5)].join('-')
  }
  if (digitos.length <= 12) {
    return [digitos.slice(0, 3), digitos.slice(3, 5), digitos.slice(5, 8), digitos.slice(8)].join(
      '-'
    )
  }
  return [
    digitos.slice(0, 3),
    digitos.slice(3, 5),
    digitos.slice(5, 8),
    digitos.slice(8, 12),
    digitos.slice(12),
  ].join('-')
}

function aplicarMascara(input) {
  input.value = formatarIsbn(input.value)

  input.addEventListener('input', () => {
    input.value = formatarIsbn(input.value)
  })
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('input[name="isbn"]').forEach(aplicarMascara)
}
