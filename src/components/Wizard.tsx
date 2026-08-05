import { useStore } from '../state/store'
import { AbilitiesStep } from './steps/AbilitiesStep'
import { ChoicesStep, IdentityStep, IntroStep, LevelStep, PickStep } from './steps/BasicSteps'
import { EquipmentStep } from './steps/EquipmentStep'
import { ReviewStep } from './steps/ReviewStep'
import { SpellsStep } from './steps/SpellsStep'

/** Maps the current step's `kind` onto the component that renders it. */
function StepBody() {
  const { step } = useStore()

  switch (step.kind) {
    case 'intro':
      return <IntroStep step={step} />
    case 'level':
      return <LevelStep />
    case 'pick':
      return <PickStep step={step} />
    case 'abilities':
      return <AbilitiesStep />
    case 'choices':
      return <ChoicesStep />
    case 'equipment':
      return <EquipmentStep step={step} />
    case 'spells':
      return <SpellsStep step={step} />
    case 'identity':
      return <IdentityStep step={step} />
    case 'review':
      return <ReviewStep />
  }
}

export function Wizard() {
  const { step, steps, stepIndex, next, back, validation } = useStore()
  const status = validation.steps[step.id]
  const isLast = stepIndex === steps.length - 1

  return (
    <div className="wizard">
      <header className="wizard-header">
        <p className="wizard-progress">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h1>{step.title}</h1>
        {step.subtitle && <p className="wizard-subtitle">{step.subtitle}</p>}
      </header>

      <div className="wizard-body">
        <StepBody />
      </div>

      <footer className="wizard-footer">
        <button type="button" className="button" onClick={back} disabled={stepIndex === 0}>
          Back
        </button>

        <div className="wizard-status" role="status">
          {status && !status.complete && status.issues.length > 0 && (
            <span className={status.blocking ? 'status-blocking' : 'status-note'}>{status.issues[0]}</span>
          )}
        </div>

        {!isLast && (
          <button type="button" className="button button-primary" onClick={next}>
            {status?.blocking ? 'Skip for now' : 'Continue'}
          </button>
        )}
      </footer>
    </div>
  )
}
