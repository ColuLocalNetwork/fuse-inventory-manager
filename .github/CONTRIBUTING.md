# Contributing Guide

Contributing to `inventory-manager` is fairly easy.

Check out the [README](https://github.com/colucom/inventory-manager/blob/master/README.md) on how to get the project, run all provided tests and generate a production-ready build.

## Contributing/Submitting changes

- Check out a new branch based on <code>master</code> and name it to what you intend to do:
  - Example:
    ````
    $ git checkout -b BRANCH_NAME origin/master
    ````

    If you get an error, you may need to fetch master first by using
    ````
    $ git remote update && git fetch
    ````

  - Use one branch per fix/feature

- Make your changes
  - Make sure to provide a spec for unit tests.
  - In order to verify everything will work please run `npm test`.
  - When all tests pass, everything's fine.
- Commit your changes
  - Please provide a git message that explains what you've done.
  - Commit to the forked repository.
- Make a pull request
  - Make sure you use the [PR template](https://github.com/colucom/inventory-manager/blob/master/.github/PULL_REQUEST_TEMPLATE.md)
  - Make sure you send the PR to the <code>master</code> branch.

If you follow these instructions, your PR will land pretty safely in the main repo!