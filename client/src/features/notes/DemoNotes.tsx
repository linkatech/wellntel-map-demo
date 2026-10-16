import type { ReactNode } from 'react'

type DemoNotesProps = {
  hasApiAccess: boolean
  onApiAccessChange: (value: boolean) => void
}

export function DemoNotes({ hasApiAccess, onApiAccessChange }: DemoNotesProps) {
  return (
    <aside
      aria-label="Team notes"
      className="flex h-full w-[24rem] shrink-0 flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-white/10"
    >
      <header className="flex items-center justify-between gap-3 bg-neutral-800 px-4 py-3 text-white">
        <h1 className="shrink-0 text-sm font-semibold tracking-wide">Team notes</h1>
        <p className="whitespace-nowrap text-xs text-neutral-300">What to look for in this demo</p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-5">
          <NoteSection title="All tab">
            <li>Network overview: counts of sensors, readings, locations by source and region.</li>
            <li>The map shows every source at once. Wells and cells can’t be selected.</li>
            <li>The time range filters both the summary and the map.</li>
          </NoteSection>

          <NoteSection title="Wellntel Sensors — map">
            <li>Purple points are Wellntel wells with readings in the time range.</li>
            <li>Selecting a well shows a popup with its basics.</li>
          </NoteSection>

          <NoteSection title="Wellntel Sensors — detail view">
            <li>
              Wells are selected from the dropdown or the map. The card shows metadata of the
              selected sensor.
            </li>
            <li>The chart shows monthly depth for the time range.</li>
          </NoteSection>

          <NoteSection title="Other Sensors">
            <li>Same as Wellntel Sensors, with yellow points.</li>
          </NoteSection>

          <NoteSection title="External sources — map">
            <li>External sources appear as a grid. Darker cells have more stations.</li>
            <li>Hovering a cell previews its stations. Clicking opens it in the sidebar.</li>
          </NoteSection>

          <NoteSection title="External sources — detail and fetch">
            <li>The sidebar lists the cell’s stations.</li>
            <li>Fetch readings pulls the checked stations through the source’s API.</li>
          </NoteSection>

          <NoteSection title="Health of external sources">
            <li>Source Health shows Up or Down plus pings from the last hour.</li>
            <li>Each dot shows its ping time on hover. The All tab lists every source’s status.</li>
          </NoteSection>

          <NoteSection title="Tooltips">
            <li>Orange help bubbles open on a 1s hover or click.</li>
            <li>Cell hover cards and ping dots have tooltips too.</li>
          </NoteSection>

          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900">
              Paid API access
            </h2>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-justify text-[13px] leading-snug text-slate-800">
              <li>Fetching from external APIs is a paid feature.</li>
              <li>Without access, Fetch readings is muted with a Premium badge.</li>
            </ul>
            <label className="mt-3 flex flex-col gap-1.5">
              <span className="text-[13px] text-slate-800">
                Preview as
              </span>
              <select
                className="w-2/3 rounded-md border border-amber-500/50 bg-amber-500/15 px-2.5 py-1.5 text-sm font-semibold text-amber-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                value={hasApiAccess ? 'with' : 'without'}
                onChange={(event) => onApiAccessChange(event.target.value === 'with')}
              >
                <option value="with">User with API access</option>
                <option value="without">User without API access</option>
              </select>
            </label>
          </section>
        </div>
      </div>
    </aside>
  )
}

function NoteSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-wide text-slate-900">{title}</h2>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-justify text-[13px] leading-snug text-slate-800">
        {children}
      </ul>
    </section>
  )
}
