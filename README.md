# Product Version Tags Github Action

This Github Action helps to manage the life cycle of versioning in a monorepo approach. The idea is 
to keep three stages: `pre-release`, `release` and `fixes`, and keep the same version for all the monorepo 
components.

## Pre Release

This stage hold all the new features that will be into the next release. These features are merged to `main` or `master` branch, and each Pull Request to this branch will increase the version. 

The version in this stage is compound as follow:

`v<next-release-major>.<next-release-minor>-<pre-release-prefix>.<pre-release-patch>`

e.g.: `v0.3-alpha.4`


### Example usage

In the following example we are working in a monorepo with two components: `Back` and `Front`. These components have their respective tests Workflows, that are required before create a new pre-release tag version.

```yaml
name: PreRelease

on:
  workflow_run:
    workflows: ["Back/Tests", "Front/Tests"]
    branches: [main]
    types: 
      - completed

jobs:
  generate-prerelease:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Generate a pre-release
        uses: intelygenz/action-product-version-tags@v0.1.1
        with:
          current-major: 0
          prefix: "release-"
          mode: 'pre-release'
          pre-release: 'alpha'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
  
## Release

Once all the required features are merged to `main` branch, a manual step allow to generate the first version of the new release. This Workflow mode will create a new branch based on `main` with the `prefix` and using the `major` and `minor` version of the `pre-release` tag. Also a new tag will created adding `0` as patch.

Based on the following scenario

* Current Release Branch: `release-0.2`
* Current Release: `v0.2.8`
* Current PreRelease: `v0.3-alpha.4`

After manual Workflow run will be generated the followings:

* Branch: `release-0.3`
* Tag: `v0.3.0`

### Example usage

```yaml
name: Release

on:
  workflow_dispatch:

jobs:
  create-release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Generate a release
        uses: intelygenz/action-product-version-tags@v0.1.1
        with:
          prefix: "release-"
          mode: 'release'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Fix

When a released version needs a hotfix, or any feature improvement, is required to create a new patch version. With this mode a new tag in the `release` branch is created with the increased patch version.

e.g.: `v0.3.0` --> `v0.3.1` in branch `release-0.3` 

### Example usage

```yaml
name: Fix

on:
  workflow_run:
    workflows: ["Back/Tests", "Front/Tests"]
    branches: ["release-*"]
    types: 
      - completed

jobs:
  create-fix:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2
        with:
          fetch-depth: 0
      - name: Generate a fix
        uses: intelygenz/action-product-version-tags@v0.1.1
        with:
          prefix: "release-"
          mode: 'fix'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
