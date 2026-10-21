import preset from '@adonisjs/prettier-config'

export default {
  ...preset,
  plugins: ['./tools/prettier-edge-fixed.mjs'],
}
