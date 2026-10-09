// Navigate the redesigned UI through its visible controls before checking a setting.
async function openSettingsSection(page,section,{advanced=false}={}){
 if(!await page.locator('#panel').isVisible())await page.locator('#launcher').click();
 await page.locator('[data-tab="settings"]').click();
 await page.locator('[data-settings-tab="'+section+'"]').click();
 if(advanced)await page.locator('#voice-advanced').evaluate(e=>e.open=true);
}
module.exports={openSettingsSection};
async function openCreatureDetails(page,section){
 if(!await page.locator('#panel').isVisible())await page.locator('#launcher').click();
 await page.locator('[data-tab="pet"]').click();
 const details=page.locator('#creature-'+section);
 if(!await details.evaluate(e=>e.open))await details.locator('summary').click();
}
module.exports.openCreatureDetails=openCreatureDetails;
