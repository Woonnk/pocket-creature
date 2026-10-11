import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBond,recordBond,bondFavorite,forgetBond,claimBondMilestone,bondProgress,createBondGesture} from '../renderer/bond.mjs';
import {normalize,finishFocus,startFocus} from '../renderer/core.mjs';
import {encodeBackup,decodeBackup} from '../renderer/backup.mjs';
import {createMomentController} from '../renderer/expressive.mjs';

test('bond migration keeps earned friendship, quietly unlocks tiers, and bounds evidence',()=>{
 const old=normalize({friendship:55,coins:43});assert.equal(old.friendship,55);assert.equal(old.coins,43);assert.equal(old.bond.announced,3);assert.equal(claimBondMilestone(old.bond,55),null);
 const b=normalizeBond({learning:false,snackChoice:'bad',snackPin:'bad',announced:100,snacks:{berries:{count:Infinity,lastAt:-4},honey:{count:1500,lastAt:4e20},injected:{count:3}},interactionPin:'paw'});
 assert.equal(b.learning,false);assert.equal(b.snackChoice,'berries');assert.equal(b.snackPin,'auto');assert.equal(b.interactionPin,'paw');assert.equal(b.announced,4);assert.equal(b.snacks.berries.count,0);assert.equal(b.snacks.honey.count,999);assert.equal(b.snacks.honey.lastAt,9000000000000000);assert.equal(b.snacks.injected,undefined);
});
test('favorites require three separate visits and cooldowns survive reload and clock rollback',()=>{
 let b=normalizeBond();assert.equal(recordBond(b,'snacks','honey',1000),true);assert.equal(recordBond(b,'snacks','honey',2000),false);assert.equal(bondFavorite(b,'snacks'),null);
 b=normalizeBond(JSON.parse(JSON.stringify(b)));assert.equal(recordBond(b,'snacks','honey',100),false);assert.equal(recordBond(b,'snacks','honey',61000),true);assert.equal(bondFavorite(b,'snacks'),null);
 assert.equal(recordBond(b,'snacks','honey',121000),true);assert.equal(bondFavorite(b,'snacks').id,'honey');assert.equal(bondFavorite(b,'snacks').count,3);
 assert.equal(recordBond(b,'games','invented',180000),false);assert.equal(recordBond(b,'snacks','invalid',180000),false);assert.equal(recordBond(b,'snacks','honey',NaN),false);
});
test('pinned favorites resist learning; forgetting pauses evidence collection without removing milestones',()=>{
 const b=normalizeBond({announced:3,snackPin:'cookies'});for(let i=0;i<5;i++)recordBond(b,'snacks','honey',1000+i*60000);
 assert.equal(bondFavorite(b,'snacks').id,'cookies');assert.equal(bondFavorite(b,'snacks').source,'Chosen by you');b.snackPin='none';assert.equal(bondFavorite(b,'snacks'),null);
 forgetBond(b);assert.equal(b.announced,3);assert.equal(b.learning,false);assert.equal(bondFavorite(b,'snacks'),null);assert.equal(recordBond(b,'snacks','honey',500000),false);b.learning=true;assert.equal(recordBond(b,'snacks','honey',500000),true);assert.equal(bondFavorite(b,'snacks'),null);
});
test('milestone crossing claims only the highest new tier once and adds no rewards',()=>{
 const s=normalize({friendship:9,coins:20});s.friendship++;assert.equal(claimBondMilestone(s.bond,s.friendship).gesture,'nuzzle');assert.equal(claimBondMilestone(s.bond,s.friendship),null);assert.equal(s.coins,20);
 s.friendship=99;assert.equal(claimBondMilestone(s.bond,99).gesture,'hug');startFocus(s,1,0);assert.equal(finishFocus(s,60000),true);assert.equal(claimBondMilestone(s.bond,s.friendship).gesture,'flourish');assert.equal(s.coins,35);assert.equal(finishFocus(s,61000),false);assert.equal(claimBondMilestone(s.bond,s.friendship),null);
 assert.equal(bondProgress(0).next.points,10);assert.equal(bondProgress(25).progress,0);assert.equal(bondProgress(100).next,undefined);
});
test('milestone gestures gate earned levels, end once, and yield to every busy state',()=>{
 const controller=createBondGesture();assert.equal(controller.start('hug',49,{},0),false);assert.equal(controller.start('invalid',200,{},0),false);
 for(const key of ['gameMode','reducedMotion','hidden','sleeping','dragging','typing','focus','voiceBusy','busy','moving','airborne']){
  assert.equal(controller.start('hug',50,{[key]:true},0),false);assert.equal(controller.start('hug',50,{},0),true);assert.equal(controller.update({[key]:true},1),'none');assert.equal(controller.active,false);
 }
 assert.equal(controller.start('nuzzle',10,{},0),true);assert.equal(controller.start('promise',30,{},1),false);assert.equal(controller.update({},3199),'nuzzle');assert.equal(controller.update({},3200),'none');controller.clear();
});
test('bond backups preserve pinned and learned favorites, games, pauses, and claimed tiers',()=>{
 const s=normalize({friendship:25,personalMemory:{favoriteGames:'Stardew Valley'},bond:{learning:false,announced:2,snackPin:'cookies',interactions:{paw:{count:3,lastAt:180000}}}});
 const restored=decodeBackup(encodeBackup(s),normalize());assert.deepEqual(restored.bond,s.bond);assert.equal(restored.personalMemory.favoriteGames,'Stardew Valley');assert.equal(claimBondMilestone(restored.bond,25),null);
});
test('quiet moments favor a learned preference without learning from autonomous play',()=>{
 const s=normalize({bond:{interactionPin:'paw'}}),c={};const g={pet:{x:200,y:500},bounds:{left:120,right:700,top:210,floor:500}};
 const controller=createMomentController({random:()=>.8});controller.update(s,c,g,0);assert.equal(controller.update(s,c,g,102001).kind,'paw');assert.equal(controller.update(s,c,g,107001).completed,'paw');assert.equal(s.bond.interactions.paw.count,0);
});
