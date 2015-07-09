# plugin-mirroring

Script for mirroring cordova plugins onto your own gitlab.

## Usage Example

You have a json file listing out your upstream repositories:

```json
[
  {
    "remote": "git@github.com:apache/cordova-plugin-device",
    "name": "cordova-plugin-device"
  },
  {
    "remote": "git@github.com:apache/cordova-plugin-console",
    "name": "cordova-plugin-console"
  }
]
```

You have a gulp task as such:

```javascript
gulp.task('plugins:mirror', function(done) {
  var plugins = require('./sources');
  require('plugin-mirroring')({
    url:   'https://gitlab.your-org.com',
    token: 'yourapitoken123456',
    group: 'cordova'
  }).mirror(plugins).then(function(mirrors) {
    console.log('Finished mirroring.');
    console.log(JSON.stringify(mirrors, null, 2));
  }).then(done).catch(done);
});
```


The script will then proceed to
  * find or create a group named `cordova`
  * clone the sources down into a temp folder
  * find or create a public project in gitlab in the group `cordova`
  * force push the code to the gitlab mirror

The final return value is an array exactly like the input, except with remotes rewritten to the gitlab remotes.
