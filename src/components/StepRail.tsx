import { useStore } from '../state/store'

/**
 * The left-hand rail. Every step is reachable at any time — the wizard guides,
 * it does not gate — but each one carries a status so nothing gets forgotten.
 */
export function StepRail() {
  const { steps, stepIndex, goToStep, validation } = useStore()

  return (
    <nav className="rail" aria-label="Character creation steps">
      <ol>
        {steps.map((step, index) => {
          const status = validation.steps[step.id]
          const state = index === stepIndex ? 'current' : status?.blocking ? 'blocking' : status?.complete ? 'done' : 'todo'

          return (
            <li key={step.id}>
              <button
                type="button"
                className={`rail-step is-${state}`}
                onClick={() => goToStep(index)}
                aria-current={index === stepIndex ? 'step' : undefined}
              >
                <span className="rail-marker" aria-hidden="true">
                  {state === 'done' ? '✓' : state === 'blocking' ? '!' : index + 1}
                </span>
                <span className="rail-label">{step.title}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
