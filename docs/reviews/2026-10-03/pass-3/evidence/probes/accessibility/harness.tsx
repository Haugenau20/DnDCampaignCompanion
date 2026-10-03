import React from '/workspace/DnDCampaignCompanion/node_modules/react';
import { createRoot } from '/workspace/DnDCampaignCompanion/node_modules/react-dom/client';
import { MemoryRouter } from '/workspace/DnDCampaignCompanion/node_modules/react-router-dom';
import { ThemeProvider } from '/workspace/DnDCampaignCompanion/src/core/themes/ThemeContext';
import AttachTray from '/workspace/DnDCampaignCompanion/src/shared/components/attach-tray/AttachTray';
import CommandPalette from '/workspace/DnDCampaignCompanion/src/shared/components/command-palette/CommandPalette';
import QuickAddForm from '/workspace/DnDCampaignCompanion/src/shared/components/quick-add/QuickAddForm';
import QuickAddDialog from '/workspace/DnDCampaignCompanion/src/shared/components/quick-add/QuickAddDialog';
import Dialog from '/workspace/DnDCampaignCompanion/src/core/components/Dialog';
import Button from '/workspace/DnDCampaignCompanion/src/core/components/Button';
import Select from '/workspace/DnDCampaignCompanion/src/core/components/Select';
import ChapterRail from '/workspace/DnDCampaignCompanion/src/features/storytelling/stories/components/ChapterRail';
import '/workspace/DnDCampaignCompanion/src/styles/globals.css';

(window as any).__probe = { attached: [], detached: [], created: [], quickAdd: [], navigated: [], writes: 0, ready: false };
const people = [{ id: 'ada', name: 'Ada Lovelace', occupation: 'Scholar' }, { id: 'alan', name: 'Alan Turing', occupation: 'Scholar' }];
const chapters = Array.from({ length: 30 }, (_, i) => ({ chapter: { id: `c${i}`, title: `Synthetic chapter ${i}`, order: i + 1 }, state: 'unread' }));

function Harness() {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [railOpen, setRailOpen] = React.useState(false);
  const [attached, setAttached] = React.useState<string[]>([]);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const mode = location.hash.slice(1) || 'attach';
  React.useEffect(() => { (window as any).__probe.ready = true; }, []);
  return <ThemeProvider><MemoryRouter><main className="p-4">
    {mode === 'attach' && <AttachTray kinds={['npc']} sources={{ npc: people }} attachedIds={attached}
      onAttach={id => { (window as any).__probe.attached.push(id); setAttached(ids => [...ids, id]); }}
      onDetach={id => { (window as any).__probe.detached.push(id); setAttached(ids => ids.filter(x => x !== id)); }}
      onCreateNew={kind => (window as any).__probe.created.push(kind)} ariaLabel="Who is in it" />}
    {mode === 'palette' && <><Button ref={triggerRef} onClick={() => setPaletteOpen(true)}>Open palette</Button>
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} triggerRef={triggerRef} /></>}
    {mode === 'form' && <QuickAddForm entity="npc" autoFocus={false} navigateOnCreate={false} />}
    {mode === 'quick-dialog' && <><Button id="quick-trigger" onClick={() => setDialogOpen(true)}>Open quick add</Button>
      <Button id="quick-background">Background action</Button>
      <QuickAddDialog entity={dialogOpen ? 'npc' : null} onClose={() => setDialogOpen(false)} />
    </>}
    {mode === 'dialog' && <><Button id="dialog-trigger" onClick={() => setDialogOpen(true)}>Open dialog</Button>
      <Button id="background-button">Background action</Button>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Synthetic decision">
        <input aria-label="Synthetic value" /><Button id="last-dialog-button">Confirm</Button>
      </Dialog></>}
    {mode === 'rail' && <div className="flex">
      <ChapterRail items={chapters as any} currentChapterId="c25" isOpen={railOpen} onClose={() => setRailOpen(false)}
        onChapterSelect={id => (window as any).__probe.navigated.push(id)} onBackToIndex={() => {}} />
      <div><Button id="rail-trigger" onClick={() => setRailOpen(true)}>Chapters</Button>
        <Button id="reader-action">Edit chapter</Button></div>
    </div>}
    {mode === 'contrast' && <><h1>Contrast controls</h1>
      <Button id="contrast-button">Primary action</Button><Button id="contrast-outline" variant="outline">Outline action</Button>
      <div className="card p-4 mt-4"><p className="typography-secondary">Secondary card text</p>
        <p className="form-error">Field error</p><Select label="Native choice" helperText="Selection helper"><option>A</option></Select></div>
    </>}
  </main></MemoryRouter></ThemeProvider>;
}
createRoot(document.getElementById('root')!).render(<Harness />);
