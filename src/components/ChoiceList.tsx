import type { ResolvedChoice } from '../engine/resolve'
import { useStore } from '../state/store'
import { Counter, OptionCard } from './common'

/**
 * Renders the open questions a pick has opened up — a fighter's fighting style,
 * a dwarf's tool proficiency, the skills a background lets you swap in.
 *
 * Choices with many small options (skills, languages) render as a dense grid;
 * choices with meaty options render as full cards.
 */
export function ChoiceBlock({ choice }: { choice: ResolvedChoice }) {
  const { toggleSelection } = useStore()

  const dense = choice.options.length > 8 && choice.options.every((option) => !option.description)
  const counts = new Map<string, number>()
  for (const id of choice.selected) counts.set(id, (counts.get(id) ?? 0) + 1)

  return (
    <section className={`choice${choice.satisfied ? ' is-satisfied' : ''}`}>
      <header className="choice-header">
        <div>
          <h3 className="choice-prompt">{choice.prompt}</h3>
          <p className="choice-source">from {choice.source}</p>
        </div>
        <Counter current={choice.selected.length} total={choice.count} />
      </header>

      <div className={dense ? 'grid grid-dense' : 'grid grid-cards'}>
        {choice.options.map((option) => (
          <OptionCard
            key={option.id}
            name={option.name}
            summary={option.summary}
            description={option.description}
            selected={counts.has(option.id)}
            count={counts.get(option.id)}
            compact={dense}
            onSelect={() => toggleSelection(choice.key, option.id, choice.count, choice.allowDuplicates)}
          />
        ))}
      </div>
    </section>
  )
}

export function ChoiceList({ choices, emptyMessage }: { choices: ResolvedChoice[]; emptyMessage?: string }) {
  if (!choices.length) {
    return emptyMessage ? <p className="empty">{emptyMessage}</p> : null
  }
  return (
    <div className="choice-list">
      {choices.map((choice) => (
        <ChoiceBlock key={choice.key} choice={choice} />
      ))}
    </div>
  )
}
