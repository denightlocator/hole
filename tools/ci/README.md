# Optional GitHub Actions build

`orbit-workflow.yml` is a ready-to-install workflow for the combined Orbit client. It runs the
self-tests, builds with Java 21 and the Gradle wrapper, and uploads the remapped jar if successful.
It is a template: GitHub Actions **does not run workflows from this directory**.

To enable it, a repository maintainer whose GitHub credentials have permission to modify workflows
can copy it to `.github/workflows/orbit.yml`, commit that file and push it. For example:

```bash
mkdir -p .github/workflows
cp tools/ci/orbit-workflow.yml .github/workflows/orbit.yml
git add .github/workflows/orbit.yml
git commit -m "Enable Orbit build workflow"
# Push your current branch with workflow-capable credentials.
```

Once enabled, find the run under the repository's **Actions** tab. A successful run has an
`orbit-client` artifact; a failed run does not establish that an installable jar exists. Compilation
and the stubbed tests do not replace testing mixins, controls and rendering in Minecraft.
