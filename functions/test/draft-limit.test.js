const {test}=require("node:test"),assert=require("node:assert/strict");
const {reserveDraft}=require("../lib/draftLimit");
function dbFor(start={}) {
  const docs=new Map(Object.entries(start));
  return {docs,collection:(collection)=>({doc:(id)=>({path:`${collection}/${id}`})}),runTransaction:async(work)=>{let wrote=false;return work({get:async(ref)=>{assert.equal(wrote,false,"all reads precede writes");return {exists:docs.has(ref.path),data:()=>docs.get(ref.path)};},set:(ref,value)=>{wrote=true;docs.set(ref.path,value);}});}};
}
const now=new Date("2026-10-31T12:00:00Z");
test("draft account limit allows 20 and refuses 21 without charging the app",async()=>{
  const db=dbFor({"draftUsage/user-u":{day:"2026-10-31",count:19}});
  assert.equal((await reserveDraft("u",{db,now})).allowed,true);
  assert.deepEqual(await reserveDraft("u",{db,now}),{allowed:false,reason:"account-cap"});
  assert.equal(db.docs.get("draftUsage/app").count,1);
});
test("draft app limit allows 200, refuses 201 and midnight SAST resets both",async()=>{
  const db=dbFor({"draftUsage/app":{day:"2026-10-31",count:199}});
  assert.equal((await reserveDraft("u",{db,now})).allowed,true);
  assert.deepEqual(await reserveDraft("v",{db,now}),{allowed:false,reason:"app-cap"});
  assert.equal(db.docs.has("draftUsage/user-v"),false);
  assert.equal((await reserveDraft("u",{db,now:new Date("2026-10-31T22:00:00Z")})).allowed,true);
  assert.equal(db.docs.get("draftUsage/app").count,1);
  assert.equal(db.docs.get("draftUsage/user-u").count,1);
});
