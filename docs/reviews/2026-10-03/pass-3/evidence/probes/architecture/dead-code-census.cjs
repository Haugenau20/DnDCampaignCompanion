// Read only. Module graph is checked separately; this records source-map absence
// and all non-test textual symbol references so comments are not counted as callers.
const fs = require('fs');
const path = require('path');
const root = '/workspace/DnDCampaignCompanion';
const candidates = [
 ['src/core/components/Chip.tsx', ['SelectableChip','RemovableChip']],
 ['src/core/config/buildConfig.ts', ['buildConfig']],
 ['src/core/services/index.ts', []],
 ['src/features/collaboration/notes/utils/note-relationships.ts', ['linkNoteToEntity','unlinkNoteFromEntity','getEntitiesForNote']],
 ['src/pages/layouts/common/components/LoadingState.tsx', ['LoadingState']],
 ['src/pages/layouts/common/utils/layoutUtils.ts', ['calculateCompletionPercentage']],
 ['src/shared/components/attach-tray/useAttachTray.ts', ['useAttachSet']],
 ['src/features/collaboration/entity-extraction/hooks/useOpenAIExtractor.ts', ['useOpenAIExtractor']],
 ['src/features/collaboration/entity-extraction/components/EntityExtractor.tsx', ['EntityExtractor']],
];
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const sources = walk(path.join(root,'src')).filter(f => /\.tsx?$/.test(f) && !/__tests__|\.test\.|test-utils|__mocks__|setupTests|utils\/__dev__/.test(f));
const maps = walk(path.join(root,'build/static/js')).filter(f=>f.endsWith('.map')).map(f=>({name:path.basename(f),data:JSON.parse(fs.readFileSync(f,'utf8'))}));
const results = candidates.map(([file,symbols])=>({
 file,
 lines:fs.readFileSync(path.join(root,file),'utf8').split('\n').length,
 sourceMapEntries:maps.flatMap(m=>m.data.sources.filter(s=>s.endsWith(file.slice(4))).map(source=>({map:m.name,source}))),
 symbolReferences: sources.flatMap(f=>fs.readFileSync(f,'utf8').split('\n').flatMap((line,i)=>symbols.some(s=>new RegExp('\\b'+s+'\\b').test(line)) ? [{file:path.relative(root,f),line:i+1,text:line.trim()}] : []))
}));
console.log(JSON.stringify({sourceMapFiles:maps.length,results},null,2));
