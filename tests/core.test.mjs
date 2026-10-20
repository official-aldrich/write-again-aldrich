import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyze,wordsOf} from '../src/lib/review.ts';
import {lessons,prompts,stages} from '../src/lib/course.ts';
import {emptyWorkspace,mergeWorkspace,safeBackup} from '../src/lib/workspace.ts';

const prompt=lessons[0].prompt;
const text=`Before our presentation, Bea slid her notes across the desk and circled the part I kept forgetting. I had spent the morning rehearsing the opening, but the explanation in the middle still confused me. She asked me to explain it without looking at the paper. I noticed that I was repeating the same sentence because I did not understand the connection between the two ideas.

We used an example from our own group meeting to explain the point. That example made the sequence easier to follow. I learned that preparing an explanation means checking the thought behind it, rather than memorizing the words. Now I ask myself what a listener needs to understand first.`;
const date='2026-10-20T10:00:00.000Z',newer='2026-10-20T10:01:00.000Z';
const draft=(id='draft-one',content=text,updatedAt=date)=>({id,title:'My paragraph',prompt,text:content,outline:['','',''],createdAt:date,updatedAt,completedChecks:[]});
function sample(){return {...emptyWorkspace(),drafts:[draft()],updatedAt:date};}

test('course has 16 complete lessons, four in each stage, and 64 unique topic prompts',()=>{
 assert.equal(lessons.length,16);assert.equal(prompts.length,64);assert.equal(new Set([...lessons.map(l=>l.prompt.id),...prompts.map(p=>p.id)]).size,80);
 for(let i=0;i<4;i++){assert.equal(lessons.filter(l=>l.stage===i).length,4);assert.ok(stages[i].threshold>=50);}
 for(const l of lessons){assert.ok(l.sections.every(s=>s.body.length>100));assert.equal(l.checklist.length,3);assert.ok(l.check.answer>=0&&l.check.answer<l.check.options.length);assert.equal(l.prompt.lessonId,l.id);}
 for(const p of prompts)assert.ok(p.minWords<=p.maxWords&&p.question.length>20);
});
test('word counting handles punctuation, contractions, Unicode, and empty input',()=>{
 assert.equal(wordsOf('').length,0);assert.deepEqual(wordsOf('I’m ready; cafés count, too!'),['I’m','ready','cafés','count','too']);
});
test('rubric is deterministic, bounded, and internally adds to its score',()=>{
 const a=analyze(text,prompt);assert.deepEqual(a,analyze(text,prompt));assert.ok(a.score>55&&a.score<=100);assert.equal(a.rubric.reduce((s,r)=>s+r.score,0),a.score);assert.ok(a.rubric.every(r=>r.score>=0&&r.score<=r.max));
});
test('direct and gentle feedback do not change the grade',()=>{
 const direct=analyze(text,prompt,'direct'),gentle=analyze(text,prompt,'gentle');assert.equal(direct.score,gentle.score);assert.notEqual(direct.summary,gentle.summary);
});
test('adding repeated nonsense does not earn a passing practice score',()=>{
 const r=analyze('banana '.repeat(200),prompt);assert.ok(r.score<50);assert.ok(r.issues.some(i=>i.title.includes('Repetition')));
});
test('an underdeveloped padded draft is flagged and scores below the developed example',()=>{
 const poor='In today’s society, there are many things that are very important. Due to the fact that these things are very important, everyone should really do them in order to be good.';
 const r=analyze(poor,prompt);assert.ok(r.score<analyze(text,prompt).score);assert.ok(r.issues.some(i=>i.title.includes('underdeveloped')));assert.ok(r.issues.some(i=>i.quote?.includes('Due to the fact that')));
});
test('quotes in feedback point to actual text, and paragraph counts tolerate CRLF',()=>{
 const input='In today’s world, I really really want to improve my writing.\r\n\r\nI remember a time when I wrote clearly because I knew the point I wanted to make.';
 const r=analyze(input,prompt);assert.equal(r.metrics.paragraphs,2);for(const issue of r.issues)if(issue.quote)assert.ok(input.includes(issue.quote));
});
test('word limits, missing punctuation, and duplicates are actionable flags',()=>{
 const r=analyze('I remember a meeting because it changed my thinking. '.repeat(12),{...prompt,minWords:20,maxWords:50});assert.ok(r.issues.some(i=>i.title.includes('exceeds')));assert.ok(r.issues.some(i=>i.title.includes('repeated')));
 const unfinished=analyze(text.replace(/\.$/,''),prompt);assert.ok(unfinished.issues.some(i=>i.title==='Finish the final sentence'));
});
test('empty drafts yield finite, low scores and do not crash analysis',()=>{
 const r=analyze('',prompt);assert.ok(Number.isFinite(r.score)&&r.score<30);assert.equal(r.metrics.words,0);assert.equal(r.metrics.paragraphs,0);
});
test('valid backups round-trip while malformed imports are rejected',()=>{
 const s=sample();assert.deepEqual(safeBackup(JSON.parse(JSON.stringify({workspace:s}))),s);assert.throws(()=>safeBackup({version:1,drafts:[{text:'broken'}]}));assert.throws(()=>safeBackup({...s,settings:{tone:'fake',dailyMinutes:15}}));
});
test('merging keeps unrelated work and newer edits from both devices',()=>{
 const a=sample(),b={...sample(),drafts:[draft('draft-one','A newer edit with a real observation.',newer),draft('draft-two','Another piece.',newer)],updatedAt:newer};const merged=mergeWorkspace(a,b);assert.equal(merged.drafts.length,2);assert.equal(merged.drafts.find(d=>d.id==='draft-one').text,b.drafts[0].text);assert.deepEqual(mergeWorkspace(merged,merged),merged);
});
test('conflicting save recovery preserves both texts without duplicating recovery records',()=>{
 const a=sample(),b={...sample(),drafts:[draft('draft-one','A competing version from another tab.',newer)],updatedAt:newer};const merged=mergeWorkspace(a,b,{preserveDraftConflicts:true});assert.equal(merged.drafts.length,2);assert.ok(merged.drafts.some(d=>d.text===text&&d.title.includes('recovered')));assert.ok(merged.drafts.some(d=>d.text===b.drafts[0].text));assert.equal(mergeWorkspace(merged,b,{preserveDraftConflicts:true}).drafts.length,2);
});
test('newer revision notes and bookmark removals survive merging',()=>{
 const review=analyze(text,prompt),attempt={id:'review-one',draftId:'draft-one',text,title:'My paragraph',prompt,review,createdAt:date,updatedAt:date,reflection:'Earlier plan'};
 const a={...sample(),attempts:[attempt],bookmarks:['prompt-1-1'],settingsUpdatedAt:date};const b={...sample(),attempts:[{...attempt,reflection:'A newer plan',updatedAt:newer}],bookmarks:[],settingsUpdatedAt:newer};const merged=mergeWorkspace(a,b);assert.equal(merged.attempts[0].reflection,'A newer plan');assert.deepEqual(merged.bookmarks,[]);
});
