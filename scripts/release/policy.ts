import { execFileSync } from 'node:child_process'

// Deliberately opt-in: required checks must exist on main before enabling them.
// Existing independent rulesets/protections are never replaced or deleted.
export function releaseRules() {
  return {
    name: 'Release integrity',
    target: 'branch',
    enforcement: 'active',
    bypass_actors: [],
    conditions: { ref_name: { include: ['refs/heads/main'], exclude: [] } },
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      { type: 'required_linear_history' },
      {
        type: 'pull_request',
        parameters: {
          required_approving_review_count: 0,
          dismiss_stale_reviews_on_push: false,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_review_thread_resolution: true,
          allowed_merge_methods: ['squash'],
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          strict_required_status_checks_policy: true,
          do_not_enforce_on_create: false,
          required_status_checks: [{ context: 'Release metadata' }, { context: 'Checks' }],
        },
      },
      {
        type: 'commit_message_pattern',
        parameters: {
          name: 'Release trailers',
          negate: false,
          operator: 'regex',
          pattern: '(?m)^Release-Type: (patch|minor|major)\\r?\\nNative-Change: (yes|no)\\r?$',
        },
      },
    ],
  }
}

if (import.meta.main) {
  const repository =
    process.env.GITHUB_REPOSITORY ||
    execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], {
      encoding: 'utf8',
    }).trim()
  const rules = releaseRules()
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify(rules, null, 2))
    console.log(
      'Preview only. After these workflows land and both checks have run on main, use --apply.'
    )
  } else {
    const existing = JSON.parse(
      execFileSync('gh', ['api', `repos/${repository}/rulesets`], { encoding: 'utf8' })
    )
    if (existing.some((rule: any) => rule.name === rules.name))
      throw new Error(
        'Release integrity ruleset already exists; review changes manually rather than overwrite it'
      )
    const head = execFileSync('gh', ['api', `repos/${repository}/commits/main`, '--jq', '.sha'], {
      encoding: 'utf8',
    }).trim()
    const statuses = JSON.parse(
      execFileSync('gh', ['api', `repos/${repository}/commits/${head}/status`], {
        encoding: 'utf8',
      })
    )
    const checks = JSON.parse(
      execFileSync('gh', ['api', `repos/${repository}/commits/${head}/check-runs`], {
        encoding: 'utf8',
      })
    )
    const passed = new Set([
      ...statuses.statuses.filter((s: any) => s.state === 'success').map((s: any) => s.context),
      ...checks.check_runs.filter((c: any) => c.conclusion === 'success').map((c: any) => c.name),
    ])
    if (!passed.has('Checks') || !passed.has('Release metadata'))
      throw new Error('Both required checks must pass on main before activating protections')
    execFileSync(
      'gh',
      ['api', '--method', 'POST', `repos/${repository}/rulesets`, '--input', '-'],
      { input: JSON.stringify(rules), stdio: ['pipe', 'inherit', 'inherit'] }
    )
    execFileSync('gh', ['api', '--method', 'PATCH', `repos/${repository}`, '--input', '-'], {
      input: JSON.stringify({
        allow_squash_merge: true,
        allow_merge_commit: false,
        allow_rebase_merge: false,
        squash_merge_commit_title: 'PR_TITLE',
        squash_merge_commit_message: 'PR_BODY',
      }),
      stdio: ['pipe', 'inherit', 'inherit'],
    })
  }
}
