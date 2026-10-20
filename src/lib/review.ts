import type { FeedbackItem, Prompt, Review } from './types';

export const wordsOf=(text:string):string[]=>text.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu)||[];
const common=new Set('the a an and or but if then is are was were be been being to of in on at for with from as by it its this that these those i me my we our you your they their he she his her them us not no so do does did have has had can could will would should may might must about into than when what how which who all any some one also very more most much many just such there here because through out up over after before only each every now still even while'.split(' '));
const fillers:[RegExp,string,string][]=[
 [/\bdue to the fact that\b/gi,'due to the fact that','because'],[/\bin order to\b/gi,'in order to','to'],[/\bit is important to note that\b/gi,'it is important to note that','state the point directly'],[/\bat this point in time\b/gi,'at this point in time','now'],[/\bin today[’']s (?:society|world)\b/gi,'in today’s society/world','begin with the situation you actually mean'],[/\bsince the dawn of time\b/gi,'since the dawn of time','begin at a specific moment'],[/\b(?:very|really|extremely)\b/gi,'an intensifier','try a more precise word or delete it'],[/\b(?:a lot of things|many things|something important)\b/gi,'a vague phrase','name the thing you mean'],[/\b(?:sky is the limit|never give up|everything happens for a reason|stepping stone|blessing in disguise)\b/gi,'a familiar slogan','explain the particular insight your experience adds'],
];
const clamp=(v:number,min=0,max=20)=>Math.max(min,Math.min(max,Math.round(v)));
export function analyze(text:string,prompt:Prompt,tone:'direct'|'gentle'='direct'):Review{
 const normalized=text.replace(/\r\n?/g,'\n').trim();
 const words=wordsOf(normalized),count=words.length;
 const paragraphs=normalized.split(/\n\s*\n/).map(p=>p.trim()).filter(Boolean);
 const sentences=(normalized.match(/[^.!?]+(?:[.!?]+|$)/g)||[]).map(s=>s.trim()).filter(Boolean);
 const lengths=sentences.map(s=>wordsOf(s).length),avg=count/Math.max(1,sentences.length);
 const long=sentences.filter((_,i)=>lengths[i]>32),tiny=lengths.filter(n=>n<4).length;
 const freq=new Map<string,number>();
 for(const w of words.map(w=>w.toLowerCase()))if(w.length>3&&!common.has(w))freq.set(w,(freq.get(w)||0)+1);
 const repetition=[...freq].filter(([,n])=>n>=3).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([word,count])=>({word,count}));
 const repeated=repetition.filter(r=>r.count/Math.max(1,count)>.045&&r.count>=5);
 const unique=new Set(words.map(w=>w.toLowerCase())).size/Math.max(1,count);
 const duplicateSentences=sentences.length-new Set(sentences.map(s=>s.toLowerCase().replace(/\s+/g,' '))).size;
 const fillerHits=fillers.map(([re,label,fix])=>({matches:[...normalized.matchAll(re)],label,fix})).filter(h=>h.matches.length);
 const fillerCount=fillerHits.reduce((n,h)=>n+h.matches.length,0);
 const hasExample=/\b(for example|for instance|such as|when I|one (day|afternoon|morning|time)|I (remember|noticed|watched|found|asked|put|sat|walked|said|realized)|during (our|my|the)|last (week|year|month))\b|[“”"]|\b\d+\b/i.test(normalized);
 const hasExplanation=/\b(because|so that|this (shows|suggests|means|reveals)|which (means|shows)|as a result|therefore|I (learned|realized|understood)|made me|taught me|rather than|instead of|but it|it changes)\b/i.test(normalized);
 const hasQualification=/\b(however|although|while|unless|provided|except|might|may|some|not (all|always)|on the other hand|a concern|an objection|critics|depends|in (some|this) (cases|case|context)|but)\b/i.test(normalized);
 const overclaims=normalized.match(/\b(everyone|nobody|always|never|all people|every student|undeniably|without a doubt)\b/gi)||[];
 const startsGeneric=/^(since the dawn|in today|nowadays|throughout history|in this essay|there are many|[a-z]+ is (very )?important)/i.test(normalized);
 const lowerStarts=sentences.filter(s=>/^[a-z]/.test(s.replace(/^[“"'\s]+/,'')));
 const doubles=normalized.match(/\b([\p{L}]+)\s+\1\b/giu)||[];
 const spaceErrors=normalized.match(/[a-z][.!?][A-Z]|\s+[,.;:!?]/g)||[];
 const noEnd=count>10&&!/[.!?][”"']?$/.test(normalized);
 const expectedParagraphs=prompt.kind==='micro'?1:3;
 const developed=paragraphs.filter(p=>wordsOf(p).length>=Math.min(35,prompt.minWords/3)).length;
 const promptTerms=[...new Set(wordsOf(prompt.question).map(w=>w.toLowerCase()).filter(w=>w.length>4&&!common.has(w)))];
 const overlap=promptTerms.filter(w=>words.some(t=>t.toLowerCase()===w)).length;
 let task=clamp(10+Math.min(count/prompt.minWords,1)*7+(overlap?2:0)-(count>prompt.maxWords?Math.min(7,(count-prompt.maxWords)/prompt.maxWords*15):0)-(startsGeneric?3:0));
 let structure=clamp(8+Math.min(developed,expectedParagraphs)/expectedParagraphs*9+(hasExplanation?2:0)-(duplicateSentences?Math.min(10,duplicateSentences*3):0));
 let support=clamp(7+(hasExample?5:0)+(hasExplanation?5:0)+(prompt.kind!=='argument'||hasQualification?2:0));
 let craft=clamp(19-long.length/Math.max(1,sentences.length)*10-fillerCount*1.4-repeated.length*2-(avg>35?3:0)-(tiny/Math.max(1,sentences.length)>.55?4:0));
 let editing=clamp(19-lowerStarts.length*1.5-doubles.length*3-spaceErrors.length*2-(noEnd?2:0));
 if(count<prompt.minWords){const factor=Math.max(.2,Math.min(1,count/prompt.minWords));task=clamp(task*factor);structure=clamp(structure*factor);support=clamp(support*factor);}
 const suspicious=count>40&&(unique<.24||duplicateSentences>sentences.length*.35||([...freq.values()].sort((a,b)=>b-a)[0]||0)/count>.22);
 if(suspicious){task=Math.min(task,5);structure=Math.min(structure,5);support=Math.min(support,5);craft=Math.min(craft,5);editing=Math.min(editing,8);}
 if(count<20){task=Math.min(task,3);structure=Math.min(structure,3);support=Math.min(support,3);craft=Math.min(craft,7);editing=Math.min(editing,8);}
 const rubric=[
  {label:'Task & focus signals',score:task,max:20,detail:`${count} words; target ${prompt.minWords}–${prompt.maxWords}. ${overlap} prompt-keyword match${overlap===1?'':'es'}. Keyword overlap cannot establish relevance.`},
  {label:'Paragraph development',score:structure,max:20,detail:`${paragraphs.length} paragraph${paragraphs.length===1?'':'s'}, ${developed} with at least ${Math.min(35,prompt.minWords/3).toFixed(0)} words. Checks development signals, not the logic of the order.`},
  {label:'Support & reflection signals',score:support,max:20,detail:`Example cue: ${hasExample?'found':'not found'}. Explanation cue: ${hasExplanation?'found':'not found'}. These patterns do not verify evidence or depth.`},
  {label:'Sentence craft',score:craft,max:20,detail:`Average ${avg.toFixed(1)} words per sentence; ${long.length} over 32 words; ${fillerCount} phrase flag${fillerCount===1?'':'s'}. Longer sentences are not automatically wrong.`},
  {label:'Editing checks',score:editing,max:20,detail:`${doubles.length} repeated-word flag${doubles.length===1?'':'s'}; ${lowerStarts.length} possible lowercase start${lowerStarts.length===1?'':'s'}; ${spaceErrors.length} spacing flag${spaceErrors.length===1?'':'s'}. This is a limited pattern check, not a full grammar check.`},
 ];
 const score=rubric.reduce((n,r)=>n+r.score,0),issues:FeedbackItem[]=[];
 const add=(title:string,observation:string,action:string,quote?:string,severity:'priority'|'polish'='priority')=>issues.push({title,observation,action,quote,severity});
 if(suspicious)add('Repetition is overwhelming the draft','The text has very low word variety, dominant repetition, or duplicate sentences. Adding more of the same is not development.','Replace repeated material with a particular event, a new reason, and an explanation of its significance.');
 if(count<prompt.minWords)add('The idea is still underdeveloped',`You wrote ${count} words against a minimum practice target of ${prompt.minWords}. ${tone==='direct'?'There is not enough material here to test a complete response.':'Give yourself room to develop the thought.'}`,`Add about ${prompt.minWords-count} words by developing an example and explaining its connection. Do not pad the draft.`);
 if(count>prompt.maxWords)add('The draft exceeds the practice limit',`You are ${count-prompt.maxWords} words over the ${prompt.maxWords}-word target.`,`Cut repeated context first. Keep the detail or reflection that changes what the reader understands.`);
 if(startsGeneric)add('Your opening delays the actual essay',tone==='direct'?'The opening relies on a broad setup that could belong to many essays. It spends attention before offering something specific.':'A more specific opening could help the reader enter your experience sooner.','Try beginning with a person doing something, a concrete problem, or the precise claim you will defend.',sentences[0]);
 if(paragraphs.length<expectedParagraphs&&count>=prompt.minWords)add('Give the reader a visible structure',`The draft has ${paragraphs.length} paragraph${paragraphs.length===1?'':'s'}. This task needs room for distinct stages of thought.`,'Insert a blank line where the purpose changes. Label the job of each paragraph in your outline; split only when the idea changes.');
 if(!hasExample)add('Support needs a closer look','No common example or scene cues were detected. This does not prove examples are absent, but it is a reason to inspect your support.','Underline your most particular action, event, or verified source. If you cannot find one, add one and explain its relevance.');
 if(!hasExplanation)add('Do the work after the example','The draft has no common explanation or reflection cues. A description or assertion alone may leave the connection for the reader to guess.','After your best example, answer: what exactly does this reveal, and how does it change or support the point?');
 if(prompt.kind==='argument'&&!hasQualification)add('Stress-test the position','No common qualification or counterargument cues were detected. An argument becomes more defensible when it faces a real limitation.','State the strongest reasonable objection, then answer it or narrow your claim. Do not add “however” without a real objection.');
 if(long.length)add('An overloaded sentence needs inspection',`${long.length} sentence${long.length===1?'':'s'} exceed 32 words. ${tone==='direct'?'Length is not sophistication; check whether the reader can follow the main action.':'Check whether the main action remains easy to follow.'}`,'Read this sentence aloud. If it carries two separate claims, split it where the thought changes.',long[0], 'polish');
 for(const hit of fillerHits.slice(0,3))add('Make the wording earn its place',`Found ${hit.label} ${hit.matches.length} time${hit.matches.length===1?'':'s'}. The wording may be familiar, padded, or vague.`,`Try this revision: ${hit.fix}. Keep the original only if it contributes a distinction.`,hit.matches[0][0],'polish');
 if(repeated.length)add('Repetition may be replacing development',`“${repeated[0].word}” appears ${repeated[0].count} times. Deliberate repetition can connect ideas, but this frequency deserves a check.`,'Check whether each use adds meaning. Combine repeated claims rather than swapping in random synonyms.',undefined,'polish');
 if(doubles.length)add('Remove an accidental repeated word',`A neighboring repeated word was found: “${doubles[0]}”.`,'Read the sentence in context and delete the duplicate if accidental.',doubles[0],'polish');
 if(lowerStarts.length)add('Check sentence capitalization',`${lowerStarts.length} possible sentence start${lowerStarts.length===1?'':'s'} begin with a lowercase letter. Abbreviations and quotations can create false flags.`,'Check this sentence boundary and capitalize if a new sentence begins here.',lowerStarts[0],'polish');
 if(noEnd)add('Finish the final sentence','The draft does not end with common sentence punctuation.','Complete the thought and check its punctuation.',undefined,'polish');
 if(overclaims.length&&prompt.kind==='argument')add('Check the scope of this claim',`Found “${overclaims[0]}”. An absolute word can promise more than your support establishes.`,'Decide whether you mean all cases. If not, name the circumstances or group your evidence actually supports.',overclaims[0],'polish');
 if(duplicateSentences)add('A sentence is repeated',`${duplicateSentences} duplicate sentence${duplicateSentences===1?' was':'s were'} detected.`,'Remove accidental duplicates. Use the space to add a distinct reason or reflection.');
 const strengths:string[]=[];
 if(count>=prompt.minWords&&count<=prompt.maxWords)strengths.push(`You worked within the ${prompt.minWords}–${prompt.maxWords}-word practice range.`);
 if(hasExample)strengths.push('An example or scene cue is present; check that it truly supports your point.');
 if(hasExplanation)strengths.push('The draft contains explanation or reflection language rather than only assertions.');
 if(!long.length&&sentences.length>=3)strengths.push('No sentence exceeds the 32-word inspection threshold.');
 if(!fillerCount&&count>=40)strengths.push('None of the common filler phrases in this checker were found.');
 if(!issues.length)add('Move beyond what a pattern checker can see','The mechanical checks found no major flag. That does not establish that the essay is convincing or insightful.','Test the central claim against your best counterexample, then ask a trusted reader which sentence changed their understanding.');
 const band=score>=85?'Ready for a deeper read':score>=70?'Developing control':score>=55?'Build the next layer':score>=40?'Needs development':'An early draft';
 const summary=tone==='direct'?`${band}. ${issues[0].title}. Fix the highest-impact problem before polishing the vocabulary.`:`${band}. You have material to work with. Begin with “${issues[0].title.toLowerCase()}” and revise one thing at a time.`;
 return {score,band,mode:'rubric',tone,summary,rubric,issues,strengths:strengths.slice(0,4),metrics:{words:count,sentences:sentences.length,paragraphs:paragraphs.length,avgSentence:Math.round(avg*10)/10,longSentences:long.length,repetition},questions:prompt.kind==='argument'?['What is the precise claim, and could a reasonable person disagree?','Does the support justify the scope of the conclusion?','What is the strongest objection I have not answered?']:['What does the reader learn about my thinking beyond the event itself?','Which detail could belong only to this experience?','Does the ending reveal an earned insight or repeat a familiar slogan?'],version:1};
}
