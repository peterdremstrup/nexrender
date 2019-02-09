'use strict';

const path      = require('path');
const fs        = require('fs-extra');
const async     = require('async');
const ae        = require('photoshop/aftereffects');

function runScript(state, project, callback) {
    let projectName     = path.join( project.workpath, project.template );
    let replaceToPath   = path.join( process.cwd(), project.workpath, path.sep );
    let scriptName      = path.join( project.workpath, state.name );

    let scriptRun       = fs.readFileSync(path.join(process.cwd(), scriptName)).toString('utf-8');
    scriptRun = scriptRun.replace('*projectName*', '\'' + project.template + '\'').replace('*projectPath*', '\'' + path.join(process.cwd(), project.workpath) + '/\'').replace('*duration*', project.duration);
    if (project.assets) {
      project.assets.forEach(function(asset) {
        if (asset.type == 'script' && asset.name == 'data.js') {
          var dataPath = path.join( process.cwd(), project.workpath, 'data.js' );
          var data = require(dataPath);
          scriptRun = scriptRun.replace('*sections*', JSON.stringify(data.quotes));
        }
      });
    }

    if (state) {
        let aeBin = ae.createStream((stream, script) => {
          eval(script);
          stream.write('done');
        }, [scriptRun]);
        aeBin.on('data', (data) => {
          if (data == 'done') callback();
        });
    }
    else {
      callback('missing processing script');
    }
};

module.exports = function(state, project) {
    return new Promise((resolve, reject) => {
        console.info(`[${project.uid}] ` + state + `-processing project with ExtendScripts...`);
        if (project.preprocess && state == 'pre') {
            return runScript(project.preprocess, project, (err) => {
                return (err) ? reject(err) : resolve(project);
            });
        }
        if (project.postprocess && state == 'post') {
            return runScript(project.postprocess, project, (err) => {
                return (err) ? reject(err) : resolve(project);
            });
        }

        resolve(project);
    });
};
