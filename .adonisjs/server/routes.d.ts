import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.login.attempt': { paramsTuple?: []; params?: {} }
    'auth.esqueci_senha': { paramsTuple?: []; params?: {} }
    'auth.esqueci_senha.enviar': { paramsTuple?: []; params?: {} }
    'auth.trocar_senha': { paramsTuple?: []; params?: {} }
    'auth.trocar_senha.atualizar': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
    'alunos.index': { paramsTuple?: []; params?: {} }
    'alunos.create': { paramsTuple?: []; params?: {} }
    'alunos.store': { paramsTuple?: []; params?: {} }
    'alunos.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'alunos.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'alunos.ativo': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'livros.index': { paramsTuple?: []; params?: {} }
    'livros.create': { paramsTuple?: []; params?: {} }
    'livros.store': { paramsTuple?: []; params?: {} }
    'livros.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'livros.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'autores.store': { paramsTuple?: []; params?: {} }
    'autores.create': { paramsTuple?: []; params?: {} }
    'exemplares.index': { paramsTuple?: []; params?: {} }
    'exemplares.create': { paramsTuple?: []; params?: {} }
    'exemplares.store': { paramsTuple?: []; params?: {} }
    'exemplares.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'exemplares.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'exemplares.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'emprestimos.index': { paramsTuple?: []; params?: {} }
    'emprestimos.create': { paramsTuple?: []; params?: {} }
    'emprestimos.store': { paramsTuple?: []; params?: {} }
    'emprestimos.renovar': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'emprestimos.devolver': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.esqueci_senha': { paramsTuple?: []; params?: {} }
    'auth.trocar_senha': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
    'alunos.index': { paramsTuple?: []; params?: {} }
    'alunos.create': { paramsTuple?: []; params?: {} }
    'alunos.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'livros.index': { paramsTuple?: []; params?: {} }
    'livros.create': { paramsTuple?: []; params?: {} }
    'livros.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'autores.create': { paramsTuple?: []; params?: {} }
    'exemplares.index': { paramsTuple?: []; params?: {} }
    'exemplares.create': { paramsTuple?: []; params?: {} }
    'exemplares.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'emprestimos.index': { paramsTuple?: []; params?: {} }
    'emprestimos.create': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.esqueci_senha': { paramsTuple?: []; params?: {} }
    'auth.trocar_senha': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
    'alunos.index': { paramsTuple?: []; params?: {} }
    'alunos.create': { paramsTuple?: []; params?: {} }
    'alunos.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'livros.index': { paramsTuple?: []; params?: {} }
    'livros.create': { paramsTuple?: []; params?: {} }
    'livros.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'autores.create': { paramsTuple?: []; params?: {} }
    'exemplares.index': { paramsTuple?: []; params?: {} }
    'exemplares.create': { paramsTuple?: []; params?: {} }
    'exemplares.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'emprestimos.index': { paramsTuple?: []; params?: {} }
    'emprestimos.create': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.login.attempt': { paramsTuple?: []; params?: {} }
    'auth.esqueci_senha.enviar': { paramsTuple?: []; params?: {} }
    'auth.trocar_senha.atualizar': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'alunos.store': { paramsTuple?: []; params?: {} }
    'livros.store': { paramsTuple?: []; params?: {} }
    'autores.store': { paramsTuple?: []; params?: {} }
    'exemplares.store': { paramsTuple?: []; params?: {} }
    'emprestimos.store': { paramsTuple?: []; params?: {} }
    'emprestimos.renovar': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'emprestimos.devolver': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'alunos.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'livros.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'exemplares.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'alunos.ativo': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'exemplares.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}