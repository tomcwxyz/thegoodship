// Pure, testable Shipyard brief generation. These are suggestions to *explore*,
// not automated technology recommendations, cost estimates or scope decisions.
export const directionLabels=Object.freeze({
  unsure:'Explore alternatives first',
  improve:'Improve an existing tool or process',
  small:'Try a small working prototype',
  explore:'Start small with a bigger idea'
});

export const priorityLabels=Object.freeze({
  simplicity:'Ease of use',ownership:'Ownership and independence',
  speed:'Speed to a useful result',cost:'Low ongoing costs',unsure:'Not sure yet'
});

const readable=value=>typeof value==='string' && value.trim() ? value.trim() : 'Not specified';

export function possibleRoutes(answers) {
  const existing=readable(answers.currentApproach)!=='Not specified';
  const priority=answers.priority;
  const routes=[
    {
      title:'Make the current approach easier',
      description:existing ?
        'Simplify one frustrating step in the way you work now. Check whether better guidance, a shared template or a small automation would help.' :
        'Try a lightweight manual process or spreadsheet first to learn how the work actually happens.'
    },
    {
      title:'Adapt a tool that already exists',
      description:'See whether an off-the-shelf or open-source tool already meets the important needs. Test it with the people who would use it.'
    },
    {
      title:'Build the smallest useful thing',
      description:'Prototype one important workflow with invented data, then test what is genuinely useful before committing to a full system.'
    }
  ];
  const note=priority==='ownership' ?
    'Pay particular attention to hosting, data portability, source-code ownership and ongoing maintenance.' :
    priority==='cost' ?
      'Compare ongoing licence, hosting and maintenance costs, not just the cost of the first build.' :
    priority==='simplicity' ?
      'Test with the people who will use it; reducing steps is often better than adding features.' :
    priority==='speed' ?
      'Check which option can produce a useful improvement first, not simply the quickest demonstration.' :
      'Decide which outcomes matter before choosing technology.';
  return {routes,note};
}

export function createBrief(answers) {
  const {routes,note}=possibleRoutes(answers);
  return [
    'SHIPYARD — IDEA TO EXPLORE','',
    'The problem',readable(answers.problem),'',
    'Who this is for',readable(answers.people),'',
    'How things work now',readable(answers.currentApproach),'',
    'A better outcome',readable(answers.outcome),'',
    'What matters most',priorityLabels[answers.priority] || 'Not specified','',
    'An initial direction',directionLabels[answers.direction] || 'Not specified','',
    'Routes worth exploring (not recommendations yet)',
    ...routes.map((route,i)=>`${i+1}. ${route.title}: ${route.description}`),
    '',note,'',
    'The Good Ship will consider non-build and existing-tool options before proposing bespoke software. Prototype and quote delivery require a human review.'
  ].join('\n');
}
