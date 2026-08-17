import type { ReactiveController, ReactiveControllerHost } from 'lit'
import type { ProgressState } from '../state/progress-state.js'

/** Re-renders the host whenever the progress state changes. */
export class StateController implements ReactiveController {
  #unsubscribe: (() => void) | undefined

  constructor(
    private readonly host: ReactiveControllerHost,
    readonly state: ProgressState,
  ) {
    host.addController(this)
  }

  hostConnected(): void {
    this.#unsubscribe = this.state.subscribe(() => this.host.requestUpdate())
  }

  hostDisconnected(): void {
    this.#unsubscribe?.()
    this.#unsubscribe = undefined
  }
}
