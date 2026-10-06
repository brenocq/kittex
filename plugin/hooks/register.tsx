import type { Register } from 'claude-code'

// Skeleton, replaced by feat/plugin.
export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) => next(e))
}
