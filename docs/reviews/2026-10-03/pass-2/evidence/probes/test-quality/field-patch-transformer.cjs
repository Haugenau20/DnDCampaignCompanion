const repo = '/workspace/DnDCampaignCompanion';
const upstream = require(repo + '/node_modules/ts-jest').default.createTransformer();
module.exports = {
  process(source, filename, options) {
    if (process.env.PASS2_FIELD_PATCH === '1' && filename === repo + '/src/features/campaign-entities/quests/context/QuestContext.tsx') {
      const before = 'await updateData(quest.id, { ...quest, objectives });';
      if (source.split(before).length !== 2) throw new Error('Expected unique reviewed objective write');
      source = source.replace(before, 'await updateData(quest.id, { objectives });');
    }
    return upstream.process(source, filename, options);
  },
};
