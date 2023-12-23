import { CompanionActionDefinition, CompanionActionDefinitions, InstanceBase } from '@companion-module/base'
import { NodeCGConfig } from './config'

export enum ActionId {}

export function GetActionsList(
  _self: InstanceBase<NodeCGConfig>,
  executeMethod: (bundleName: string, methodName: string) => void,
  methodList: any[]
): CompanionActionDefinitions {
  const actions: { [key: string]: CompanionActionDefinition | undefined } = {}

  for (const method of methodList) {
    actions['method_' + method.bundleName + '_' + method.methodName] = {
      name: method.bundleName + ': ' + (method.ui?.title ?? method.methodName),
      description: method.ui?.description,
      options: method.ui?.companionFields ?? [],
      callback: () => {
        executeMethod(method.bundleName, method.methodName)
      },
    }
  }

  return actions
}
