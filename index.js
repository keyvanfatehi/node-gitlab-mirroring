var Promise = require('bluebird');
var _ = require('lodash');
var sh = require('shelljs');

module.exports = function(gitlabConf) {

  var gitlab = require('gitlab')(gitlabConf);

  var findOrCreateGroup = function(name) {
    return new Promise(function(resolve, reject) {
      gitlab.get('/namespaces', function(namespaces) {
        var namespace = _.findWhere(namespaces, { path: name });
        if (namespace) {
          return resolve(namespace);
        } else {
          gitlab.post('/groups', { name: name, path: name }, function(err, namespace) {
            if (err) return reject(err);
            return resolve(namespace);
          })
        }
      })
    });
  }

  var findOrCreateProject = function(payload) {
    return new Promise(function(resolve, reject) {
      gitlab.projects.all(function(projects) {
        projects = _.filter(projects, { namespace: { id: payload.namespace_id } });
        var project = _.findWhere(projects, { name: payload.name });
        if (project) {
          return resolve(project);
        } else {
          gitlab.projects.create(payload, function(project) {
            return resolve(project);
          })
        }
      });
    });
  }

  return {
    mirror: function(sources) {
      var tmp = '/tmp/mirroring-'+Math.random().toString(16).substring(2);
      sh.exec('rm -rf '+tmp+' ; mkdir '+tmp);
      return findOrCreateGroup(gitlabConf.group).then(function(group) {
        return Promise.map(sources, function(repo) {
          var local = tmp+'/'+repo.name;
          var remote = repo.remote;
          return new Promise(function(resolve, reject) {
            sh.exec('git clone '+remote+' '+local, { async: true }, function(code) {
              if (code !== 0) reject(new Error('Failed to clone '+repo.name));
              return findOrCreateProject({
                name: repo.name, //  (required) - new project name
                namespace_id: group.id, // (optional) - namespace for the new project (defaults to user)
                description: 'Mirror of '+remote,
                public: true // (optional) - if true same as setting visibility_level = 20
              }).then(function(project) {
                resolve({
                  name: repo.name,
                  local: local,
                  remote: project.ssh_url_to_repo
                })
              });
            });
          });
        });
      }).map(function(data) {
        return push(data);
      });
    }
  }
}

var push = function(data) {
  return new Promise(function(resolve, reject) {
    var cmd = 'pushd '+data.local+' && git remote add gitlab '+data.remote+' && git push -fu gitlab master && popd'
    console.log('Force-pushing '+data.local+' to the gitlab mirror');
    sh.exec(cmd, { async: true }, function(code) {
      if (code !== 0) {
        console.log('failed to push '+data.local+'... trying again');
        return push(data).then(function(resp) {
          resolve(resp);
        }).catch(function(err) {
          console.log(err.stack);
          console.log('failed again. '+ data.local);
        });
      } else {
        resolve({
          remote: data.remote,
          name: data.name
        });
      }
    });
  });
}
