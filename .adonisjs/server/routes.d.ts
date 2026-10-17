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
  }
  GET: {
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.esqueci_senha': { paramsTuple?: []; params?: {} }
    'auth.trocar_senha': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.esqueci_senha': { paramsTuple?: []; params?: {} }
    'auth.trocar_senha': { paramsTuple?: []; params?: {} }
    'home': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.login.attempt': { paramsTuple?: []; params?: {} }
    'auth.esqueci_senha.enviar': { paramsTuple?: []; params?: {} }
    'auth.trocar_senha.atualizar': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}