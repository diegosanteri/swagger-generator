const fs = require('fs');
const  YAML = require('yaml-js');
const jsonResolver = require('json-refs').resolveRefs;
const appRootDir = require('app-root-dir').get();
const exec = require('child_process').exec;

const generateOAS = `yamlinc/bin/ ${appRootDir}/swagger/swagger-doc.inc.yaml`;

const executeCommand = (command) => {
    return new Promise((resolve, reject) => {
            exec(command, (error) => {
                if(error !== null){
                    console.log(error)
                    return reject(error);
                }

                return resolve(null);
            });
        });
    
}

const readSpec = (specName) => {
    return new Promise((resolve) => {
        const options = {
            filter        : ['relative', 'remote'],
            loaderOptions : {
            processContent : function (res, callback) {
                callback(null, YAML.load(res.text));
            }
            }
        };
        const root = YAML.load(fs.readFileSync(specName).toString());

        jsonResolver(root, options).then(function (results) {
            const parsedJson = results.resolved;
            projectName = parsedJson.info.title;
            version = parsedJson.info.version;
            return resolve();
        });
    });
}

let projectName = '';
let version = '';

module.exports = executeCommand(generateOAS)
                    .then(() => readSpec('swagger-doc.inc.yaml'))
                    .then(() => executeCommand(`rm -rf ${projectName}-server && rm -rf ${projectName}-client`))
                    .then(() => executeCommand(`java -jar ${appRootDir}/openapi-generator-cli.jar generate \
                        -i swagger-doc.inc.yaml \
                        -g spring \
                        --library spring-boot \
                        -t  ./server-template/ \
                        --model-package 'com.company.model' \
                        --api-package 'com.company.api' \
                        -DinterfaceOnly=true \
                        --group-id 'com.company' \
                        --artifact-id ${projectName}-server \
                        --artifact-version ${version} \
                        --additional-properties java8=true \
                        -o ${projectName}-server`)
                                    .then(() => executeCommand(`mvn clean install -f ${projectName}-server/pom.xml`)))
                    .then(() => executeCommand(`java -jar ${appRootDir}/openapi-generator-cli.jar generate \
                        -i swagger-doc.inc.yaml \
                        --model-package 'com.company.model' \
                        --api-package 'com.company.dao' \
                        --invoker-package 'com.company.invoker' \
                        --group-id 'com.company' \
                        --artifact-id ${projectName}-client \
                        --artifact-version ${version} \
                        -g java \
                        --library resttemplate \
                        -o  ${projectName}-client`)
                                    .then(() => executeCommand(`mvn clean install -f ${projectName}-client/pom.xml`)));