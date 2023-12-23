import { SomeCompanionConfigField } from '@companion-module/base'

export const portDefault = 9000

export interface NodeCGConfig {
  url?: string
  token?: string
}

export function GetConfigFields(): SomeCompanionConfigField[] {
  return [
    {
      id: 'url',
      type: 'textinput',
      label: 'NodeCG URL',
      width: 6,
    },
    {
      id: 'token',
      type: 'textinput',
      label: 'Access Token',
      width: 6,
    },
  ]
}
