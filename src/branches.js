module.exports = function (octokit, owner, repo) {
    async function searchBranchNames() {
        let branchNames = []
        let data_length = 0
        let page = 0;
        try {
          do {
            const { data } = await octokit.repos.listBranches({
              owner,
              repo,
              per_page: 100,
              page
            });
            const branchNamesPerPage = data.map(branch => branch.name)
            data_length = branchNamesPerPage.length
            branchNames.push(...branchNamesPerPage)
            page++
          } while (data_length == 100)
        } catch (err) {
            throw err
        }

        return branchNames.reverse()
    }

    async function calcPreReleaseBranch(currentMajor, prefix) {
        try {
            const branchNames = await searchBranchNames(octokit, owner, repo)
            let major = currentMajor
            let minor = 0
    
            const regex = new RegExp(`^${prefix}(\\d+).(\\d+)$`, 'g')
            
            const greaterReleaseBranches = branchNames.filter(branchName => {
                if(branchName.match(`^${prefix}${major+1}.[0-9]+$`)) return true
                return false
            })
    
            if(greaterReleaseBranches.length > 0) throw new Error('Branch with greater major version already exist')
    
            const branchesWithPrefix = branchNames.filter(branchName => {
            if(branchName.match(`^${prefix}${major}.[0-9]+$`)) return true
                return false
            })
    
            if(branchesWithPrefix.length === 0) {
                return `v${major}.${minor}`
            }
    
            const releaseBranch = branchesWithPrefix[0]
            const matches = regex.exec(releaseBranch)
            major = parseInt(matches[1]);
            minor = parseInt(matches[2]);
    
            return `v${major}.${minor+1}`
    
        } catch (err) {
            throw err
        }
        
    }

    async function createBranch(branchName, sha) {
        console.log("branchName", branchName)

        // TODO: Review return on error
        try {
            await octokit.git.createRef({
                owner,
                repo,
                ref: `refs/heads/${branchName}`,
                sha,
            }); 
            return true
        } catch (err) {
            return false
        }

    }
    return {calcPreReleaseBranch, createBranch} 
}
