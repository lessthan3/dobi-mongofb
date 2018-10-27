gotta clone the document data to make sure all the document child refs
pass the isEqual. testing code below
```
run = async () => {
  site = await app.sites.findOne();
  type = site.get('type')
  site.on('update', (val) => {
    console.log('site was updated', val);
    site.off('update')
  })
  console.log(site.events)
  type.on('update', (val) => {
    console.log('type was updated', val);
    type.off('update')
  });
  console.log(type.events)
  await type.set(new Date().toUTCString());
}
run()
```
