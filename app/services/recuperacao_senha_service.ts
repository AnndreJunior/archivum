import type Bibliotecario from '#models/bibliotecario'

/**
 * Dados para concluir a troca de senha a partir do token recebido por e-mail.
 * Espera-se que já tenham passado pelo `trocarSenhaValidator`.
 */
export type DadosRedefinicao = {
  token: string
  senha: string
}

/**
 * Recuperação de senha de bibliotecários: gera o token enviado por e-mail,
 * valida-o e efetiva a troca da senha.
 */
export default class RecuperacaoSenhaService {
  /**
   * Cria um novo token de redefinição para o bibliotecário, revogando os
   * tokens anteriores, e devolve o token em texto puro (o banco guarda apenas
   * o hash).
   */
  async gerarToken(_bibliotecario: Bibliotecario): Promise<string> {
    throw new Error('não implementado')
  }

  /**
   * Inicia a recuperação de senha para o e-mail informado. Apenas
   * bibliotecários ativos recebem o e-mail; para os demais a operação é
   * silenciosa, de modo a não revelar se o e-mail existe.
   */
  async solicitarRedefinicao(_email: string): Promise<void> {
    throw new Error('não implementado')
  }

  /**
   * Informa se o token existe e ainda está dentro do prazo de validade.
   */
  async validarToken(_token: string): Promise<boolean> {
    throw new Error('não implementado')
  }

  /**
   * Troca a senha do bibliotecário dono do token e invalida o token.
   *
   * Lança `TokenRedefinicaoInvalidoException` quando o token não existe, já
   * expirou ou já foi utilizado.
   */
  async redefinirSenha(_dados: DadosRedefinicao): Promise<Bibliotecario> {
    throw new Error('não implementado')
  }
}
