const core = require('@actions/core')
const github = require('@actions/github');


// Initialize Octokit
const octokit = github.getOctokit(process.env.GITHUB_TOKEN)
const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/")

// Initialize Modules
const {readWorkflowsAndFilterByName,checkWorkflowDeps} = require('./workflows')(octokit, owner, repo)

const { calcPreReleaseBranch, createBranch } = require('./branches')(octokit, owner, repo)
const { calcPrereleaseTag, getLastPreReleaseTag, getLastReleaseTag, createTag } = require('./tags')(octokit, owner, repo)


// Input variables
const dryRun =  core.getInput('dry-run') == "true" ? true : false
const mode = core.getInput('mode')
const currentMajor = parseInt(core.getInput('current-major'))
const prefix = core.getInput('prefix')
const preRelease = core.getInput('pre-release')
const defaultBranch = core.getInput('default-branch')


main()

async function main() {
  try {
    const workflow = readWorkflowsAndFilterByName(github.context.workflow)
    // TODO: Clean this code
    if (workflow.on && workflow.on.workflow_run && workflow.on.workflow_run.workflows) {
      const success = await checkWorkflowDeps(workflow.on.workflow_run.workflows, github.context.sha)
      if(!success) return console.log("Action skipped because another workflows for the same commit are in progress")
    }

    switch(mode){
      case 'pre-release':
        if(checkPrereleaseRequirements(core, preRelease)) runPreRelease()
        break
      case 'release':
        runRelease(prefix,defaultBranch)
        break
      case 'fix':
        runFix()
        break
    }

  } catch (err) {
    console.log(err)
  }
}

async function runFix() {
  try {
    const tag = await getLastReleaseTag()
    if(!tag) return core.setFailed('There are any release yet')
    
    const regex = new RegExp(`^v(\\d+).(\\d+).(\\d+)$`, 'g')
    const matches = regex.exec(tag)
    const major = parseInt(matches[1]);
    const minor = parseInt(matches[2]);
    const patch = parseInt(matches[3]);

    const releaseBranch = `${prefix}${major}.${minor}`
    const fixTag = `v${major}.${minor}.${patch+1}`
    if (!dryRun) await createTag(fixTag, releaseBranch)

    core.setOutput("release-version", fixTag)
    console.log(`🚀 New fix '${fixTag}' created`)
  
  } catch (err) {
    throw err
  }
}

async function runRelease(prefix, defaultBranch) {
  try {

    const tag = await getLastPreReleaseTag()
    if(!tag) return core.setFailed('There are any pre-release yet')
    
    const regex = new RegExp(`^v(\\d+).(\\d+)`, 'g')
    const matches = regex.exec(tag)
    const major = parseInt(matches[1]);
    const minor = parseInt(matches[2]);

    const release = `${prefix}${major}.${minor}`
    const releaseTag = `v${major}.${minor}.0`
    if (!dryRun) {
      const created = await createBranch(release, github.context.sha)

      if(!created) return core.setFailed(`The release branch '${release}' already exist`)
      
      await createTag(releaseTag, defaultBranch)
    }

    console.log(`🚀 New release '${release}' created`)    
    console.log(`🚀 New release tag '${releaseTag}' created`)

    core.setOutput("release-version", releaseTag)

  } catch (err) {
    throw err
  }
}

function checkPrereleaseRequirements (core,preRelease) {
  if(preRelease === "") {
    core.setFailed('On mode pre-release the param preRelease is mandatory')
    return false
  }
  return true
}

async function runPreRelease() {
  try {    

     // TODO: (to implement) In case of increase a new major version check if the last alpha
    // has a current release.

    // TODO: Change calcPreReleaseBranch to getPreReleaseVersion
    let preReleaseBranch = await calcPreReleaseBranch(currentMajor, prefix)
    console.log("preReleaseBranch", preReleaseBranch)
    if (preRelease) {
      console.log("⚙️ Generating pre-release-tag")
      preReleaseTag = await calcPrereleaseTag(preReleaseBranch, preRelease)
    }
  
    if (!dryRun) createTag(preReleaseTag, defaultBranch)

    console.log(`🚀 New pre-release tag '${preReleaseTag}' created`)
    core.setOutput("release-version", preReleaseTag)

  } catch (error) {
    core.setFailed(error.message);
  }
}
