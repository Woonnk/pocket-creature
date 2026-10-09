import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVoiceCommand,voicePose} from '../renderer/voice-commands.mjs';

test('whole-message creature requests accept politeness and literal names',()=>{
  for(const [text,action] of [['go home','home'],['check your toys','visitToys'],['Take a nap!','sleep'],['Could you please wake up?','wake'],['give him a snack','feed'],['Please play fetch','fetch'],['Repeat that, please.','repeat'],['be quiet','quiet'],['stop talking','stopSpeech'],['pause focus','pauseFocus'],['resume focus','resumeFocus'],['end the focus session','endFocus']])assert.deepEqual(parseVoiceCommand(text),{action});
  assert.deepEqual(parseVoiceCommand('Hey Wonks, take a nap.','Wonks'),{action:'sleep'});
  assert.deepEqual(parseVoiceCommand('Hey W[onks], have a snack','W[onks]'),{action:'feed'});
});
test('focus accepts spoken or numeric minutes and rejects invalid durations explicitly',()=>{
  for(const [text,minutes] of [['start a 25-minute focus session',25],['start a twenty five minute focus session',25],['start a one hundred and eighty minute focus session',180],['start an eight minute focus',8],['start a 1 minute focus session',1],['start focus',null]])assert.deepEqual(parseVoiceCommand(text),{action:'startFocus',minutes});
  for(const value of ['0','181','-5','1.5','minus ten','a few','twenty twenty','9999999999999999'])assert.deepEqual(parseVoiceCommand(`start a ${value} minute focus session`),{action:'invalidFocus'});
});
test('mentions, quotes, explanations, negations and chained actions remain conversation',()=>{
  for(const text of ['I want to take a nap','Should I take a nap?','Why do you say be quiet?','Can you explain how to start focus?','Do not take a nap','“take a nap”','"be quiet"','take a nap and feed him','repeat that code','be quiet about my game','Tell me to wake up','start a 25 minute focus session then open a file','open my browser','run a shell command',''])assert.equal(parseVoiceCommand(text,'Wonks'),null,text);
});
test('voice poses prioritize capture and thinking, expire confirmations, and clear on idle',()=>{
  assert.equal(voicePose('listening',2000,1000),'listening');assert.equal(voicePose('transcribing',2000,1000),'thinking');assert.equal(voicePose('thinking',0,1000),'thinking');assert.equal(voicePose('ready',2000,1000),'confirmed');assert.equal(voicePose('ready',2000,2000),'none');assert.equal(voicePose('error',0,3000),'none');
});
